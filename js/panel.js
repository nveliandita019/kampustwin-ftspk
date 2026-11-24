/**
 * Semua wiring DOM panel kontrol. Modul ini tidak tahu apa-apa soal
 * MapLibre atau splat -- ia hanya memanggil handler yang dikirim main.js
 * dan menyediakan fungsi untuk memperbarui tampilan.
 */

import { LAYERS, SPLAT, KUALITAS_AWAL, transformSplat } from './config.js';

const $ = (sel) => document.querySelector(sel);

export function initPanel(handlers = {}) {
  pasangAkordeon();
  pasangLipat();

  pasangSegmented('#seg-mode', 'mode', (v) => handlers.onMode?.(v));
  pasangSegmented('#seg-kualitas', 'kualitas', (v) => handlers.onKualitas?.(v));
  pasangSegmented('#seg-basemap', 'basemap', (v) => handlers.onBasemap?.(v));

  const barisLayer = bangunDaftarLayer((id, aktif) => handlers.onLayer?.(id, aktif));
  pasangOpasitas((v) => handlers.onOpacity?.(v));
  pasangDev((nilai) => handlers.onDevApply?.(nilai));

  return {
    setStatus(teks, keadaan = 'siap') {
      const el = $('#status');
      el.dataset.state = keadaan;
      el.querySelector('span').textContent = teks;
    },

    setLoading(tampil, teks = 'Memuat splat', detail = '') {
      $('#loading').hidden = !tampil;
      if (tampil) {
        $('#loading-text').textContent = teks;
        $('#loading-detail').textContent = detail;
      }
    },

    setInfoSplat(teks) {
      $('#info-splat').textContent = teks;
    },

    setInfoGeoref(teks) {
      $('#info-georef').textContent = teks;
    },

    setCatatanMode(teks) {
      $('#mode-note').textContent = teks;
    },

    /** Matikan slider opasitas kalau plugin tidak mengizinkannya. */
    matikanOpasitas(alasan) {
      const s = $('#splat-opacity');
      s.disabled = true;
      s.title = alasan;
      $('#splat-opacity-out').textContent = 'n/a';
    },

    /** 'siap' | 'galat' | 'memuat' untuk satu baris layer. */
    setStatusLayer(id, keadaan, catatan) {
      const b = barisLayer.get(id);
      if (!b) return;
      b.input.disabled = keadaan === 'galat';
      if (keadaan === 'galat') {
        b.input.checked = false;
        b.small.textContent = catatan || 'tidak tersedia di GeoServer';
      } else if (catatan) {
        b.small.textContent = catatan;
      }
    },

    setKualitasAktif(kualitas) {
      terapkanSegmented('#seg-kualitas', 'kualitas', kualitas);
    },

    setModeAktif(mode) {
      terapkanSegmented('#seg-mode', 'mode', mode);
    },
  };
}

/* ------------------------------------------------------------- akordeon -- */

function pasangAkordeon() {
  for (const head of document.querySelectorAll('.sect__head')) {
    const sect = head.closest('.sect');
    head.setAttribute('aria-expanded', sect.dataset.open === 'true' ? 'true' : 'false');
    head.addEventListener('click', () => {
      const buka = sect.dataset.open !== 'true';
      sect.dataset.open = String(buka);
      head.setAttribute('aria-expanded', String(buka));
    });
  }
}

function pasangLipat() {
  const panel = $('#panel');
  const btn = $('#panel-collapse');
  btn.addEventListener('click', () => {
    const lipat = !panel.classList.contains('is-collapsed');
    panel.classList.toggle('is-collapsed', lipat);
    btn.setAttribute('aria-expanded', String(!lipat));
    btn.title = lipat ? 'Buka panel' : 'Lipat panel';
  });
}

/* ------------------------------------------------------------ segmented -- */

function pasangSegmented(sel, attr, onPilih) {
  const grup = $(sel);
  if (!grup) return;
  grup.addEventListener('click', (e) => {
    const btn = e.target.closest(`[data-${attr}]`);
    if (!btn || btn.getAttribute('aria-pressed') === 'true') return;
    terapkanSegmented(sel, attr, btn.dataset[attr]);
    onPilih(btn.dataset[attr]);
  });
}

function terapkanSegmented(sel, attr, nilai) {
  const grup = $(sel);
  if (!grup) return;
  for (const b of grup.querySelectorAll(`[data-${attr}]`)) {
    b.setAttribute('aria-pressed', String(b.dataset[attr] === nilai));
  }
}

/* ---------------------------------------------------------- daftar layer -- */

function bangunDaftarLayer(onToggle) {
  const wadah = $('#layer-list');
  const peta = new Map();

  for (const d of LAYERS) {
    const row = document.createElement('div');
    row.className = 'row';

    const swatch = document.createElement('span');
    swatch.className = 'swatch';
    swatch.style.background = d.warna || 'var(--text-2)';

    const label = document.createElement('span');
    label.className = 'row__label';
    const nama = document.createElement('span');
    nama.textContent = d.nama;
    const small = document.createElement('small');
    small.textContent = d.catatan || d.typeName;
    label.append(nama, small);

    const sw = document.createElement('label');
    sw.className = 'switch';
    const input = document.createElement('input');
    input.type = 'checkbox';
    input.checked = Boolean(d.aktif);
    input.setAttribute('aria-label', d.nama);
    const track = document.createElement('span');
    track.className = 'switch__track';
    sw.append(input, track);

    input.addEventListener('change', () => onToggle(d.id, input.checked));

    row.append(swatch, label, sw);
    wadah.append(row);
    peta.set(d.id, { row, input, small });
  }

  return peta;
}

/* -------------------------------------------------------------- opasitas -- */

function pasangOpasitas(onUbah) {
  const s = $('#splat-opacity');
  const out = $('#splat-opacity-out');
  s.addEventListener('input', () => {
    out.textContent = `${s.value}%`;
    onUbah(Number(s.value) / 100);
  });
}

/* ------------------------------------------------------------ panel dev -- */

function pasangDev(onTerapkan) {
  const aktif = new URLSearchParams(location.search).get('dev') === '1';
  const dev = $('#dev');
  if (!aktif) return;

  dev.hidden = false;
  // Diisi dari transform yang benar-benar dipakai, supaya panel ini
  // tidak pernah berbeda dari yang dikirim ke loadSplat().
  const t = transformSplat();
  $('#dev-rx').value = t.rotation[0];
  $('#dev-ry').value = t.rotation[1];
  $('#dev-rz').value = t.rotation[2];
  $('#dev-scale').value = t.scale;
  $('#dev-alt').value = t.altitude;
  $('#dev-lon').value = t.longitude;
  $('#dev-lat').value = t.latitude;

  $('#dev-apply').addEventListener('click', () => {
    const awal = transformSplat();
    const nilai = {
      rotation: [
        Number($('#dev-rx').value) || 0,
        Number($('#dev-ry').value) || 0,
        Number($('#dev-rz').value) || 0,
      ],
      scale: Number($('#dev-scale').value) || awal.scale,
      alt: Number($('#dev-alt').value) || 0,
      lon: Number($('#dev-lon').value) || awal.longitude,
      lat: Number($('#dev-lat').value) || awal.latitude,
    };
    // Dicetak dalam bentuk yang bisa langsung disalin ke js/config.js
    // begitu kalibrasinya cocok.
    $('#dev-out').textContent =
      `rotation: [${nilai.rotation.join(', ')}], scale: ${nilai.scale}, ` +
      `alt: ${nilai.alt}, lon: ${nilai.lon}, lat: ${nilai.lat}`;
    onTerapkan(nilai);
  });
}

/** Label kualitas untuk readout info. */
export function labelKualitas(kualitas) {
  const d = SPLAT[kualitas] || SPLAT[KUALITAS_AWAL];
  return `${d.label}, ${d.jumlah.toLocaleString('id-ID')} splat, ${d.ukuran}`;
}
