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
 * Posisi splat di peta. SUDAH FIX — jangan diubah tanpa mengukur ulang.
 *
 * Angka ini hasil kalibrasi manual di atas peta, 25 November 2026,
 * metode `kalibrasi_manual_di_peta`. Dulu dibaca saat jalan dari
 * data/georef.json yang ditulis panel "Posisi splat"; panel itu, berkas
 * itu, dan endpoint PHP penyimpannya sudah dicabut sekarang karena
 * posisinya tidak berubah lagi. Nilainya dipindah ke sini apa adanya,
 * jadi tampilannya persis sama dengan sebelum pencabutan.
 *
 * Yang perlu diingat kalau suatu saat diutak-atik lagi:
 *
 *   rotation  derajat, Euler XYZ milik plugin — BUKAN ZYX milik
 *             `splat-transform -r`. Jangan menyalin triple dari satu
 *             alat ke alat lain tanpa dikonversi.
 *   scale     bukan meter. Karena bug di plugin v0.2.9, scale s berarti
 *             sekitar s x 38,78 m per unit model di lintang ini.
 *             Penjelasannya di js/mercator.js.
 *   altitude  meter, negatif berarti splat diturunkan supaya permukaan
 *             tanahnya duduk di bidang nol, menyamai blok gedung.
 *
 * Cara mengukur ulangnya ada di tools/README.md. Jangan memakai
 * means.mins/maxs di meta.json untuk menebak ukuran — itu rentang
 * pendekodean domain-log, bukan posisi linear.
 */
export const GEOREF = Object.freeze({
  longitude: 112.7940232242725,
  latitude: -7.28065136184962,
  altitude: -22.5,
  rotation: Object.freeze([-91.5, -96, 0]),
  scale: 1.1831,
});

/**
 * Berkas splat. Cuma satu, dan selalu kualitas penuh.
 *
 * Dulu ada dua: penuh dan versi decimate 800 ribu gaussian yang bisa
 * dipilih di panel. Pilihan itu dicabut — yang tampil sekarang selalu
 * yang penuh, jumlah dan susunan gaussian-nya persis sama dengan hasil
 * export SuperSplat di splatftspk.html, jadi tampilannya juga sama.
 * Berat gambarnya tidak ditentukan oleh jumlah gaussian melainkan oleh
 * jumlah piksel yang harus dibayar tiap bingkai; itu diurus di
 * js/map.js, bukan dengan membuang data.
 *
 * Hasil konversi splatftspk.sog ke SOG v2, tanpa decimate dan tanpa
 * filter:
 *
 *   npx @playcanvas/splat-transform@3.12.0 splatftspk.sog \
 *       data/splat/ftspk-penuh.sog --sog-version 2 -w
 *
 * Versi 2 wajib. Berkas asli adalah SOG v3, dan spark 0.1.10 -- yang
 * dipakai maplibre-gl-splat 0.2.9 -- menolaknya dengan "Invalid PC SOGS
 * zip file" karena hanya mengenali versi 1 dan 2. `-w` juga wajib: tanpa
 * itu splat-transform menolak menimpa berkas lama sambil tetap keluar
 * dengan kode 0, jadi konversinya gagal tanpa kelihatan gagal.
 *
 * Berkas ini satu-satunya .sog yang ikut git, supaya siapa pun yang
 * clone langsung melihat splat yang sama di posisi yang sama. Sumbernya,
 * splatftspk.sog, tetap di drive kelompok. Lihat .gitignore.
 */
export const SPLAT = {
  url: 'data/splat/ftspk-penuh.sog',
  jumlah: 2253073,
  ukuran: '~30 MB',
};

/**
 * Tempelkan cap versi ke URL berkas splat.
 *
 * Berkas .sog disajikan dengan `Cache-Control: immutable` selama setahun
 * (lihat .htaccess), dan itu disengaja: ukurannya puluhan megabita dan
 * itulah yang membuat ganti kualitas terasa instan. Tapi namanya tidak
 * ikut berubah waktu modelnya dilatih ulang, jadi tanpa cap versi
 * peramban terus menyajikan salinan lama -- dan menekan refresh tidak
 * menolong, karena "immutable" justru berarti jangan diperiksa lagi.
 *
 * Capnya dibaca dari ETag atau Last-Modified pada balasan HEAD yang
 * memang sudah dilakukan sebelum memuat, jadi tidak ada permintaan
 * tambahan. Berkas diganti, cap berubah, URL berubah, unduhan barunya
 * jalan sendiri. Berkas sama, URL sama, cache panjangnya tetap bekerja.
 *
 * @param {string} url      path berkas .sog
 * @param {Response} balasan hasil fetch HEAD atas url itu
 */
export function urlBerversi(url, balasan) {
  const cap = balasan.headers.get('etag') || balasan.headers.get('last-modified');
  if (!cap) return url;
  /* ETag datang berkutip dan Last-Modified penuh spasi serta koma;
     keduanya tidak aman ditaruh mentah-mentah di query. */
  const bersih = cap.replace(/[^A-Za-z0-9]/g, '').slice(-20);
  return bersih ? `${url}?v=${bersih}` : url;
}

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
    longitude: GEOREF.longitude,
    latitude: GEOREF.latitude,
    altitude: GEOREF.altitude,
    rotation: [...GEOREF.rotation],
    scale: GEOREF.scale,
  };
}

/**
 * Skala runtime seandainya file .sog sudah di-bake ke meter ENU lewat
 * tools/bake.ps1. Tidak dipakai jalur kalibrasi manual, tapi disimpan
 * di sini supaya jalur COLMAP tetap terdokumentasi.
 */
export function skalaUntukSplatMetrik() {
  return projectedUnitsPerMeter(GEOREF.latitude);
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
