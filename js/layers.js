/**
 * Layer vektor dan raster dari GeoServer.
 *
 * Tiap layer dimuat sekali saat pertama dinyalakan (lazy), lalu
 * dinyala-matikan lewat visibility. Layer yang belum dipublikasikan di
 * GeoServer akan gagal sekali, ditandai, dan checkbox-nya dinonaktifkan
 * -- bukan mencoba terus setiap kali diklik.
 */

import { LAYERS, urlWfs, urlWms } from './config.js';

export class Layers {
  constructor(map) {
    this.map = map;
    this.status = new Map(); // id -> 'kosong' | 'siap' | 'galat'
    for (const d of LAYERS) this.status.set(d.id, 'kosong');
  }

  def(id) {
    return LAYERS.find((d) => d.id === id);
  }

  /** Nyalakan atau matikan satu layer. Mengembalikan status akhirnya. */
  async setAktif(id, aktif) {
    const d = this.def(id);
    if (!d) return 'galat';

    if (aktif && this.status.get(id) === 'kosong') {
      const ok = d.tipe === 'wms' ? this._tambahWms(d) : await this._tambahWfs(d);
      this.status.set(id, ok ? 'siap' : 'galat');
    }

    if (this.status.get(id) !== 'siap') return this.status.get(id);

    for (const layerId of this._idLayer(d)) {
      if (this.map.getLayer(layerId)) {
        this.map.setLayoutProperty(layerId, 'visibility', aktif ? 'visible' : 'none');
      }
    }
    return 'siap';
  }

  _idLayer(d) {
    return d.geom === 'line' ? [`lyr-${d.id}`, `lyr-${d.id}-halo`] : [`lyr-${d.id}`];
  }

  _tambahWms(d) {
    try {
      this.map.addSource(`src-${d.id}`, {
        type: 'raster',
        tiles: [urlWms(d.typeName)],
        tileSize: 256,
      });
      this.map.addLayer(
        {
          id: `lyr-${d.id}`,
          type: 'raster',
          source: `src-${d.id}`,
          layout: { visibility: 'none' },
          paint: { 'raster-opacity': 0.85 },
        },
        this._sebelum()
      );
      return true;
    } catch (err) {
      console.warn(`[layer ${d.id}]`, err.message);
      return false;
    }
  }

  async _tambahWfs(d) {
    let data;
    try {
      const res = await fetch(urlWfs(d.typeName));
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      data = await res.json();
    } catch (err) {
      console.warn(`[layer ${d.id}] tidak bisa dimuat dari GeoServer:`, err.message);
      return false;
    }

    if (!data?.features?.length) {
      console.warn(`[layer ${d.id}] kosong di GeoServer`);
      return false;
    }

    this.map.addSource(`src-${d.id}`, { type: 'geojson', data });

    if (d.geom === 'line') {
      // Halo gelap di bawah garis supaya tetap terbaca di atas splat
      // dan di atas citra satelit yang ramai.
      this.map.addLayer(
        {
          id: `lyr-${d.id}-halo`,
          type: 'line',
          source: `src-${d.id}`,
          layout: { visibility: 'none', 'line-cap': 'round', 'line-join': 'round' },
          paint: {
            'line-color': '#0a0e14',
            'line-width': (d.lebar || 2) + 3,
            'line-opacity': 0.5,
          },
        },
        this._sebelum()
      );
      this.map.addLayer(
        {
          id: `lyr-${d.id}`,
          type: 'line',
          source: `src-${d.id}`,
          layout: { visibility: 'none', 'line-cap': 'round', 'line-join': 'round' },
          paint: { 'line-color': d.warna, 'line-width': d.lebar || 2 },
        },
        this._sebelum()
      );
    } else {
      this.map.addLayer(
        {
          id: `lyr-${d.id}`,
          type: 'circle',
          source: `src-${d.id}`,
          layout: { visibility: 'none' },
          paint: {
            'circle-radius': ['interpolate', ['linear'], ['zoom'], 14, 2, 18, 5],
            'circle-color': d.warna,
            'circle-stroke-width': 1,
            'circle-stroke-color': '#0a0e14',
          },
        },
        this._sebelum()
      );
    }
    return true;
  }

  /** Sisipkan di bawah layer gedung, supaya bounding box tetap di atas. */
  _sebelum() {
    for (const id of ['bangunan-bbox', 'bangunan-3d', 'bangunan-fill']) {
      if (this.map.getLayer(id)) return id;
    }
    return undefined;
  }
}
