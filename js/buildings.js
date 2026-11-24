/**
 * Gedung: tiga mode render plus popup informasi.
 *
 * Satu source GeoJSON dari WFS, lima layer, dan tiap mode hanya
 * menampilkan sebagian:
 *
 *   splat -> bounding box translusen + garis dasar + pita atas.
 *            Dibuat tipis supaya splat fotorealistik di belakangnya
 *            tetap terlihat, bukan tertutup kotak solid.
 *   blok  -> fill-extrusion solid. Ini praktis LOD 1.
 *   2d    -> poligon datar + garis tepi.
 *
 * MapLibre tidak punya primitif wireframe untuk extrusion, jadi kesan
 * "kerangka kotak" dibuat dari pita tipis di puncak (fill-extrusion
 * dengan base = tinggi - 0.4) ditambah garis di footprint.
 */

import { urlWfs, WORKSPACE } from './config.js';

const SRC = 'bangunan';
const TINGGI = ['coalesce', ['to-number', ['get', 'tinggi_m']], 10];

/** Layer yang bisa diklik. Layer dengan visibility none tidak ikut di-query. */
const BISA_KLIK = ['bangunan-fill', 'bangunan-3d', 'bangunan-bbox'];

const MODE_LAYER = {
  splat: ['bangunan-bbox', 'bangunan-bbox-top', 'bangunan-outline'],
  blok: ['bangunan-3d'],
  '2d': ['bangunan-fill', 'bangunan-outline'],
};

const SEMUA_LAYER = [
  'bangunan-fill',
  'bangunan-3d',
  'bangunan-bbox',
  'bangunan-bbox-top',
  'bangunan-outline',
];

export class Buildings {
  constructor(map) {
    this.map = map;
    this.siap = false;
    this.popup = null;
    this.mode = 'splat';
  }

  async siapkan() {
    let data;
    try {
      const res = await fetch(urlWfs(`${WORKSPACE}:bangunan`));
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      data = await res.json();
    } catch (err) {
      console.warn('[bangunan] belum bisa dimuat (cek GeoServer dan CORS):', err.message);
      return false;
    }

    if (!data?.features?.length) {
      console.warn('[bangunan] GeoServer menjawab, tapi belum ada footprint. Digitasi dulu di QGIS.');
      return false;
    }

    this.map.addSource(SRC, { type: 'geojson', data });

    // 2D
    this.map.addLayer({
      id: 'bangunan-fill',
      type: 'fill',
      source: SRC,
      layout: { visibility: 'none' },
      paint: { 'fill-color': '#3b9eff', 'fill-opacity': 0.25 },
    });

    // Blok 3D solid
    this.map.addLayer({
      id: 'bangunan-3d',
      type: 'fill-extrusion',
      source: SRC,
      layout: { visibility: 'none' },
      paint: {
        'fill-extrusion-color': '#2f6fd0',
        'fill-extrusion-height': TINGGI,
        'fill-extrusion-opacity': 0.9,
      },
    });

    // Bounding box untuk mode splat
    this.map.addLayer({
      id: 'bangunan-bbox',
      type: 'fill-extrusion',
      source: SRC,
      layout: { visibility: 'none' },
      paint: {
        'fill-extrusion-color': '#3b9eff',
        'fill-extrusion-height': TINGGI,
        'fill-extrusion-opacity': 0.12,
      },
    });

    this.map.addLayer({
      id: 'bangunan-bbox-top',
      type: 'fill-extrusion',
      source: SRC,
      layout: { visibility: 'none' },
      paint: {
        'fill-extrusion-color': '#6cbcff',
        'fill-extrusion-height': TINGGI,
        'fill-extrusion-base': ['max', 0, ['-', TINGGI, 0.4]],
        'fill-extrusion-opacity': 0.75,
      },
    });

    this.map.addLayer({
      id: 'bangunan-outline',
      type: 'line',
      source: SRC,
      layout: { visibility: 'none', 'line-join': 'round' },
      paint: { 'line-color': '#6cbcff', 'line-width': 1.5, 'line-opacity': 0.9 },
    });

    for (const id of BISA_KLIK) {
      this.map.on('click', id, (e) => this._bukaPopup(e));
      this.map.on('mouseenter', id, () => (this.map.getCanvas().style.cursor = 'pointer'));
      this.map.on('mouseleave', id, () => (this.map.getCanvas().style.cursor = ''));
    }

    this.siap = true;
    this.setMode(this.mode);
    return true;
  }

  /** Tampilkan hanya layer milik mode ini. */
  setMode(mode) {
    this.mode = mode;
    if (!this.siap) return;
    const tampil = new Set(MODE_LAYER[mode] || []);
    for (const id of SEMUA_LAYER) {
      if (!this.map.getLayer(id)) continue;
      this.map.setLayoutProperty(id, 'visibility', tampil.has(id) ? 'visible' : 'none');
    }
  }

  _bukaPopup(e) {
    const f = e.features?.[0];
    if (!f) return;
    this.popup?.remove();
    this.popup = new maplibregl.Popup({ offset: 12, maxWidth: 'none', closeButton: true })
      .setLngLat(e.lngLat)
      .setHTML(isiPopup(f.properties || {}))
      .addTo(this.map);
  }
}

function esc(v) {
  return String(v).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
}

function isiPopup(p) {
  const nama = p.nama || 'Gedung tanpa nama';

  // `departemen` dan `singkatan` baru ada setelah VIEW v_bangunan_info
  // dipublikasikan di GeoServer (Tahap 2). Sampai itu ada, pakai `fungsi`.
  const sub = p.departemen || p.singkatan || p.fungsi || 'FTSPK ITS';

  const lantai = p.jumlah_lantai ?? '–';
  const tinggi = p.tinggi_m != null ? `${p.tinggi_m} m` : '–';

  const tautan = [];
  if (p.url_web) tautan.push(`<a href="${esc(p.url_web)}" target="_blank" rel="noopener">Situs</a>`);
  if (p.url_instagram) tautan.push(`<a href="${esc(p.url_instagram)}" target="_blank" rel="noopener">Instagram</a>`);

  return `
    <div class="pop">
      <div class="pop__head">
        <strong>${esc(nama)}</strong>
        <span>${esc(sub)}</span>
      </div>
      <div class="pop__body">
        <div class="pop__grid">
          <div class="pop__stat"><small>Lantai</small><b>${esc(lantai)}</b></div>
          <div class="pop__stat"><small>Tinggi</small><b>${esc(tinggi)}</b></div>
        </div>
        ${tautan.length ? `<div class="pop__links">${tautan.join('')}</div>` : ''}
      </div>
    </div>`;
}
