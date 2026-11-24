/**
 * Inisialisasi MapLibre dan pergantian basemap.
 *
 * Ketiga basemap dipasang sekaligus sebagai layer raster, lalu ditukar
 * dengan visibility. Sengaja tidak memakai map.setStyle(), karena itu
 * membuang semua source dan layer yang sudah kita tambahkan -- termasuk
 * splat-nya -- dan harus dirangkai ulang dari nol.
 */

import { PUSAT, ZOOM_AWAL, PITCH_AWAL, BEARING_AWAL } from './config.js';

/**
 * tileSize wajib cocok dengan ukuran piksel tile sebenarnya. URL @2x
 * CARTO mengirim tile 512 px; kalau tetap ditulis 256, MapLibre salah
 * menghitung dan meminta satu tingkat zoom lebih dalam dari yang perlu.
 */
const BASEMAP = {
  // CARTO dark_all sempat dipakai, tapi sejak akhir 2026 tile-nya
  // mengembalikan gambar "API KEY REQUIRED". Esri Dark Gray Canvas
  // masih bebas kunci dan satu penyedia dengan layer satelit di bawah.
  gelap: {
    tiles: ['https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}'],
    tileSize: 256,
    maxzoom: 16,
    attribution: '© Esri, HERE, Garmin, © OpenStreetMap contributors',
  },
  satelit: {
    tiles: ['https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'],
    tileSize: 256,
    attribution: 'Citra © Esri, Maxar, Earthstar Geographics',
  },
  osm: {
    tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
    tileSize: 256,
    attribution: '© OpenStreetMap contributors',
  },
};

export const BASEMAP_AWAL = 'gelap';

/** Urutan ini juga jadi urutan layer di peta, jadi basemap selalu paling bawah. */
const URUTAN = ['gelap', 'satelit', 'osm'];

export function buatPeta(container = 'map') {
  const sources = {};
  const layers = [];

  for (const key of URUTAN) {
    sources[`bm-${key}`] = {
      type: 'raster',
      tiles: BASEMAP[key].tiles,
      tileSize: BASEMAP[key].tileSize,
      attribution: BASEMAP[key].attribution,
      // Di atas maxzoom tile terakhir diregangkan, bukan dicari yang
      // tidak ada. Esri Dark Gray berhenti di z16, sementara kita
      // sering melihat kampus di z17-18.
      ...(BASEMAP[key].maxzoom ? { maxzoom: BASEMAP[key].maxzoom } : {}),
    };
    layers.push({
      id: `bm-${key}`,
      type: 'raster',
      source: `bm-${key}`,
      layout: { visibility: key === BASEMAP_AWAL ? 'visible' : 'none' },
    });
  }

  const map = new maplibregl.Map({
    container,
    center: PUSAT,
    zoom: ZOOM_AWAL,
    pitch: PITCH_AWAL,
    bearing: BEARING_AWAL,
    maxPitch: 85,
    antialias: true,
    style: { version: 8, sources, layers, glyphs: 'https://demotiles.maplibre.org/font/{fontstack}/{range}.pbf' },
  });

  map.addControl(new maplibregl.NavigationControl({ visualizePitch: true }), 'bottom-right');
  map.addControl(new maplibregl.ScaleControl({ maxWidth: 100, unit: 'metric' }), 'bottom-left');

  return map;
}

/** Tampilkan satu basemap, sembunyikan sisanya. */
export function gantiBasemap(map, key) {
  if (!BASEMAP[key]) return;
  for (const k of URUTAN) {
    if (!map.getLayer(`bm-${k}`)) continue;
    map.setLayoutProperty(`bm-${k}`, 'visibility', k === key ? 'visible' : 'none');
  }
}
