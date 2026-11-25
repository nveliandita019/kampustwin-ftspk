/**
 * Logo ITS sebagai medali 3D.
 *
 * Semua bagiannya dibangun dari persamaan, bukan dari berkas glTF atau
 * hasil trace gambar: roda gigi delapan gigi, teratai dua lingkar
 * kelopak, dan tugu beralur. Karena bentuknya dihitung, sisinya bisa
 * dibuat semulus apa pun tanpa menambah berat unduhan satu byte pun —
 * tinggal menaikkan jumlah ruas lengkung dan ruas bevel.
 *
 * Teratainya cawan sungguhan, bukan kipas kelopak yang dipipihkan: dua
 * belas kelopak melingkari satu sumbu tegak, dan tugu menembus tepat di
 * tengahnya dari alas bintang di bawah sampai pucuknya di atas bunga.
 * Karena melingkar, bentuknya tetap utuh dari sudut mana pun medali
 * diputar.
 *
 * Tengah cincinnya kosong: cuma gir, teratai, dan tugu yang padat, sisanya
 * tembus pandang ke halaman di belakangnya.
 *
 * Warnanya warna resmi logo: biru #0067AE di separuh kiri, biru muda di
 * separuh kanan, teratai emas. Garis belahnya vertikal, persis seperti
 * pada logo aslinya, karena gigi paling atas dan paling bawah memang
 * jatuh tepat di sumbu itu.
 *
 * three.js dipin di 0.178.0 lewat importmap di index.html.
 */

import * as THREE from 'three';

/* ------------------------------------------------------------------ */
/* Ukuran. Jari-jari ujung gigi = 1, semua ukuran lain relatif ke itu.  */
/* ------------------------------------------------------------------ */

/*
 * Angkanya diukur dari Perlogoan/logo-its-biru-transparan.png, bukan
 * dikira-kira: konturnya ditelusuri per setengah derajat dan jari-jarinya
 * dicatat. Hasilnya delapan gigi berjarak 45°, puncaknya busur rata
 * selebar 27°, sisinya hampir radial, dan dua garis lingkaran di dalam
 * cincin. Semua panjang di berkas ini relatif ke jari-jari ujung gigi.
 */
const GIGI = 8;
const R_UJUNG = 1;        /* puncak gigi                               */
const R_AKAR = 0.881;     /* dasar sela antar gigi                     */
const R_BINGKAI = 0.842;  /* tepi dalam bingkai bergigi                */
const R_CINCIN = 0.723;   /* tepi luar garis lingkaran dalam           */
const R_DALAM = 0.688;    /* lubang medali                             */

const SUDUT_UJUNG = 13.5; /* setengah lebar puncak gigi, derajat       */
const SUDUT_PANGKAL = 15.0;

/* Kanal lebih tipis dari bingkainya, jadi garis logo terbaca sebagai
   alur cekung di kedua muka medali, bukan sebagai gambar yang dicetak. */
const TEBAL_KANAL = 0.13;
const TEBAL_BINGKAI = 0.186;
const Z_GIR = -0.07;      /* pusat tebal gir, di belakang tugu         */

const WARNA = {
  biruTua: 0x0067ae,      /* separuh kiri, warna resmi logo            */
  biruMuda: 0x7cc2e8,     /* separuh kanan                             */
  emas: 0xffe03d,         /* teratai, lingkar luar                     */
  emasTua: 0xf2c21a,      /* lingkar dalam, lebih teduh                */
  putih: 0xfdfefe,
  putihTeduh: 0xe4eef7,
};

const ekstrusi = (ruas = 7) => ({
  curveSegments: 72,
  bevelEnabled: true,
  bevelSegments: ruas,
  bevelThickness: 0.013,
  bevelSize: 0.013,
  bevelOffset: 0,
});

/* ------------------------------------------------------------------ */
/* Roda gigi                                                           */
/* ------------------------------------------------------------------ */

/**
 * Jari-jari tepi luar gir pada sudut tertentu.
 * Di puncak gigi nilainya rata R_UJUNG, di sela rata R_AKAR, dan
 * flank-nya naik lurus di antara keduanya.
 */
function jariLuar(derajat) {
  const langkah = 360 / GIGI;
  /* Gigi pertama berpusat di 90°, jadi geser dulu sebelum dimodulo. */
  let f = (((derajat - 90) % langkah) + langkah * 1.5) % langkah - langkah / 2;
  f = Math.abs(f);
  if (f <= SUDUT_UJUNG) return R_UJUNG;
  if (f >= SUDUT_PANGKAL) return R_AKAR;
  const t = (f - SUDUT_UJUNG) / (SUDUT_PANGKAL - SUDUT_UJUNG);
  return R_UJUNG + (R_AKAR - R_UJUNG) * t;
}

const rad = (d) => (d * Math.PI) / 180;

/**
 * Separuh bingkai bergigi, dari sudut a0 ke a1 (derajat, menaik).
 * Ditulis berlawanan arah jarum jam supaya normalnya menghadap keluar.
 * Langkahnya 0,25° karena sisi giginya cuma selebar 1,5°.
 */
function setengahGir(a0, a1) {
  const titik = [];
  for (let d = a0; d <= a1 + 1e-9; d += 0.25) {
    const r = jariLuar(d);
    titik.push(new THREE.Vector2(r * Math.cos(rad(d)), r * Math.sin(rad(d))));
  }
  for (let d = a1; d >= a0 - 1e-9; d -= 1.5) {
    titik.push(
      new THREE.Vector2(R_BINGKAI * Math.cos(rad(d)), R_BINGKAI * Math.sin(rad(d))),
    );
  }
  return new THREE.Shape(titik);
}

/** Separuh cincin polos, dipakai untuk kanal dan garis lingkaran dalam. */
function setengahCincin(a0, a1, rLuar, rDalam) {
  const titik = [];
  for (let d = a0; d <= a1 + 1e-9; d += 1) {
    titik.push(new THREE.Vector2(rLuar * Math.cos(rad(d)), rLuar * Math.sin(rad(d))));
  }
  for (let d = a1; d >= a0 - 1e-9; d -= 1) {
    titik.push(new THREE.Vector2(rDalam * Math.cos(rad(d)), rDalam * Math.sin(rad(d))));
  }
  return new THREE.Shape(titik);
}

/* ------------------------------------------------------------------ */
/* Teratai                                                             */
/* ------------------------------------------------------------------ */

/**
 * Satu kelopak, dibangun sebagai cangkang melengkung yang memeluk sumbu
 * tegak — bukan lempeng pipih yang dimiringkan. Inilah bedanya dengan
 * teratai pada logo datar: di sini kelopaknya benar-benar melingkar,
 * jadi dari sudut mana pun bunganya tetap berupa cawan.
 *
 * Permukaannya diparameterkan dua arah. t berjalan dari pangkal (0) ke
 * ujung (1); s melintang dari tepi kiri ke tepi kanan. Pada tiap t ada
 * jari-jari, ketinggian, dan setengah-lebar sudutnya sendiri, dan
 * setengah-lebar itu nol di kedua ujung — itu yang membuat kelopaknya
 * runcing di pangkal dan di puncak.
 *
 * Dibuat dua cangkang (luar dan dalam) lalu dua tepi panjangnya dijahit,
 * jadi kelopaknya benda padat yang punya tebal, bukan selembar kertas.
 */
function geometriKelopak({
  y0, y1, rPangkal, rUjung, gembung, sudut, tebal,
  ruasT = 18, ruasS = 14,
}) {
  const posisi = [];
  const indeks = [];
  const lebar = rad(sudut);

  const jari = (t) =>
    rPangkal + (rUjung - rPangkal) * t + gembung * Math.sin(Math.PI * t);
  const tinggi = (t) => y0 + (y1 - y0) * t;
  /*
   * Pangkat 0,62 di dalam menggeser titik terlebarnya ke bawah tengah,
   * seperti kelopak sungguhan. Akar di luarnya menahan lebar itu hampir
   * sampai puncak, lalu menjatuhkannya cepat — tanpa itu kelopaknya
   * meruncing sejak tengah dan bunganya terbaca seperti kobaran api,
   * bukan cawan.
   */
  const setengahLebar = (t) =>
    lebar * Math.pow(Math.sin(Math.PI * Math.pow(t, 0.62)), 0.7);

  const isi = (geser) => {
    for (let i = 0; i <= ruasT; i++) {
      const t = i / ruasT;
      const r = jari(t) + geser;
      const y = tinggi(t);
      const sl = setengahLebar(t);
      for (let j = 0; j <= ruasS; j++) {
        const a = ((j / ruasS) * 2 - 1) * sl;
        posisi.push(r * Math.sin(a), y, r * Math.cos(a));
      }
    }
  };

  isi(0);        /* cangkang luar  */
  isi(-tebal);   /* cangkang dalam */

  const baris = ruasS + 1;
  const dalam = (ruasT + 1) * baris;
  const di = (i, j) => i * baris + j;

  for (let i = 0; i < ruasT; i++) {
    for (let j = 0; j < ruasS; j++) {
      const a = di(i, j);
      const b = di(i, j + 1);
      const c = di(i + 1, j + 1);
      const d = di(i + 1, j);
      indeks.push(a, b, d, b, c, d);
      /* Cangkang dalam dibalik urutannya supaya mukanya menghadap ke
         dalam cawan, bukan keluar. */
      indeks.push(dalam + a, dalam + d, dalam + b, dalam + b, dalam + d, dalam + c);
    }
  }

  /* Jahitan dua tepi panjang. Tepi s kecil menghadap ke arah sudut yang
     mengecil, tepi s besar ke arah sebaliknya, jadi urutannya dibalik. */
  for (let i = 0; i < ruasT; i++) {
    const kiriL = di(i, 0);
    const kiriL2 = di(i + 1, 0);
    indeks.push(kiriL, kiriL2, dalam + kiriL2, kiriL, dalam + kiriL2, dalam + kiriL);

    const kananL = di(i, ruasS);
    const kananL2 = di(i + 1, ruasS);
    indeks.push(kananL, dalam + kananL2, kananL2, kananL, dalam + kananL, dalam + kananL2);
  }

  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(posisi, 3));
  g.setIndex(indeks);
  g.computeVertexNormals();
  return g;
}

/**
 * Alas di bawah bunga: lempeng berdenah bintang, bukan bintang yang
 * meruncing ke bawah.
 *
 * Di gantungan kuncinya alasnya benda tebal berdasar RATA. Dinding
 * sampingnya tegak lurus — itu pita putih yang terlihat jelas di bawah
 * kelopak — dan hanya permukaan atasnya yang berbentuk kerucut bersegi,
 * naik ke satu titik di tengah dengan rusuk memancar ke tiap ujung
 * bintang. Itu yang membuat tiap lengannya punya dua bidang terang dan
 * gelap dengan rusuk tajam di antaranya.
 *
 * Denahnya sama tingginya di seluruh tepi: ujung dan cekungan bintang
 * dua-duanya ada di `yTepi`. Yang naik cuma titik pusatnya.
 *
 * Sudut terjauhnya — ujung bintang pada tepi bawah — harus tetap di
 * dalam lubang medali, 0,688 dari pusat. Itu sudut yang paling gampang
 * terlewat karena jaraknya dihitung dari rLuar DAN yBawah sekaligus.
 */
function geometriBintang({ titik = 6, rLuar, rDalam, yPusat, yTepi, yBawah }) {
  const posisi = [];
  const indeks = [];
  const n = titik * 2;

  /* Dua cincin sedenah: tepi atas lalu tepi bawah. */
  for (const y of [yTepi, yBawah]) {
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2;
      const r = i % 2 === 0 ? rLuar : rDalam;
      posisi.push(r * Math.sin(a), y, r * Math.cos(a));
    }
  }

  const pusatAtas = 2 * n;
  posisi.push(0, yPusat, 0);
  const pusatBawah = 2 * n + 1;
  posisi.push(0, yBawah, 0);

  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;

    /* Kerucut bersegi di atas: rusuknya memancar dari pusat ke tiap
       sudut denah, jadi tiap lengan terbelah dua bidang. */
    indeks.push(pusatAtas, i, j);

    /* Dinding tegak. */
    indeks.push(i, n + i, n + j, i, n + j, j);

    /* Dasar rata. */
    indeks.push(pusatBawah, n + j, n + i);
  }

  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(posisi, 3));
  g.setIndex(indeks);
  g.computeVertexNormals();
  return g;
}

/*
 * Dua lingkar kelopak. Yang dalam digeser setengah langkah, jadi
 * ujungnya muncul di sela kelopak luar. Enam kali lebar sudut 34°
 * menghasilkan 408° — lebih dari satu putaran, jadi cawannya tertutup
 * dan tidak ada celah yang menganga.
 */
const LINGKAR = [
  {
    jumlah: 6, geser: 0, warna: 'emas', tunda: 0.22,
    y0: -0.430, y1: 0.060,
    rPangkal: 0.105, rUjung: 0.355, gembung: 0.105,
    sudut: 30, tebal: 0.028,
  },
  /* Lingkar dalam lebih jangkung dan lebih rapat ke sumbu, jadi ujungnya
     muncul di sela kelopak luar dan cawannya punya dua lapis. */
  {
    jumlah: 6, geser: 30, warna: 'emasTua', tunda: 0.34,
    y0: -0.415, y1: 0.150,
    rPangkal: 0.095, rUjung: 0.190, gembung: 0.100,
    sudut: 26, tebal: 0.026,
  },
];

/*
 * Seluruh bunga — tugu, alas bintang, dan semua kelopak — digeser ke
 * depan muka gir.
 *
 * Gir mengisi z dari -0,163 sampai 0,023, dan batang tugu di atas lubang
 * medali (y > 0,688) berada di jari-jari yang sama dengan bahan gir.
 * Selama bunganya di z = 0, pucuk tugu terkubur di dalam cincin dan
 * hilang dari pandangan. Jari-jari batangnya 0,082, jadi sumbunya harus
 * paling tidak di 0,023 + 0,082 = 0,105 supaya lewat di depan.
 */
const Z_BUNGA = 0.135;

/* ------------------------------------------------------------------ */
/* Tugu beralur                                                        */
/* ------------------------------------------------------------------ */

/**
 * Tugu dibuat sebagai permukaan putar yang penampangnya bergelombang,
 * bukan silinder polos, supaya alurnya terbaca waktu cahaya bergeser.
 * Normalnya dihitung ulang sesudah jadi, jadi permukaannya mulus.
 */
function geometriTugu({
  /* Turun sampai ke dalam lempeng alas: tugunya menembus bunga dari
     bawah ke atas, bukan berdiri di belakangnya. Berhenti di atas dasar
     lempeng (-0,595) supaya pangkalnya tidak mencuat dari bawah. */
  alas = -0.575,
  /*
   * Di logo aslinya tugu jauh lebih jangkung dari dugaan: batangnya naik
   * sampai 0,85 — menembus garis lingkaran dalam — lalu meruncing tajam
   * ke 0,945, hampir menyentuh gigi paling atas. Lebar batangnya 0,057,
   * diukur dari gambar yang sama.
   */
  bahu = 0.845,
  puncak = 0.945,
  /*
   * Sedikit lebih tebal dari hasil ukur logo datarnya (0,088 dan 0,057).
   * Di logo datar tugunya cuma garis; begitu jadi benda yang menembus
   * cawan teratai, batang setipis itu hilang di antara kelopak.
   */
  rAlas = 0.112,
  rBahu = 0.082,
  alur = 8,
  dalamAlur = 0.17,
  ruasY = 80,
  ruasKeliling = 96,
} = {}) {
  const posisi = [];
  const indeks = [];

  const jari = (v) => {
    /* v: 0 di alas, 1 di puncak */
    const yy = alas + (puncak - alas) * v;
    if (yy <= bahu) {
      const t = (yy - alas) / (bahu - alas);
      return rAlas + (rBahu - rAlas) * t;
    }
    const t = (yy - bahu) / (puncak - bahu);
    return rBahu * (1 - t * t); /* ujungnya meruncing halus, bukan kerucut */
  };

  for (let i = 0; i <= ruasY; i++) {
    const v = i / ruasY;
    const y = alas + (puncak - alas) * v;
    const r0 = jari(v);
    for (let j = 0; j <= ruasKeliling; j++) {
      const a = (j / ruasKeliling) * Math.PI * 2;
      const r = r0 * (1 - dalamAlur * 0.5 * (1 - Math.cos(alur * a)));
      posisi.push(r * Math.sin(a), y, r * Math.cos(a));
    }
  }

  for (let i = 0; i < ruasY; i++) {
    for (let j = 0; j < ruasKeliling; j++) {
      const a = i * (ruasKeliling + 1) + j;
      const b = a + ruasKeliling + 1;
      indeks.push(a, b, a + 1, b, b + 1, a + 1);
    }
  }

  /* Tutup bawah. Dulu pangkalnya tertutup cakram; sekarang cincinnya
     kosong, jadi tabung yang berongga akan kelihatan dari belakang. */
  const pusat = posisi.length / 3;
  posisi.push(0, alas, 0);
  for (let j = 0; j < ruasKeliling; j++) indeks.push(pusat, j + 1, j);

  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(posisi, 3));
  g.setIndex(indeks);
  g.computeVertexNormals();
  return g;
}

/* ------------------------------------------------------------------ */
/* Bahan                                                               */
/* ------------------------------------------------------------------ */

function bahan(warna, { kilap = 0.3, logam = 0, lapis = 0.55 } = {}) {
  return new THREE.MeshPhysicalMaterial({
    color: warna,
    roughness: kilap,
    metalness: logam,
    clearcoat: lapis,
    clearcoatRoughness: 0.22,
    envMapIntensity: 0.9,
  });
}

/**
 * Peta lingkungan dibuat di kanvas, bukan diunduh. Gradasi langit putih
 * ke biru pucat sudah cukup untuk memberi pantulan lembut di bevel.
 */
function lingkungan(perender) {
  const k = document.createElement('canvas');
  k.width = 16;
  k.height = 128;
  const g = k.getContext('2d');
  const grad = g.createLinearGradient(0, 0, 0, 128);
  grad.addColorStop(0.0, '#ffffff');
  grad.addColorStop(0.42, '#eaf3fb');
  grad.addColorStop(0.52, '#c3dcf0');
  grad.addColorStop(1.0, '#6c8ba4');
  g.fillStyle = grad;
  g.fillRect(0, 0, 16, 128);

  const tekstur = new THREE.CanvasTexture(k);
  tekstur.mapping = THREE.EquirectangularReflectionMapping;
  tekstur.colorSpace = THREE.SRGBColorSpace;

  const pmrem = new THREE.PMREMGenerator(perender);
  const peta = pmrem.fromEquirectangular(tekstur).texture;
  pmrem.dispose();
  tekstur.dispose();
  return peta;
}

/* ------------------------------------------------------------------ */
/* Adegan                                                              */
/* ------------------------------------------------------------------ */

const mudah = (t) => 1 - Math.pow(1 - t, 3);

/**
 * @param {HTMLCanvasElement} kanvas
 * @returns {{hancurkan: Function, jeda: Function, lanjut: Function}|null}
 *   null kalau WebGL tidak tersedia.
 */
export function buatLogo(kanvas) {
  let perender;
  try {
    perender = new THREE.WebGLRenderer({
      canvas: kanvas,
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance',
    });
  } catch (e) {
    return null;
  }
  if (!perender.getContext()) return null;

  perender.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  /* Neutral, bukan ACES: putih tugu harus tetap terbaca putih. */
  perender.toneMapping = THREE.NeutralToneMapping;
  perender.toneMappingExposure = 1.1;
  perender.outputColorSpace = THREE.SRGBColorSpace;

  const adegan = new THREE.Scene();
  adegan.environment = lingkungan(perender);

  const kamera = new THREE.PerspectiveCamera(32, 1, 0.1, 50);

  adegan.add(new THREE.HemisphereLight(0xffffff, 0xb9d2e6, 0.6));

  const utama = new THREE.DirectionalLight(0xffffff, 1.9);
  utama.position.set(2.4, 3.2, 4.2);
  adegan.add(utama);

  const tepi = new THREE.DirectionalLight(0xd6e9fa, 0.8);
  tepi.position.set(-3.4, 0.6, 1.8);
  adegan.add(tepi);

  const isi = new THREE.DirectionalLight(0xffffff, 0.35);
  isi.position.set(0, -2.6, 2.4);
  adegan.add(isi);

  const medali = new THREE.Group();
  adegan.add(medali);

  const bagian = [];
  const buang = [];

  /** Daftarkan satu bagian beserta jadwal masuknya. */
  function pasang(mesh, tunda, lompat = 0) {
    mesh.userData.z = mesh.position.z;
    mesh.userData.tunda = tunda;
    mesh.userData.lompat = lompat;
    bagian.push(mesh);
    medali.add(mesh);
    buang.push(mesh.geometry);
    return mesh;
  }

  /* -- roda gigi ----------------------------------------------------- */
  /*
   * Tiga lapis sepusat, masing-masing dibelah vertikal jadi dua warna.
   * Yang tengah lebih tipis, jadi di antara bingkai bergigi dan garis
   * lingkaran dalam terbentuk alur cekung — itulah garis logo yang di
   * gambar datar cuma berupa kontur putih. Simetris, jadi muka belakang
   * medali punya alur yang sama.
   */
  function lapisGir(bentuk, tebal, tunda) {
    const opsi = { ...ekstrusi(8), depth: tebal };
    const sisi = [
      [bentuk(-90, 90), WARNA.biruMuda, tunda],
      [bentuk(90, 270), WARNA.biruTua, tunda + 0.05],
    ];
    for (const [bidang, warna, saat] of sisi) {
      const m = new THREE.Mesh(
        new THREE.ExtrudeGeometry(bidang, opsi),
        bahan(warna, { kilap: 0.26 }),
      );
      m.position.z = Z_GIR - tebal / 2;
      pasang(m, saat);
    }
  }

  lapisGir(setengahGir, TEBAL_BINGKAI, 0.0);
  /* Kanal dilebihkan 0,02 ke dua arah supaya terselip di bawah bingkai
     dan tidak menyisakan celah di tempat bevelnya bertemu. */
  lapisGir(
    (a0, a1) => setengahCincin(a0, a1, R_BINGKAI + 0.02, R_CINCIN - 0.02),
    TEBAL_KANAL,
    0.03,
  );
  lapisGir((a0, a1) => setengahCincin(a0, a1, R_CINCIN, R_DALAM), TEBAL_BINGKAI, 0.06);

  /* Tengah cincin sengaja dibiarkan kosong — tidak ada cakram, tidak ada
     latar. Yang terlihat di dalam gir cuma tugu dan teratai, selebihnya
     tembus ke halaman di belakangnya, seperti gantungan kunci logamnya. */

  /* -- tugu --------------------------------------------------------- */
  const tugu = new THREE.Mesh(
    geometriTugu(),
    bahan(WARNA.putihTeduh, { kilap: 0.3, lapis: 0.45 }),
  );
  /* Tanpa cakram di belakangnya, tugu putih hanya terbaca lewat bayangan
     alurnya sendiri, jadi pantulan lingkungannya dinaikkan. */
  tugu.material.envMapIntensity = 1.25;
  /* Sumbu bunga dan sumbu tugu sama-sama di x = 0, z = 0: batangnya
     lewat persis di tengah cawan. Kelopak terdekat kamera menutupi
     sebagian batang, yang di seberangnya tertutup batang — itu yang
     membuat tugunya terbaca menembus bunga, bukan menempel di depannya. */
  tugu.position.z = Z_BUNGA;
  pasang(tugu, 0.14);

  /* -- alas bintang -------------------------------------------------- */
  const bintang = new THREE.Mesh(
    geometriBintang({
      /* Sudut terjauhnya: hypot(0,295, 0,600) = 0,669, masih di dalam
         lubang medali yang 0,688. */
      titik: 6,
      rLuar: 0.295, rDalam: 0.135,
      yPusat: -0.415, yTepi: -0.495, yBawah: -0.600,
    }),
    bahan(WARNA.putih, { kilap: 0.34, lapis: 0.4 }),
  );
  bintang.position.z = Z_BUNGA;
  pasang(bintang, 0.18);

  /* -- dua lingkar kelopak ------------------------------------------- */
  for (const cincin of LINGKAR) {
    /* Satu geometri dipakai bersama seluruh kelopak dalam satu lingkar;
       yang berbeda cuma sudut putarnya. */
    const geo = geometriKelopak(cincin);
    const warna = WARNA[cincin.warna];

    for (let i = 0; i < cincin.jumlah; i++) {
      const m = new THREE.Mesh(
        geo,
        /* Teratainya kuning pekat yang matte, bukan emas berkilau:
           kalau dibuat logam, lengkungan kelopaknya hilang di balik
           pantulan dan cawannya malah terbaca rata. */
        bahan(warna, { kilap: 0.44, logam: 0, lapis: 0.2 }),
      );
      /* Putar dulu di sumbunya sendiri, baru digeser: kalau urutannya
         terbalik, kelopaknya mengorbit titik lain dan cawannya buyar. */
      m.rotation.y = rad(cincin.geser + (360 / cincin.jumlah) * i);
      m.position.z = Z_BUNGA;
      pasang(m, cincin.tunda + i * 0.03, 0.1);
    }
  }

  /* Sumbu putar ditaruh di tengah tebal medali, bukan di muka. */
  medali.position.z = -0.025;

  /* ---------------------------------------------------------------- */
  /* Ukuran kanvas                                                     */
  /* ---------------------------------------------------------------- */

  function ukurUlang() {
    const induk = kanvas.parentElement || kanvas;
    const l = Math.max(induk.clientWidth, 1);
    const t = Math.max(induk.clientHeight, 1);
    perender.setSize(l, t, false);
    kamera.aspect = l / t;
    /* Medali selalu muat, juga waktu kanvasnya lebih tinggi dari lebar. */
    const muat = Math.min(1, kamera.aspect / 0.95);
    kamera.position.z = 4.5 / Math.max(muat, 0.52);
    kamera.updateProjectionMatrix();
  }

  const pengamatUkuran = new ResizeObserver(ukurUlang);
  pengamatUkuran.observe(kanvas.parentElement || kanvas);
  ukurUlang();

  /* ---------------------------------------------------------------- */
  /* Putar: seret, panah, dan ayunan pelan waktu didiamkan              */
  /* ---------------------------------------------------------------- */

  /* Diam pun medali tetap sedikit miring, supaya tebalnya terbaca. */
  let yaw = 0;
  let pitch = 0;
  let yawTarget = 0.17;
  let pitchTarget = -0.07;
  let menyeret = false;
  let xTerakhir = 0;
  let yTerakhir = 0;
  let diamSejak = performance.now();
  let adaCampurTangan = false;

  function sentuh() {
    diamSejak = performance.now();
    adaCampurTangan = true;
  }

  function turun(e) {
    menyeret = true;
    xTerakhir = e.clientX;
    yTerakhir = e.clientY;
    kanvas.setPointerCapture?.(e.pointerId);
    kanvas.classList.add('is-seret');
    sentuh();
  }

  function gerak(e) {
    if (!menyeret) return;
    yawTarget += (e.clientX - xTerakhir) * 0.0075;
    pitchTarget += (e.clientY - yTerakhir) * 0.0055;
    pitchTarget = THREE.MathUtils.clamp(pitchTarget, -0.55, 0.55);
    xTerakhir = e.clientX;
    yTerakhir = e.clientY;
    sentuh();
  }

  function naik(e) {
    menyeret = false;
    kanvas.releasePointerCapture?.(e.pointerId);
    kanvas.classList.remove('is-seret');
    sentuh();
  }

  kanvas.addEventListener('pointerdown', turun);
  kanvas.addEventListener('pointermove', gerak);
  kanvas.addEventListener('pointerup', naik);
  kanvas.addEventListener('pointercancel', naik);

  kanvas.tabIndex = 0;
  kanvas.setAttribute('role', 'img');
  kanvas.setAttribute(
    'aria-label',
    'Logo Institut Teknologi Sepuluh Nopember dalam bentuk tiga dimensi: ' +
      'roda gigi delapan gigi, teratai berbentuk cawan yang kelopaknya ' +
      'melingkar, dan tugu beralur yang menembus tengah bunga. ' +
      'Bisa diputar dengan menyeret atau dengan tombol panah.',
  );

  kanvas.addEventListener('keydown', (e) => {
    const langkah = 0.16;
    if (e.key === 'ArrowLeft') yawTarget -= langkah;
    else if (e.key === 'ArrowRight') yawTarget += langkah;
    else if (e.key === 'ArrowUp') pitchTarget = Math.max(pitchTarget - langkah, -0.55);
    else if (e.key === 'ArrowDown') pitchTarget = Math.min(pitchTarget + langkah, 0.55);
    else return;
    e.preventDefault();
    sentuh();
  });

  /* ---------------------------------------------------------------- */
  /* Gelung gambar                                                     */
  /* ---------------------------------------------------------------- */

  const MASUK = 1500; /* ms */
  let mulai = 0;
  let hidup = true;
  let jalan = true;
  let pinta = 0;

  function bingkai(waktu) {
    if (!hidup) return;
    pinta = requestAnimationFrame(bingkai);
    if (!jalan) return;
    if (!mulai) mulai = waktu;

    const lewat = waktu - mulai;

    /* Masuk: tiap bagian naik ke tempatnya sendiri-sendiri. */
    for (const m of bagian) {
      const p = THREE.MathUtils.clamp(
        (lewat - m.userData.tunda * MASUK) / (MASUK * 0.55),
        0,
        1,
      );
      const e = mudah(p);
      m.scale.setScalar(0.55 + 0.45 * e);
      m.position.z = m.userData.z - (1 - e) * (0.55 + m.userData.lompat);
      m.visible = p > 0;
    }

    const masuk = THREE.MathUtils.clamp(lewat / MASUK, 0, 1);

    /* Sesudah masuk, medali mengayun pelan selama belum disentuh. */
    if (!menyeret && waktu - diamSejak > 2200) {
      const d = (waktu - diamSejak - 2200) / 1000;
      const bobot = Math.min(d / 2, 1);
      const ayun = Math.sin(waktu * 0.00034) * 0.3;
      const angguk = Math.sin(waktu * 0.00021) * 0.07;
      yawTarget += (ayun - yawTarget) * 0.02 * bobot;
      pitchTarget += (angguk - pitchTarget) * 0.02 * bobot;
    }

    yaw += (yawTarget - yaw) * 0.08;
    pitch += (pitchTarget - pitch) * 0.08;

    /* Putaran pembuka: medali berbalik dari samping ke depan. */
    const buka = (1 - mudah(masuk)) * -0.95;

    medali.rotation.y = yaw + buka;
    medali.rotation.x = pitch;
    medali.rotation.z = (1 - mudah(masuk)) * 0.12;

    kamera.lookAt(0, 0, 0);
    perender.render(adegan, kamera);
  }

  pinta = requestAnimationFrame(bingkai);

  return {
    sudahDisentuh: () => adaCampurTangan,
    jeda() {
      jalan = false;
    },
    lanjut() {
      jalan = true;
    },
    hancurkan() {
      hidup = false;
      cancelAnimationFrame(pinta);
      pengamatUkuran.disconnect();
      kanvas.removeEventListener('pointerdown', turun);
      kanvas.removeEventListener('pointermove', gerak);
      kanvas.removeEventListener('pointerup', naik);
      kanvas.removeEventListener('pointercancel', naik);
      buang.forEach((g) => g.dispose());
      adegan.environment?.dispose();
      perender.dispose();
    },
  };
}
