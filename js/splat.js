/**
 * Pembungkus maplibre-gl-splat.
 *
 * Catatan soal plugin ini (v0.2.9), supaya tidak bingung saat membaca kode:
 *
 * 1. Satu-satunya entry point terdokumentasi adalah GaussianSplatControl,
 *    dan control itu menggambar panel GUI-nya sendiri. Kita punya panel
 *    sendiri, jadi GUI-nya disembunyikan lewat CSS dan kita hanya memanggil
 *    loadSplat / removeAllSplats secara programatik.
 *
 * 2. Tidak ada API terdokumentasi untuk mengubah posisi, rotasi, atau skala
 *    setelah splat dimuat. Posisinya sekarang fix dan dikirim sekali lewat
 *    opsi loadSplat, jadi itu tidak jadi masalah lagi.
 *
 * 3. Opasitas juga bukan opsi loadSplat. setOpacity() di bawah menebak
 *    struktur internal plugin untuk mencari SplatMesh-nya. Kalau tidak
 *    ketemu, ia mengembalikan false dan panel menonaktifkan slidernya,
 *    bukan diam-diam tidak melakukan apa pun.
 */

import { SPLAT, transformSplat, urlBerversi } from './config.js';

const CDN = 'maplibre-gl-splat';

export class Splat {
  constructor(map) {
    this.map = map;
    this.control = null;
    this.layerId = null;
    this.tersedia = false;
    this.galat = null;
    this._pendengar = {};
  }

  on(nama, fn) {
    (this._pendengar[nama] ||= []).push(fn);
    return this;
  }

  _pancar(nama, data) {
    for (const fn of this._pendengar[nama] || []) fn(data);
  }

  /**
   * Muat plugin dari CDN. Dibuat dynamic import supaya kegagalan jaringan
   * tidak ikut menjatuhkan peta dan layer GeoServer -- tanpa ini, satu
   * import statis yang gagal akan membatalkan seluruh modul.
   */
  async siapkan() {
    try {
      const { GaussianSplatControl } = await import(CDN);
      this.control = new GaussianSplatControl({
        collapsed: true,
        loadDefaultUrl: false,
        flyTo: false,
      });
      this.map.addControl(this.control, 'top-right');

      this.control.on?.('error', (e) => {
        this.galat = e?.message || String(e);
        this._pancar('galat', this.galat);
      });

      this.tersedia = true;
      return true;
    } catch (err) {
      this.galat = `plugin splat gagal dimuat: ${err.message}`;
      console.warn('[splat]', this.galat);
      this._pancar('galat', this.galat);
      return false;
    }
  }

  /**
   * Muat splat pada posisi tetapnya.
   *
   * Splat lama dibuang SEBELUM yang baru dimuat, bukan sesudah. Menahan
   * dua set gaussian di memori video sekaligus bisa membuat laptop
   * kehabisan VRAM.
   */
  async muat() {
    if (!this.tersedia) return false;

    const def = SPLAT;

    this._pancar('mulai', { def });
    const t0 = performance.now();

    try {
      // Pemeriksaan awal. Tanpa ini, file yang tidak ada akan membuat
      // spark melempar error di luar rantai promise loadSplat, sehingga
      // lolos dari try/catch ini dan muncul sebagai "uncaught in promise"
      // -- sementara UI tetap mengira pemuatan berhasil.
      //
      // no-store wajib di sini. Tanpa itu HEAD-nya sendiri bisa dijawab
      // dari cache, lengkap dengan ETag lama, dan cap versi di bawah
      // tidak pernah ikut berubah.
      const cek = await fetch(def.url, { method: 'HEAD', cache: 'no-store' });
      if (!cek.ok) throw new Error(`HTTP ${cek.status}`);

      // Cap versi dari balasan HEAD tadi, supaya model yang baru dilatih
      // benar-benar terunduh dan bukan diambil dari cache setahun.
      const url = urlBerversi(def.url, cek);

      this.control.removeAllSplats?.();
      this.layerId = null;

      this.layerId = await this.control.loadSplat(url, transformSplat());

      const detik = (performance.now() - t0) / 1000;
      this._pancar('selesai', { def, detik });
      return true;
    } catch (err) {
      // Berkas .sog ikut repo, jadi 404 di sini bukan lagi "belum
      // disalin dari drive". Yang tersisa sebagai penyebab: clone-nya
      // tidak utuh, atau .gitignore disetel ulang dan berkasnya ikut
      // tersaring. Pesannya dibuat spesifik supaya tidak dikira masalah
      // plugin.
      this.layerId = null;
      this.galat =
        err.message === 'HTTP 404'
          ? `file ${def.url} tidak ada padahal ikut repo. Periksa clone Anda utuh, ` +
            'dan `git check-ignore -v ' + def.url + '` tidak menyaringnya'
          : `gagal memuat ${def.url} (${err.message})`;
      console.warn('[splat]', this.galat);
      this._pancar('galat', this.galat);
      return false;
    }
  }

  /** Sembunyikan atau tampilkan splat tanpa membuangnya dari memori. */
  async setTampil(tampil) {
    if (!this.tersedia) return;
    if (tampil) {
      if (!this.layerId) await this.muat();
    } else if (this.layerId) {
      this.control.removeAllSplats?.();
      this.layerId = null;
    }
  }

  /**
   * Coba setel opasitas. Mengembalikan true kalau berhasil menemukan
   * mesh-nya, false kalau struktur internal plugin tidak seperti dugaan.
   */
  setOpacity(nilai) {
    const mesh = this._cariMesh();
    if (!mesh) return false;
    mesh.opacity = nilai;
    this.map.triggerRepaint();
    return true;
  }

  /**
   * Cari SplatMesh three.js milik splat yang aktif.
   *
   * Plugin menyimpannya di `_splatLayers`, sebuah Map dari layerId ke
   * { id, url, mesh, rtcGroup, longitude, latitude, altitude }. Itu
   * properti privat dan tidak terdokumentasi, jadi diakses dengan
   * optional chaining dan ada penelusuran cadangan di bawahnya.
   * Kalau versi plugin naik, inilah yang pertama patah.
   */
  _cariMesh() {
    if (!this.control) return null;

    const peta = this.control._splatLayers;
    if (peta instanceof Map) {
      const entri = this.layerId ? peta.get(this.layerId) : [...peta.values()][0];
      if (entri?.mesh) return entri.mesh;
    }

    // Cadangan: telusuri satu tingkat kalau nama propertinya berubah.
    const cocok = (v) =>
      v && typeof v === 'object' && v.isObject3D === true && 'opacity' in v ? v : null;

    for (const nilai of Object.values(this.control)) {
      if (!nilai || typeof nilai !== 'object') continue;
      const kandidat = nilai instanceof Map ? [...nilai.values()] : Array.isArray(nilai) ? nilai : [nilai];
      for (const k of kandidat) {
        if (cocok(k)) return k;
        if (k && typeof k === 'object') {
          for (const dalam of Object.values(k)) {
            if (cocok(dalam)) return dalam;
          }
        }
      }
    }
    return null;
  }
}
