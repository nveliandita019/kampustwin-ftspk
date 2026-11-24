# GeoServer

- Workspace: `ftspk`
- Store PostGIS: `ftspk_db` (database `ftspk_twin`)
- Layer: `bangunan`, `jalan`, `sungai`, `elevasi`
- View: `v_bangunan_info` (join bangunan ke departemen, untuk popup)
- Style: `sld/bangunan_fungsi.sld`

Front end memanggil GeoServer langsung di `http://localhost:8080/geoserver`
(lihat `GEOSERVER` di `js/config.js`), jadi CORS harus aktif.

## Keadaan sekarang

Per pemeriksaan terakhir, GeoServer sudah berjalan di port 8080, tapi:

- **Workspace `ftspk` belum ada.** Yang terdaftar baru data demo bawaan:
  `ne`, `nurc`, `sf`, `sigweb`, `tiger`, `topp`. Selama workspace ini
  belum dibuat, layer di panel peta tidak akan muncul, apa pun status
  CORS-nya.
- **CORS belum aktif.** Permintaan dengan header `Origin` tidak dibalas
  header `Access-Control-Allow-Origin`.

## Mengaktifkan CORS

Ikuti `cors-web.xml.txt` di folder ini.

Jangan sekadar melepas komentar blok CORS bawaan di `web.xml`. Blok itu
memakai `org.apache.catalina.filters.CorsFilter`, kelas milik Tomcat,
sedangkan GeoServer di sini berjalan di atas Jetty 12. Melepas
komentarnya membuat GeoServer gagal start. Kelas yang benar adalah
`org.eclipse.jetty.ee11.servlets.CrossOriginFilter`, dan nama
parameternya pun berbeda.

Alternatif tanpa menyentuh GeoServer: pasang `ProxyPass` di `httpd.conf`
XAMPP (bukan di `.htaccess`, di sana tidak diizinkan), lalu kembalikan
`GEOSERVER` di `js/config.js` jadi `'/geoserver'`. Keterangannya ada di
`.htaccess`.

## Membuat workspace dan layer

1. Buka `http://localhost:8080/geoserver/web/`, masuk sebagai admin.
2. Data > Workspaces > Add new workspace. Name `ftspk`, Namespace URI
   bebas, misalnya `http://ftspk.its.ac.id`.
3. Data > Stores > Add new Store > PostGIS. Workspace `ftspk`, Data
   Source Name `ftspk_db`, database `ftspk_twin`, host `localhost`,
   port `5432`, isi user dan password.
4. Publikasikan `bangunan`, `jalan`, `sungai`, `elevasi`, dan view
   `v_bangunan_info`. Untuk tiap layer tekan **Compute from data** dan
   **Compute from native bounds**, lalu set Declared SRS `EPSG:4326`.
5. Terapkan style `sld/bangunan_fungsi.sld` ke layer `bangunan`.

Tabelnya dibuat oleh `sql/01_schema.sql` dan `sql/02_splat_georef.sql`,
tapi isinya masih kosong sampai footprint gedung didigitasi di QGIS dan
diimpor ke PostGIS.

## Memeriksa hasilnya

```powershell
curl "http://localhost:8080/geoserver/ows?service=WFS&version=1.0.0&request=GetCapabilities"
```

Harus memuat `ftspk:bangunan` dan kawan-kawannya.

Catatan: URL WFS di `js/config.js` memakai **versi 1.0.0**. Jangan
diganti ke 1.1.0 atau 2.0.0 tanpa alasan — kedua versi itu membalik
urutan sumbu jadi lat,lon, dan gedung Anda akan mendarat di lepas pantai
Somalia.
