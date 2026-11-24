/**
 * Entry point. Merangkai peta, layer GeoServer, splat, dan panel.
 *
 * Urutan boot dibuat supaya tiap bagian bisa gagal sendiri tanpa
 * menjatuhkan yang lain: kalau GeoServer mati, splat tetap tampil;
 * kalau CDN splat tidak bisa diakses, peta dan layer tetap jalan.
 */

import { GEOREF, KUALITAS_AWAL, PUSAT, ZOOM_AWAL, PITCH_AWAL, BEARING_AWAL } from './config.js';
import { buatPeta, gantiBasemap } from './map.js';
import { Layers } from './layers.js';
import { Buildings } from './buildings.js';
import { Splat } from './splat.js';
import { initPanel, labelKualitas } from './panel.js';

const CATATAN_MODE = {
  splat: 'Gaussian splatting hasil pemotretan drone FTSPK.',
  blok: 'Blok 3D dari footprint PostGIS, tinggi dari kolom tinggi_m.',
  '2d': 'Footprint datar. Paling ringan, jalan di perangkat apa pun.',
};

const map = buatPeta('map');
const layers = new Layers(map);
const buildings = new Buildings(map);
const splat = new Splat(map);

let mode = 'splat';
let kualitas = KUALITAS_AWAL;

// Dideklarasikan terpisah dari penugasan: handler panel bisa terpanggil
// saat initPanel masih berjalan, dan `const` akan melempar TDZ di situ,
// bukan sekadar memberi undefined.
let ui;
ui = initPanel({
  onMode: (v) => setMode(v),
  onKualitas: (v) => setKualitas(v),
  onBasemap: (v) => gantiBasemap(map, v),
  onLayer: async (id, aktif) => {
    if (aktif) ui.setStatusLayer(id, 'memuat', 'memuat...');
    const hasil = await layers.setAktif(id, aktif);
    ui.setStatusLayer(
      id,
      hasil,
      hasil === 'galat' ? 'tidak tersedia di GeoServer' : layers.def(id)?.typeName
    );
  },
  onOpacity: (v) => {
    if (!splat.setOpacity(v)) {
      ui.matikanOpasitas('Plugin splat v0.2.9 tidak menyediakan pengatur opasitas.');
    }
  },
  onDevApply: async (nilai) => {
    // Panel kalibrasi: coba transform lain tanpa menyentuh config.js.
    await splat.muat(kualitas, {
      longitude: nilai.lon,
      latitude: nilai.lat,
      altitude: nilai.alt,
      rotation: nilai.rotation,
      scale: nilai.scale,
    });
  },
});

/* ---------------------------------------------------------------- mode -- */

function setMode(v) {
  mode = v;
  ui?.setCatatanMode(CATATAN_MODE[v] || '');
  buildings.setMode(v);
  splat.setTampil(v === 'splat');

  // Mode 2D tidak masuk akal dengan kamera miring.
  if (v === '2d') map.easeTo({ pitch: 0, duration: 400 });
  else if (map.getPitch() < 10) map.easeTo({ pitch: PITCH_AWAL, duration: 400 });
}

async function setKualitas(v) {
  kualitas = v;
  if (mode !== 'splat') return;
  await splat.muat(v);
}

/* ---------------------------------------------------------------- boot -- */

splat.on('mulai', ({ def }) => {
  ui.setLoading(true, 'Memuat splat', `${def.label} · ${def.ukuran}`);
  ui.setStatus('Memuat', 'memuat');
});

splat.on('selesai', ({ kualitas: k, detik }) => {
  ui.setLoading(false);
  ui.setStatus('Siap', 'siap');
  ui.setInfoSplat(`${labelKualitas(k)}, ${detik.toFixed(1)} s`);
});

splat.on('galat', (pesan) => {
  ui.setLoading(false);
  ui.setStatus('Splat gagal', 'galat');
  ui.setInfoSplat(pesan);
});

map.on('load', async () => {
  ui.setInfoGeoref(
    GEOREF.dibake
      ? `Georeferensi: ter-bake, RMSE ${GEOREF.rmse_m ?? '?'} m (validasi ${GEOREF.rmse_validasi_m ?? '?'} m).`
      : 'Georeferensi: belum dikalibrasi. Posisi splat masih sementara, lihat tools/README.md.'
  );

  // Gedung lebih dulu, supaya layers.js tahu harus menyisipkan di bawahnya.
  const adaGedung = await buildings.siapkan();
  if (!adaGedung) {
    ui.setStatus('GeoServer?', 'galat');
  }

  // Layer yang ditandai aktif di config.js dinyalakan sekarang.
  for (const d of layers.status.keys()) {
    if (layers.def(d)?.aktif) {
      const hasil = await layers.setAktif(d, true);
      ui.setStatusLayer(d, hasil);
    }
  }

  if (await splat.siapkan()) {
    await splat.muat(kualitas);
  }
});

/* Tombol pulang ke tampilan awal, lewat dobel klik pada logo. */
document.querySelector('.app-header__logos').addEventListener('dblclick', () => {
  map.easeTo({ center: PUSAT, zoom: ZOOM_AWAL, pitch: PITCH_AWAL, bearing: BEARING_AWAL });
});

// Memudahkan debug dari console browser.
window.KT = { map, layers, buildings, splat };
