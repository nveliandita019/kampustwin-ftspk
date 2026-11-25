/**
 * Halaman depan KampusTwin FTSPK.
 *
 * Isinya: pita atas yang menempel saat digulir, garis laju di tepi atas,
 * geser paralaks pada foto, sorot yang mengikuti kursor di kartu
 * departemen, penyingkapan isi saat masuk layar, angka yang dihitung naik
 * sekali, dan dua model 3D — logo ITS di hero, massa rektorat di bagian
 * tampilan.
 *
 * Soal prefers-reduced-motion: gerakannya sengaja tidak dimatikan dari
 * sini. Windows mengirim sinyal itu begitu "Show animations" dipadamkan,
 * dan halaman ini tetap harus hidup di laptop tersebut. Yang dikurangi
 * hanya jarak dan lamanya, dan itu diurus css/beranda.css. Satu-satunya
 * yang tetap diperiksa di sini adalah lebar layar, supaya ponsel tidak
 * menyalakan dua konteks WebGL sekaligus.
 */

import { buatLogo } from './logo3d.js';
import { buatAdegan } from './hero3d.js';

/* ------------------------------------------------- satu penanganan gulir -- */

/*
 * Pita lekat, garis laju di tepi atas, dan geser paralaks sama-sama
 * bergantung pada posisi gulir, jadi ketiganya dihitung sekali per bingkai
 * dari satu pendengar saja. Dua pendengar scroll yang masing-masing
 * membaca tata letak akan memaksa peramban menghitung ulang dua kali.
 */

const pita = document.querySelector('#pita');
const laju = document.querySelector('#laju');

/* Paralaks terikat gulir, jadi tidak punya "versi pendek" seperti transisi
   lain di halaman ini: kalau sistem minta gerak dikurangi, ini dimatikan. */
const hematGerak = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const berparalaks = hematGerak
  ? []
  : [...document.querySelectorAll('[data-parallax]')];

let menunggu = false;

function perbarui() {
  menunggu = false;
  const y = window.scrollY;
  const tinggiLayar = window.innerHeight;

  pita.classList.toggle('is-lekat', y > 24);

  if (laju) {
    const habis = document.documentElement.scrollHeight - tinggiLayar;
    laju.style.setProperty('--laju', habis > 0 ? String(Math.min(1, y / habis)) : '0');
  }

  for (const el of berparalaks) {
    const kotak = el.getBoundingClientRect();
    if (kotak.bottom < -120 || kotak.top > tinggiLayar + 120) continue;
    /* -0,5 waktu elemen di bawah layar, +0,5 waktu sudah di atasnya. */
    const bagian = (kotak.top + kotak.height / 2 - tinggiLayar / 2) / tinggiLayar;
    const jauh = Number(el.dataset.parallax) || 10;
    el.style.setProperty('--geser', `${(-bagian * jauh).toFixed(1)}px`);
  }
}

function mintaPerbarui() {
  if (menunggu) return;
  menunggu = true;
  requestAnimationFrame(perbarui);
}

perbarui();
window.addEventListener('scroll', mintaPerbarui, { passive: true });
window.addEventListener('resize', mintaPerbarui, { passive: true });

/* ----------------------------------------------- sorot mengikuti kursor -- */

/*
 * Kartu departemen menyala di tempat kursornya berada. Yang dikirim ke CSS
 * cuma dua angka; gradasinya sendiri ditulis di css/beranda.css, jadi
 * warnanya tetap satu pintu.
 */
for (const kartu of document.querySelectorAll('[data-sorot]')) {
  kartu.addEventListener('pointermove', (e) => {
    const kotak = kartu.getBoundingClientRect();
    kartu.style.setProperty('--mx', `${e.clientX - kotak.left}px`);
    kartu.style.setProperty('--my', `${e.clientY - kotak.top}px`);
  }, { passive: true });
}

/* --------------------------------------------------------- penyingkapan -- */

/* Blok yang bersebelahan disingkap bertahap, bukan serempak. */
const pengamatMuncul = new IntersectionObserver((entri) => {
  for (const e of entri) {
    if (!e.isIntersecting) continue;
    const el = e.target;
    const urut = [...el.parentElement.children].indexOf(el);
    el.style.setProperty('--tunda', `${Math.min(urut, 5) * 80}ms`);
    el.classList.add('is-muncul');
    pengamatMuncul.unobserve(el);
  }
}, { rootMargin: '0px 0px -10% 0px', threshold: 0.12 });

for (const el of document.querySelectorAll('[data-muncul]')) {
  pengamatMuncul.observe(el);
}

/* ------------------------------------------------------- angka dihitung -- */

const format = new Intl.NumberFormat('id-ID');

function hitungNaik(el, akhir) {
  const lama = 1400;
  const awal = performance.now();

  function langkah(t) {
    const p = Math.min(1, (t - awal) / lama);
    const halus = 1 - Math.pow(1 - p, 4);
    el.textContent = format.format(Math.round(akhir * halus));
    if (p < 1) requestAnimationFrame(langkah);
  }
  requestAnimationFrame(langkah);
}

const pengamatAngka = new IntersectionObserver((entri) => {
  for (const e of entri) {
    if (!e.isIntersecting) continue;
    hitungNaik(e.target, Number(e.target.dataset.hitung));
    pengamatAngka.unobserve(e.target);
  }
}, { threshold: 0.6 });

for (const el of document.querySelectorAll('[data-hitung]')) {
  pengamatAngka.observe(el);
}

/* ------------------------------------------------------- penanda bagian -- */

const tautanNav = [...document.querySelectorAll('.pita__nav a')];
const bagian = tautanNav
  .map((a) => document.querySelector(a.getAttribute('href')))
  .filter(Boolean);

if (bagian.length) {
  const pengamatBagian = new IntersectionObserver((entri) => {
    for (const e of entri) {
      if (!e.isIntersecting) continue;
      for (const a of tautanNav) {
        a.classList.toggle('is-kini', a.getAttribute('href') === `#${e.target.id}`);
      }
    }
  }, { rootMargin: '-45% 0px -50% 0px' });

  for (const s of bagian) pengamatBagian.observe(s);
}

/* ------------------------------------------------------------- model 3D -- */

/**
 * Hentikan gelung gambar begitu kanvasnya keluar layar. Dua konteks WebGL
 * di satu halaman tidak perlu sama-sama menggambar terus-menerus.
 */
function jedaSaatLuarLayar(kanvas, adegan) {
  if (!adegan?.jeda) return;
  const pengamat = new IntersectionObserver((entri) => {
    for (const e of entri) {
      if (e.isIntersecting) adegan.lanjut();
      else adegan.jeda();
    }
  }, { rootMargin: '140px' });
  pengamat.observe(kanvas);
}

/** Pasang keterangan pengganti kalau WebGL tidak bisa dipakai. */
function tandaiGagal(kanvas, gagal, tombol = []) {
  if (kanvas) kanvas.hidden = true;
  if (gagal) gagal.hidden = false;
  for (const b of tombol) b.disabled = true;
}

/* -- logo ITS di hero --------------------------------------------------- */

const kanvasLogo = document.querySelector('#logo-3d');
const logo = kanvasLogo ? buatLogo(kanvasLogo) : null;

if (kanvasLogo && !logo) {
  tandaiGagal(kanvasLogo, document.querySelector('#logo-gagal'));
} else {
  jedaSaatLuarLayar(kanvasLogo, logo);
}

/* -- massa rektorat di bagian tampilan ---------------------------------- */

const kanvasMassa = document.querySelector('#hero-3d');
const tombolRagam = [...document.querySelectorAll('.ragam button')];

/*
 * Di layar sempit cukup satu model 3D. Yang kedua diganti keterangan,
 * supaya ponsel tidak menyalakan dua konteks WebGL sekaligus.
 */
const layarSempit = window.matchMedia('(max-width: 700px)').matches;

let massa = null;
if (kanvasMassa && !layarSempit) {
  /* Baru dinyalakan ketika hampir masuk layar. */
  const pemicu = new IntersectionObserver((entri) => {
    for (const e of entri) {
      if (!e.isIntersecting) continue;
      pemicu.disconnect();

      massa = buatAdegan(kanvasMassa);
      if (!massa) {
        tandaiGagal(kanvasMassa, document.querySelector('#panggung-gagal'), tombolRagam);
        return;
      }

      jedaSaatLuarLayar(kanvasMassa, massa);

      for (const b of tombolRagam) {
        b.addEventListener('click', () => {
          for (const lain of tombolRagam) {
            lain.setAttribute('aria-pressed', String(lain === b));
          }
          massa.setRagam(b.dataset.ragam);
        });
      }
    }
  }, { rootMargin: '300px' });

  pemicu.observe(kanvasMassa);
} else if (kanvasMassa) {
  /* Bukan kegagalan, jadi jangan pasang keterangan WebGL mati: cukup
     lepas panggungnya, teks bagiannya sudah berdiri sendiri. */
  document.querySelector('.panggung')?.setAttribute('hidden', '');
}
