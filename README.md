# KampusTwin FTSPK

WebGIS digital twin Fakultas Teknik Sipil, Perencanaan, dan Kebumian (FTSPK) ITS.
Tugas kelompok mata kuliah Sistem Informasi Geospasial Berbasis Web.

Tampilan 3D utamanya memakai Gaussian splatting hasil pemotretan drone,
bukan model LOD, karena itulah data 3D yang tersedia.

## Status fitur

| Fitur | Keadaan |
| --- | --- |
| Peta 3D gelap, panel kontrol kanan | jalan |
| Gaussian splatting (SOG) di atas peta | jalan |
| Pilihan kualitas splat ringan / penuh | jalan |
| Tiga mode tampilan: Splat 3D, Blok 3D, 2D | jalan |
| Layer jalan, sungai, elevasi dari GeoServer | jalan, menunggu data dipublikasikan |
| Klik gedung untuk info departemen | jalan, menunggu footprint didigitasi |
| Georeferensi splat (Helmert 7 parameter) | alat siap, menunggu data COLMAP |
| Bounding box gedung di atas splat | Tahap 2 |
| Simulasi banjir, kebakaran, jalur evakuasi | Tahap 3 |

## Techstack

| Lapisan | Teknologi |
| --- | --- |
| Front end | HTML, CSS, JavaScript ES module, MapLibre GL JS, maplibre-gl-splat |
| Back end | GeoServer, PostgreSQL + PostGIS |
| Data | QGIS, OpenStreetMap, DEMNAS, Open-Meteo |
| Alat georeferensi | Python (numpy, pyproj), PlayCanvas splat-transform |

Tanpa build step. Tidak perlu Node untuk menjalankan, cukup buka lewat
XAMPP atau Live Server. Node hanya dibutuhkan untuk membuat file splat.

## Struktur folder

```
index.html          halaman utama
css/style.css       tema gelap, token warna di :root
js/                 modul ES, lihat tabel di bawah
sql/                skrip database PostGIS
tools/              alat georeferensi splat
geoserver/sld/      style layer untuk GeoServer
data/splat/         file .sog hasil bake (tidak masuk git)
Perlogoan/          logo ITS dan Teknik Geomatika
docs/               blueprint dan laporan
models/             model glTF, kalau nanti ada LOD 2 dan 3
```

### Modul JavaScript

| File | Tanggung jawab |
| --- | --- |
| `js/main.js` | entry point, merangkai semua modul |
| `js/config.js` | semua konstanta yang perlu disesuaikan |
| `js/mercator.js` | faktor skala Mercator dan penjelasan frame plugin |
| `js/map.js` | init MapLibre dan pergantian basemap |
| `js/splat.js` | pembungkus maplibre-gl-splat |
| `js/layers.js` | layer WFS dan WMS dari GeoServer |
| `js/buildings.js` | tiga mode render gedung dan popup |
| `js/panel.js` | wiring panel kontrol |

## Cara menjalankan (lokal)

1. Buat database `ftspk_twin`, jalankan `sql/01_schema.sql` lalu
   `sql/02_splat_georef.sql`.
2. Impor data lewat PostGIS Shapefile Import.
3. Di GeoServer buat workspace `ftspk`, store PostGIS `ftspk_db`, dan
   publikasikan layer `bangunan`, `jalan`, `sungai`, `elevasi`, serta
   view `v_bangunan_info`.
4. Salin `splatftspk.sog` dari drive kelompok ke akar proyek, lalu ikuti
   `tools/README.md` untuk menghasilkan `data/splat/`.
5. Taruh proyek di `htdocs`, nyalakan Apache XAMPP, buka
   `http://localhost/kampustwin-ftspk/`.

Pakai Apache, bukan Live Server, untuk file splat. `.htaccess` sudah
mengatur MIME type `.sog` dan proxy `/geoserver`. Live Server
menyajikan `.sog` dengan MIME yang salah.

Tambahkan `?dev=1` di URL untuk membuka panel kalibrasi splat.

## Catatan penting soal file splat

**File `.sog` wajib versi 2.** Spark 0.1.10, yang dipakai
maplibre-gl-splat 0.2.9, menolak SOG v3 dengan pesan
`Invalid PC SOGS zip file`. File asli dari splat-transform v3 harus
dikonversi dengan `--sog-version 2`. Skrip `tools/bake.ps1` sudah
melakukannya.

**File splat tidak masuk git.** Ukurannya 11 sampai 33 MB dan akan
tertinggal selamanya di history setiap clone. Bagikan lewat drive
kelompok.

**Versi plugin dipin tepat di 0.2.9.** Arti opsi `scale` bergantung pada
sebuah bug di versi itu. Penjelasannya ada di `js/mercator.js`.

## Anggota kelompok

- [Nama anggota 1]
- [Nama anggota 2]
- [Nama anggota 3]
- [Nama anggota 4]
