# KampusTwin FTSPK

WebGIS digital twin Fakultas Teknik Sipil, Perencanaan, dan Kebumian (FTSPK) ITS.
Tugas kelompok mata kuliah Sistem Informasi Geospasial Berbasis Web.

## Fitur yang direncanakan
- Peta 3D gedung dengan pilihan LOD 1, LOD 2, LOD 3
- Layer orthofoto, DSM, dan DEM
- Klik gedung untuk informasi departemen (web dan Instagram resmi)
- Simulasi kendaraan, banjir, dan cuaca (suhu, angin)

## Techstack
| Lapisan | Teknologi |
| --- | --- |
| Front end | HTML, CSS, JavaScript, Bootstrap 5, MapLibre GL JS, plugin peta |
| Back end | GeoServer, PostgreSQL + PostGIS |
| Data | QGIS, OpenStreetMap, DEMNAS, Open-Meteo |

## Struktur folder
```
index.html        halaman utama
css/              gaya tampilan
js/               kode peta dan fitur
sql/              skrip database PostGIS
geoserver/sld/    style layer untuk GeoServer
data/             data kecil (data besar jangan di-commit)
models/           model glTF untuk LOD 2 dan LOD 3
docs/             blueprint dan laporan
```

## Cara menjalankan (lokal)
1. Buat database `ftspk_twin`, jalankan `sql/01_schema.sql`.
2. Impor data lewat PostGIS Shapefile Import.
3. Di GeoServer buat workspace `ftspk`, store PostGIS, dan publikasikan layer `bangunan`.
4. Atur CORS di GeoServer, atau jalankan lewat Live Server dengan proxy `/geoserver`.
5. Buka `index.html` dengan Live Server di VS Code.

## Anggota kelompok
- [Nama anggota 1]
- [Nama anggota 2]
- [Nama anggota 3]
- [Nama anggota 4]
