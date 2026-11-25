/**
 * Entry point. Merangkai peta, layer GeoServer, splat, dan panel.
 *
 * Urutan boot dibuat supaya tiap bagian bisa gagal sendiri tanpa
 * menjatuhkan yang lain: kalau GeoServer mati, splat tetap tampil;
 * kalau CDN splat tidak bisa diakses, peta dan layer tetap jalan.
 */

import { PUSAT, ZOOM_AWAL, PITCH_AWAL, BEARING_AWAL } from './config.js';
import { buatPeta, gantiBasemap, gambarSeperlunya } from './map.js';
import { Layers } from './layers.js';
import { Buildings } from './buildings.js';
import { Splat } from './splat.js';
import { initPanel } from './panel.js';

const CATATAN_MODE = {
  splat: 'Gaussian splatting hasil pemotretan drone FTSPK.',
  blok: 'Blok 3D dari footprint PostGIS, tinggi dari kolom tinggi_m.',
  '2d': 'Footprint datar. Paling ringan, jalan di perangkat apa pun.',
};

const map = buatPeta('map');

/* Dipasang sebelum apa pun yang menggambar, supaya tidak ada gelung
   gambar yang sempat terpasang di luar kendalinya. */
const bangunkanGambar = gambarSeperlunya(map);

const layers = new Layers(map);
const buildings = new Buildings(map);
const splat = new Splat(map);

let mode = 'splat';

// Dideklarasikan terpisah dari penugasan: handler panel bisa terpanggil
// saat initPanel masih berjalan, dan `const` akan melempar TDZ di situ,
// bukan sekadar memberi undefined.
let ui;
ui = initPanel({
  onMode: (v) => setMode(v),
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
    /* Opasitas tidak memancarkan event peta apa pun, jadi kalau peta
       sedang diam tidak ada yang membangunkannya. */
    bangunkanGambar();
    if (!splat.setOpacity(v)) {
      ui.matikanOpasitas('Plugin splat v0.2.9 tidak menyediakan pengatur opasitas.');
    }
  },
});

/* ---------------------------------------------------------------- mode -- */

function setMode(v) {
  mode = v;
  /* Ganti mode membuang atau memasang mesh, tanpa event peta. */
  bangunkanGambar(3000);
  ui?.setCatatanMode(CATATAN_MODE[v] || '');
  buildings.setMode(v);
  splat.setTampil(v === 'splat');

  // Mode 2D tidak masuk akal dengan kamera miring.
  if (v === '2d') map.easeTo({ pitch: 0, duration: 400 });
  else if (map.getPitch() < 10) map.easeTo({ pitch: PITCH_AWAL, duration: 400 });
}

/* ---------------------------------------------------------------- boot -- */

splat.on('mulai', ({ def }) => {
  ui.setLoading(true, 'Memuat splat', `Kualitas penuh · ${def.ukuran}`);
  ui.setStatus('Memuat', 'memuat');
});

splat.on('selesai', ({ def, detik }) => {
  /* Mesh baru masuk adegan tanpa event peta, dan spark masih menyusun
     urutan gaussian beberapa bingkai sesudahnya. */
  bangunkanGambar(4000);
  ui.setLoading(false);
  ui.setStatus('Siap', 'siap');
  ui.setInfoSplat(
    `${def.jumlah.toLocaleString('id-ID')} splat, ${def.ukuran}, ${detik.toFixed(1)} s`
  );
});

splat.on('galat', (pesan) => {
  ui.setLoading(false);
  ui.setStatus('Splat gagal', 'galat');
  ui.setInfoSplat(pesan);
});

map.on('load', async () => {
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

  if (await splat.siapkan()) await splat.muat();
});

/* Tombol pulang ke tampilan awal, lewat dobel klik pada logo. */
document.querySelector('.app-header__logos').addEventListener('dblclick', () => {
  map.easeTo({ center: PUSAT, zoom: ZOOM_AWAL, pitch: PITCH_AWAL, bearing: BEARING_AWAL });
});

// Memudahkan debug dari console browser.
window.KT = { map, layers, buildings, splat };
