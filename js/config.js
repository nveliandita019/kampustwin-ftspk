/**
 * Konstanta proyek. Semua yang perlu disesuaikan per mesin atau per data
 * ada di file ini, supaya modul lain tidak perlu diubah.
 */

import { projectedUnitsPerMeter } from './mercator.js';

/**
 * Base GeoServer.
 *
 * Dipanggil langsung lintas origin (halaman di port 80, GeoServer di
 * 8080), jadi CORS di GeoServer HARUS aktif. Caranya ada di
 * geoserver/README.md -- dan perhatikan bahwa blok CORS bawaan di
 * web.xml memakai kelas Tomcat yang tidak ada di GeoServer berbasis
 * Jetty, jadi tidak bisa sekadar dilepas komentarnya.
 *
 * Kalau Anda memilih memakai proxy Apache (ProxyPass di httpd.conf,
 * bukan di .htaccess), ganti nilai ini kembali jadi '/geoserver'.
 */
export const GEOSERVER = 'http://localhost:8080/geoserver';

/** Workspace GeoServer. */
export const WORKSPACE = 'ftspk';

/** Titik awal kamera. Sesuaikan ke tengah FTSPK. */
export const PUSAT = [112.795, -7.282];
export const ZOOM_AWAL = 16.5;
export const PITCH_AWAL = 55;
export const BEARING_AWAL = -20;

/**
 * Rotasi ENU -> frame dunia plugin.
 *
 * Frame plugin adalah +X barat, +Y selatan, +Z atas, jadi dari ENU
 * (timur, utara, atas) cukup diputar 180 derajat di sumbu Z.
 * Penurunannya ada di js/mercator.js.
 *
 * PENTING: [0,0,0] bukan "tanpa rotasi". Array yang truthy membuat
 * plugin MELEWATI rotasi default-nya sendiri (rotateX 90, rotateY 180),
 * jadi [0,0,0] tetap sebuah pilihan frame, bukan netral.
 *
 * Plugin memakai Euler XYZ (rotateX lalu rotateY lalu rotateZ, lokal),
 * sementara `splat-transform -r` memakai ZYX. Dua alat, dua urutan.
 * Jangan menyalin triple dari satu ke yang lain tanpa dikonversi.
 */
export const ROTASI_ENU = [0, 0, 180];

/**
 * Parameter georeferensi splat.
 *
 * `dibake: false` berarti file .sog masih frame mentah hasil training:
 * belum metrik, belum berorientasi utara. Dalam keadaan itu `scale`
 * hanya angka coba-coba supaya splat kelihatan, dan posisinya tidak
 * berarti apa-apa secara geodetik.
 *
 * Setelah `tools/georef_colmap.py` menghasilkan s/R/t dan transform
 * di-bake ke .sog dengan `tools/bake.ps1`, setel `dibake: true`.
 * Mulai saat itu splat sudah dalam meter ENU, sehingga rotasi runtime
 * tinggal ROTASI_ENU dan skalanya faktor Mercator murni.
 */
export const GEOREF = {
  dibake: false,
  lon: PUSAT[0],
  lat: PUSAT[1],
  alt: 0,
  rmse_m: null,
  rmse_validasi_m: null,

  /**
   * Rotasi dan skala sementara, hasil kalibrasi visual di browser
   * (bukan hasil hitungan). Keduanya hanya supaya splat terlihat wajar
   * sebelum solve Umeyama dijalankan.
   *
   * rotasiMentah [-90,0,0]: splat hasil training punya sumbu Y sebagai
   * vertikal, sementara frame plugin memakai Z sebagai atas. Tanpa
   * putaran ini splat berdiri tegak seperti papan, bukan terhampar.
   *
   * skalaMentah 0.43: bounding box splat terukur 12,05 x 2,56 x 13,58
   * unit, dan 1 unit = 38,78 m pada lintang ini, jadi scale 1 memberi
   * bentangan 467 m. Nilai 0,43 mendekatkannya ke ~200 m, kira-kira
   * ukuran kompleks FTSPK. Ini TEBAKAN, bukan ukuran.
   *
   * Catatan: jangan memakai means.mins/maxs di meta.json untuk menebak
   * ukuran. Itu rentang pendekodean domain-log, bukan posisi linear.
   * Bentangan sesungguhnya dibaca dari mesh.getBoundingBox().
   *
   * Arah utara (putaran di sumbu Z) sengaja dibiarkan 0, karena tidak
   * ada gunanya ditebak -- itu justru yang dihitung oleh solve.
   */
  rotasiMentah: [-90, 0, 0],
  skalaMentah: 0.43,
};

/**
 * Dua versi file splat. Yang ringan jadi default supaya laptop kelas
 * menengah dan HP tidak langsung tersedak 33 MB.
 *
 * File .sog tidak masuk git (lihat .gitignore). Ambil dari drive kelompok
 * dan taruh sesuai path di bawah. Cara membuatnya ada di tools/README.md.
 */
export const SPLAT = {
  ringan: {
    url: 'data/splat/ftspk-ringan.sog',
    label: 'Ringan',
    jumlah: 800000,
    ukuran: '~12 MB',
  },
  // Menunjuk ke hasil bake, BUKAN ke splatftspk.sog di akar proyek.
  // File asli itu SOG versi 3, dan spark 0.1.10 menolaknya dengan
  // "Invalid PC SOGS zip file". tools/bake.ps1 mengeluarkan versi 2.
  penuh: {
    url: 'data/splat/ftspk-penuh.sog',
    label: 'Penuh',
    jumlah: 2283590,
    ukuran: '~33 MB',
  },
};

export const KUALITAS_AWAL = 'ringan';

/**
 * Layer dari GeoServer.
 *
 * `bangunan` tidak ada di daftar ini karena ditangani khusus oleh
 * js/buildings.js (punya tiga mode render dan popup sendiri).
 *
 * Layer yang belum dipublikasikan di GeoServer akan gagal dimuat dan
 * checkbox-nya otomatis dinonaktifkan, bukan membuat error di console.
 */
export const LAYERS = [
  {
    id: 'jalan',
    nama: 'Jalan',
    tipe: 'wfs',
    typeName: `${WORKSPACE}:jalan`,
    geom: 'line',
    warna: '#f5a524',
    lebar: 2,
    aktif: false,
  },
  {
    id: 'sungai',
    nama: 'Sungai',
    tipe: 'wfs',
    typeName: `${WORKSPACE}:sungai`,
    geom: 'line',
    warna: '#3b9eff',
    lebar: 3,
    aktif: false,
  },
  {
    id: 'elevasi',
    nama: 'Titik elevasi',
    tipe: 'wfs',
    typeName: `${WORKSPACE}:elevasi`,
    geom: 'circle',
    warna: '#22c55e',
    aktif: false,
  },
  {
    id: 'orthofoto',
    nama: 'Orthofoto',
    tipe: 'wms',
    typeName: `${WORKSPACE}:orthofoto`,
    aktif: false,
    catatan: 'belum dipublikasikan',
  },
];

/**
 * Transform runtime yang dikirim ke loadSplat().
 *
 * Dipisahkan dari GEOREF supaya aturan "mentah vs sudah di-bake" ada
 * di satu tempat, bukan tersebar di pemanggilan.
 */
export function transformSplat() {
  return {
    longitude: GEOREF.lon,
    latitude: GEOREF.lat,
    altitude: GEOREF.alt,
    rotation: GEOREF.dibake ? ROTASI_ENU : GEOREF.rotasiMentah,
    scale: GEOREF.dibake ? projectedUnitsPerMeter(GEOREF.lat) : GEOREF.skalaMentah,
  };
}

/** URL WFS GeoJSON untuk satu typeName. */
export function urlWfs(typeName) {
  const q = new URLSearchParams({
    service: 'WFS',
    version: '1.0.0',
    request: 'GetFeature',
    typeName,
    outputFormat: 'application/json',
    srsName: 'EPSG:4326',
  });
  return `${GEOSERVER}/${WORKSPACE}/ows?${q}`;
}

/** Template tile WMS untuk satu typeName. */
export function urlWms(typeName) {
  const q = new URLSearchParams({
    service: 'WMS',
    version: '1.1.1',
    request: 'GetMap',
    layers: typeName,
    format: 'image/png',
    transparent: 'true',
    srs: 'EPSG:3857',
    width: '256',
    height: '256',
  });
  return `${GEOSERVER}/${WORKSPACE}/wms?${q}&bbox={bbox-epsg-3857}`;
}
