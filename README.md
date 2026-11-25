# KampusTwin FTSPK

WebGIS digital twin Fakultas Teknik Sipil, Perencanaan, dan Kebumian (FTSPK) ITS.
Tugas kelompok mata kuliah Sistem Informasi Geospasial Berbasis Web.

Tampilan 3D utamanya memakai Gaussian splatting hasil pemotretan drone,
bukan model LOD, karena itulah data 3D yang tersedia.

## Status fitur

| Fitur | Keadaan |
| --- | --- |
| Logo ITS 3D di halaman depan, bisa diputar | jalan |
| Model Gedung Rektorat 3D, tiga ragam gambar | jalan |
| Profil FT-SPK dan kartu enam departemen | jalan |
| Galeri foto kegiatan dan gedung FT-SPK | jalan, foto masih pinjam dari laman ITS |
| Tema putih-biru ITS di semua halaman | jalan |
| Peta 3D terang, panel kontrol kanan | jalan |
| Gaussian splatting (SOG) di atas peta | jalan |
| Kualitas penuh (2.253.073 splat), selalu, tanpa pilihan | jalan |
| Posisi splat fix sebagai konstanta, panel geser dicabut | jalan |
| Peta berhenti menggambar waktu tidak disentuh | jalan |
| Gerbang bingkai dan rasio piksel dibatasi (teknik SuperSplat) | jalan |
| Tiga mode tampilan: Splat 3D, Blok 3D, 2D | jalan |
| Layer jalan, sungai, elevasi dari GeoServer | jalan, menunggu data dipublikasikan |
| Klik gedung untuk info departemen | jalan, menunggu footprint didigitasi |
| Georeferensi splat (Helmert 7 parameter) | alat siap, menunggu data COLMAP |
| Bounding box gedung di atas splat | Tahap 2 |
| Simulasi banjir, kebakaran, jalur evakuasi | Tahap 3 |

## Techstack

| Lapisan | Teknologi |
| --- | --- |
| Front end | HTML, CSS, JavaScript ES module, MapLibre GL JS, maplibre-gl-splat, three.js |
| Back end | GeoServer, PostgreSQL + PostGIS |
| Data | QGIS, OpenStreetMap, DEMNAS, Open-Meteo |
| Alat georeferensi | Python (numpy, pyproj), PlayCanvas splat-transform |

Tanpa build step. Tidak perlu Node untuk menjalankan, cukup buka lewat
XAMPP atau Live Server. Node hanya dibutuhkan untuk membuat file splat.

## Struktur folder

```
index.html          halaman depan
peta.html           aplikasi peta 3D
css/tema.css        warna dan huruf, dipakai kedua halaman
css/beranda.css     tata letak halaman depan
css/style.css       tata letak aplikasi peta
js/                 modul ES, lihat tabel di bawah
gambar/             foto untuk galeri, sumbernya di gambar/SUMBER.md
sql/                skrip database PostGIS
tools/              alat georeferensi splat
geoserver/sld/      style layer untuk GeoServer
data/splat/         ftspk-penuh.sog, kualitas penuh, ikut repo
Perlogoan/          logo ITS dan Teknik Geomatika
docs/               blueprint dan laporan
models/             model glTF, kalau nanti ada LOD 2 dan 3
```

### Modul JavaScript

| File | Tanggung jawab |
| --- | --- |
| `js/beranda.js` | halaman depan: pita lekat, garis laju, paralaks, sorot kursor, penyingkapan, angka, penyalaan dua model |
| `js/logo3d.js` | logo ITS 3D, dibangun dari persamaan, pakai three.js |
| `js/hero3d.js` | Gedung Rektorat ITS 3D, tiga ragam gambar, pakai three.js |
| `js/main.js` | entry point aplikasi peta, merangkai semua modul |
| `js/config.js` | semua konstanta yang perlu disesuaikan |
| `js/mercator.js` | faktor skala Mercator dan penjelasan frame plugin |
| `js/map.js` | init MapLibre, pergantian basemap, gambar seperlunya |
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
4. Splat-nya sudah ada: `data/splat/ftspk-penuh.sog` ikut repo, jadi
   tidak ada yang perlu disalin. Hanya kalau Anda mau mengekspor ulang
   modelnya, salin `splatftspk.sog` dari drive kelompok ke akar proyek
   dan ikuti `tools/README.md`.
5. Taruh proyek di `htdocs`, nyalakan Apache XAMPP, buka
   `http://localhost/kampustwin-ftspk/` untuk halaman depan, atau
   `http://localhost/kampustwin-ftspk/peta.html` untuk langsung ke peta.

Pakai Apache, bukan Live Server, untuk file splat. `.htaccess` sudah
mengatur MIME type `.sog` dan proxy `/geoserver`. Live Server
menyajikan `.sog` dengan MIME yang salah.

## Tema

Birunya `#0067AE`, diambil langsung dari piksel logo ITS di
`Perlogoan/`, bukan ditebak. Semua warna dan huruf ada di
`css/tema.css`; jangan menulis hex di berkas CSS lain.

Aturan tampilannya: halaman meniru lembar peta. Latarnya graticule biru
samar, dan setiap pemisah adalah garis tipis biru, bukan kotak
berbayang. Kedalaman datang dari model 3D, bukan dari bayangan.

| Peran | Huruf | Alasan |
| --- | --- | --- |
| Judul | Newsreader | serif jurnal, nada akademik |
| Isi dan antarmuka | Plus Jakarta Sans | rancangan Tokotype, proyek Indonesia |
| Angka | JetBrains Mono | hanya untuk angka sungguhan: koordinat, jumlah splat |

### Dua model 3D

Keduanya dibangun dari persamaan, bukan dari berkas glTF, jadi tidak ada
aset yang perlu diunduh dan halaman depan tetap ringan. Kemulusannya
tinggal diatur lewat jumlah ruas lengkung dan ruas bevel.

**Logo ITS** (`js/logo3d.js`) di hero: roda gigi delapan gigi yang
dibelah vertikal jadi dua warna, teratai berbentuk cawan, dan tugu
beralur yang penampangnya bergelombang supaya alurnya terbaca waktu
cahaya bergeser. Tengah cincinnya kosong — tidak ada cakram di belakang
teratai, jadi halaman terlihat menembus lingkaran. Peta lingkungan untuk
pantulan di bevel digambar di kanvas, bukan diunduh.

Teratainya cawan sungguhan, bukan kipas kelopak yang dipipihkan: dua
lingkar berisi enam kelopak, yang dalam digeser setengah langkah, semua
melingkari satu sumbu tegak. Tugu menembus tepat di tengahnya, dari alas
bintang di bawah sampai pucuknya di atas bunga — kelopak terdekat kamera
menutupi sebagian batangnya, yang di seberangnya tertutup batang. Itu
yang membuat bentuknya tetap utuh dari sudut mana pun medali diputar.

Kelopaknya bukan lempeng yang dimiringkan, melainkan cangkang melengkung
yang diparameterkan dua arah: `t` dari pangkal ke ujung, `s` melintang.
Tiap `t` punya jari-jari, ketinggian, dan setengah-lebar sudutnya
sendiri, dan setengah-lebar itu nol di kedua ujung. Lengkung lebarnya
`sin(πt^0,62)` dipangkat 0,7 — tanpa pangkat itu kelopaknya meruncing
sejak tengah dan bunganya terbaca seperti kobaran api, bukan cawan.
Dibuat dua cangkang lalu dua tepi panjangnya dijahit, jadi kelopaknya
punya tebal.

Seluruh bunga digeser ke z = 0,135, di depan muka gir. Ini bukan soal
rasa: gir mengisi z dari −0,163 sampai 0,023, dan batang tugu di atas
lubang medali berada di jari-jari yang sama dengan bahan gir. Selama
bunganya di z = 0, pucuk tugu terkubur di dalam cincin dan hilang sama
sekali. Jari-jari batangnya 0,082, jadi sumbunya harus paling tidak di
0,023 + 0,082 = 0,105 supaya lewat di depan.

Alas di bawah bunga adalah lempeng berdenah bintang, bukan bintang yang
meruncing ke bawah. Dasarnya RATA dan dinding sampingnya tegak lurus —
pita putih itu yang terlihat jelas di bawah kelopak — dan hanya
permukaan atasnya yang berbentuk kerucut bersegi, naik ke satu titik di
tengah dengan rusuk memancar ke tiap ujung bintang. Rusuk itulah yang
memberi tiap lengan dua bidang terang dan gelap. Seluruh tepinya sama
tinggi: ujung dan cekungan bintang dua-duanya di `yTepi`, yang naik
hanya titik pusatnya.

Dua hal lain yang gampang terlanggar waktu ukurannya diubah:

- Enam kelopak kali lebar sudut harus melebihi 360°, kalau tidak cawannya
  menganga. Lingkar luar sekarang 6 × 60° = 360° pas.
- Semua ujung harus tetap di dalam lubang medali, 0,688 dari pusat.
  Yang paling gampang terlewat adalah sudut terjauh lempeng alas —
  ujung bintang pada tepi bawahnya — karena jaraknya ditentukan oleh
  `rLuar` dan `yBawah` sekaligus, bukan salah satunya. Sekarang
  hypot(0,295, 0,600) = 0,669. Lewat dari 0,688, sudut itu menembus
  cincin gir.

Tugunya sedikit lebih tebal dari hasil ukur logo datarnya (0,112 dan
0,082, bukan 0,088 dan 0,057). Di logo datar tugunya cuma garis; begitu
jadi benda yang menembus cawan teratai, batang setipis itu hilang di
antara kelopak.

Ukurannya tidak dikira-kira. Kontur `Perlogoan/logo-its-biru-transparan.png`
ditelusuri per setengah derajat lewat kanal alfanya, lalu jari-jarinya
dipakai langsung sebagai konstanta di kepala `js/logo3d.js`: delapan gigi
berjarak 45°, puncak gigi selebar 27°, dasar sela di 0,881, dua garis
lingkaran di 0,723 dan 0,688, dan tugu setinggi 0,945. Kalau logonya
suatu saat diganti, ukur ulang dengan cara yang sama.

Garis-garis pada logo datar dibuat sebagai relief, bukan sebagai gambar
yang ditempel: gir terdiri dari tiga cincin sepusat, dan yang tengah
lebih tipis, jadi di antara bingkai bergigi dan lingkaran dalam ada alur
cekung. Karena ketiganya sepusat pada tebalnya, muka belakang medali
punya alur yang sama.

**Gedung Rektorat** (`js/hero3d.js`) di bagian tampilan: bentuk dan
warnanya mengikuti tampak depan gedungnya — tiga lantai berdinding putih,
pita jendela hijau kebiruan, bidang tengah menjorok yang memanggul
lambang ITS, atap limas genting oranye dengan lantai jendela kecil di
puncaknya, dan tiang bendera di halaman muka. Sisi dan belakangnya tidak
ada di foto acuan, jadi disusun mengikuti irama muka; tinggi pita
jendelanya wajib sama persis, kalau tidak gedungnya terbaca seperti dua
bangunan berbeda. Tetap model ilustratif, bukan hasil ukur — yang hasil
ukur ada di peta.

Tiga hal yang gampang terlanggar waktu massanya diubah:

- Badannya dipecah tiga balok (dua sayap dan dinding yang mundur di
  tengah), bukan satu balok lebar. Teras masuk hanya bisa benar-benar
  menjorok kalau dindingnya memang tidak ada di situ.
- Panel kaca selalu sedikit menonjol dari dinding. Dibuat rata atau
  mundur, panelnya terkubur di dalam balok dinding dan tidak kelihatan
  sama sekali.
- Bahan yang bertekstur harus berwarna putih. Warna bahan dikalikan
  dengan teksturnya, jadi hijau kali hijau jadi hitam.

Atap limasnya ditulis sendiri sebagai delapan segitiga: `BoxGeometry`
jelas tidak bisa, dan `CylinderGeometry` bersegi empat cuma memberi limas
terpancung — bubungannya jadi bidang, bukan garis.

Ragam blok dan ragam titik tidak punya daftar massa sendiri. Keduanya
diturunkan dari geometri ragam padat: blok lewat `EdgesGeometry`, titik
lewat penyebaran acak di segitiga-segitiganya, ditimbang menurut luas
supaya bidang sempit tidak jadi sepadat bidang lebar. Titiknya mewarisi
warna bagian asalnya, jadi awan titiknya masih terbaca sebagai gedung
yang sama. Menambah satu massa cukup sekali, di `MASSA` atau `ATAP`.

Tiga tombol di bawahnya (padat, blok, titik) sengaja sejajar dengan tiga
mode di aplikasi peta. Baru dinyalakan ketika hampir masuk layar, dan
berhenti menggambar waktu keluar layar. Di layar di bawah 700 px tidak
dinyalakan sama sekali, supaya ponsel tidak memegang dua konteks WebGL
sekaligus.

### Isi halaman depan

Halaman depan berbicara tentang fakultasnya, bukan tentang cara
membuatnya. Angka dan keterangan yang dipakai — enam departemen, enam
program sarjana dan sembilan program pascasarjana, akreditasi Unggul —
dirangkum dari laman resmi
<https://www.its.ac.id/fakultas/ftspk/profil/>. Kalau datanya berubah,
ubah di `index.html`; tidak ada tempat lain yang menyimpannya.

Istilah teknis sengaja tidak dibawa ke sini. Jumlah splat, ukuran berkas,
dan tahapan dari drone ke peramban semuanya dibuang: itu urusan
`peta.html` dan README ini, bukan urusan pengunjung yang baru mau
mengenal FT-SPK.

### Foto

Dua asal, dua aturan pakai, tercatat di `gambar/SUMBER.md`. Sebagian
foto dipinjam dari laman resmi departemen di its.ac.id — hak ciptanya
milik ITS, dipakai untuk tugas kuliah tentang fakultas itu sendiri, dan
**harus diganti dengan foto kelompok sendiri sebelum halaman ini dipasang
di luar kampus**. Sisanya dari Wikimedia Commons; nama pemotretnya wajib
tetap tampil di kaki halaman.

Yang dipilih cuma foto alat, ruang, gedung, dan orang yang tidak terlihat
wajahnya. Foto rapat dan foto bersama dilewati.

Semua foto memakai satu perlakuan: dipotong ke bingkai, satu lapis
gradasi biru di atasnya, keterangan putih di kaki. Gradasinya bukan
hiasan — foto siang dan foto malam dari sumber yang berbeda jadi terbaca
sebagai satu kelompok, dan teks putih di atasnya selalu cukup kontras.

### Gerakan

Animasinya sengaja **tidak** dimatikan waktu sistem mengirim
`prefers-reduced-motion: reduce`. Windows mengirim sinyal itu begitu
"Show animations in Windows" dipadamkan di Settings, sering tanpa
disadari pemiliknya, dan halaman ini tetap harus hidup di laptop
tersebut. Yang dikurangi hanya jarak dan lamanya: tidak ada lagi yang
meluncur jauh, semuanya selesai cepat, dan tidak ada satu pun isi yang
tertinggal tak terlihat. Angkanya terkumpul di satu tempat, di
`:root` paling atas `css/beranda.css`.

Penyingkapan saat gulir baru dinyalakan setelah `<html>` mendapat kelas
`js`. Kalau JavaScript mati, kelasnya tidak pernah terpasang dan seluruh
isi halaman langsung terlihat.

Satu-satunya yang benar-benar dipadamkan adalah paralaks pada foto,
karena gerakannya terikat posisi gulir dan tidak punya "versi pendek".
Itu diurus `js/beranda.js`, bukan CSS.

Pita lekat, garis laju di tepi atas, dan geser paralaks sama-sama
bergantung pada posisi gulir, jadi ketiganya dihitung sekali per bingkai
dari satu pendengar `scroll` saja. Jangan menambah pendengar `scroll`
kedua yang ikut membaca tata letak.

## Posisi splat sudah fix

Panel **Posisi splat** — geser, putar, skala, lalu Simpan permanen —
sudah dicabut, berikut `js/transform-splat.js`, endpoint
`api/simpan-georef.php`, dan `data/georef.json` yang ditulisnya. Posisi
hasil kalibrasi 25 November 2026 dipindah apa adanya jadi konstanta
`GEOREF` di `js/config.js`, jadi tampilannya persis sama seperti
sebelum pencabutan.

Kalau suatu saat perlu didudukkan ulang, ubah angkanya langsung di
`js/config.js`. Yang gampang salah di situ: `rotation` memakai Euler
XYZ milik plugin, bukan ZYX milik `splat-transform -r`, dan `scale`
bukan meter karena bug di plugin v0.2.9 — keduanya dijelaskan di
`js/mercator.js`. Jalur ukur yang bisa dilaporkan angkanya (Helmert 7
parameter dari COLMAP) tetap ada di `tools/`.

## Splat selalu kualitas penuh

Pilihan Penuh/Ringan di panel sudah dicabut. Yang tampil selalu berkas
penuh, jumlah dan susunan gaussian-nya persis sama dengan hasil export
SuperSplat. `data/splat/ftspk-ringan.sog` tidak dipakai lagi dan boleh
dihapus dari drive kelompok.

Alasannya: berat gambarnya bukan ditentukan jumlah gaussian. Lihat
bagian berikut.

## Gambar hanya waktu perlu

Plugin splat memanggil `map.triggerRepaint()` di setiap bingkai, jadi
peta tidak pernah berhenti menggambar. Diukur di halaman ini sebelum
diperbaiki: **113 bingkai per detik sementara tidak ada seorang pun
menyentuh peta**, masing-masing 3,5 juta piksel gaussian beralpha. Laju
gambarnya sendiri tidak pernah jadi masalah — pada ukuran itu satu
bingkai memang cuma butuh sekitar 9 ms. Yang jadi masalah adalah GPU
yang tidak pernah menganggur, dan itu yang membuat kipas menyala serta
seluruh jendela terasa berat.

`gambarSeperlunya()` di `js/map.js` membungkus `triggerRepaint`.
Panggilan hanya diteruskan selama jendela sadar masih terbuka, dan
jendela itu dibuka ulang oleh apa pun yang benar-benar mengubah gambar:
sentuhan di kanvas, gerak kamera, data layer yang datang. Sesudah
perbaikan, angkanya **0 bingkai per detik saat diam**.

Dua hal yang perlu diingat kalau menyentuh fungsi itu:

- Kanvas didengarkan langsung lewat `pointerdown`/`wheel`/`touchstart`,
  bukan cuma lewat event kamera. Waktu jendelanya tertutup, panggilan
  `triggerRepaint` milik MapLibre sendiri ikut tertelan, jadi kita harus
  sudah bangun sebelum hitungan kameranya jalan, bukan sesudahnya.
- `moveend` memakai ekor lebih panjang dari event lain. Spark menyusun
  ulang urutan gaussian secara asinkron sesudah kamera berhenti; jendela
  yang menutup lebih cepat dari penyusunan itu akan meninggalkan splat
  dalam urutan yang belum selesai sampai peta disentuh lagi.

Perubahan yang tidak memancarkan event peta sama sekali — opasitas
splat, ganti mode tampilan — harus memanggil pembangun yang
dikembalikan fungsi itu. Kalau tidak, slidernya digeser dan tidak ada
yang terjadi sampai peta kebetulan tersentuh.

## Yang dipelajari dari viewer SuperSplat

`splatftspk.html` adalah export SuperSplat: satu berkas 47,6 MB, yang
45,7 MB di antaranya data splat di satu baris. Kode viewer-nya
(PlayCanvas) ada di sisa barisnya dan berkomentar panjang, jadi bisa
dibaca. Empat tekniknya dipakai di sini, dan satu sengaja tidak.

**Gambar sesuai permintaan.** Viewer menyalakan `app.autoRender = true`
selama memuat, lalu mematikannya begitu bingkai utuh pertama siap;
sesudah itu rendernya didorong `frame:request` dan deteksi kamera
berubah. Itu persis pola `gambarSeperlunya()` di atas.

**`antialias: false`.** Viewer membuat graphics device-nya tanpa MSAA.
Splat adalah jutaan quad beralpha ke framebuffer yang sama; dengan MSAA
tiap pikselnya dibayar berkali-kali, sementara gaussian yang tepinya
memang lembut tidak mendapat apa-apa. Harganya tepi gedung di mode Blok
3D jadi lebih bergerigi, dan itu ditukar sadar.

**Rasio piksel dibatasi.** `canvasPixelRatio()` miliknya membatasi sisi
terpendek backbuffer di 2160 piksel (1080 di perangkat bergerak),
bukan memakai `devicePixelRatio` apa adanya. Disalin ke `rasioPiksel()`
di `js/map.js`. Di layar biasa nilainya sama saja; yang terbantu laptop
ber-DPI tinggi, yang membayar dua sampai empat kali lipat piksel untuk
ketajaman yang nyaris tak terlihat pada splat.

**Gerbang bingkai — ini yang paling menentukan rasa "lancar".**
Peramban dengan senang hati mengantrekan bingkai jauh di depan GPU yang
sibuk. Akibatnya bukan FPS yang turun, melainkan JEDA: yang terlihat
adalah keadaan kamera beberapa bingkai lalu, jadi peta terasa molor
waktu diseret meskipun angka FPS-nya bagus. Catatan di viewer menyebut
hasil ukurnya sendiri — sekitar 110 ms di Chrome dengan WebGPU, dan
400 ms dengan WebGL. Penangkalnya: tiap bingkai yang sudah tergambar
diberi pagar `gl.fenceSync()`, dan permintaan gambar baru ditahan
selama masih ada dua pagar yang belum dilewati GPU. `gerbangBingkai()`
di `js/map.js` menirunya, dengan batas dua — angka bawaan viewer.
`fenceSync` hanya ada di WebGL2; di WebGL1 fungsinya mengembalikan null
dan peta jalan tanpa gerbang, bukan gagal.

**Yang tidak dipakai: `resolutionScale`.** Viewer punya mode Performance
yang menggambar di setengah resolusi lalu diperbesar. Itu pilihan
pengguna di sana, dan di sini kita baru saja mencabut pilihan kualitas
— menambah pilihan resolusi malah mengembalikan persoalan yang sama
lewat pintu lain. Kalau nanti ada perangkat yang benar-benar tidak
sanggup, inilah yang pertama dicoba, bukan mengurangi jumlah gaussian.

**Yang tidak bisa dipakai: WebGPU.** Viewer memilih WebGPU kalau ada,
dan di situ sortir gaussian jalan di GPU. MapLibre menggambar dengan
WebGL, jadi jalur itu tertutup selama petanya MapLibre.

## Catatan penting soal file splat

**File `.sog` wajib versi 2.** Spark 0.1.10, yang dipakai
maplibre-gl-splat 0.2.9, menolak SOG v3 dengan pesan
`Invalid PC SOGS zip file`. File asli dari splat-transform v3 harus
dikonversi dengan `--sog-version 2`. Skrip `tools/bake.ps1` sudah
melakukannya.

**Tepat satu file splat ikut git.** `data/splat/ftspk-penuh.sog`,
sekitar 30 MB, supaya siapa pun yang clone langsung melihat splat yang
sama persis di posisi yang sama, tanpa menyalin apa pun lewat drive.
Yang lain tidak: `splatftspk.sog` (34 MB) adalah berkas sumbernya, dan
`ftspk-ringan.sog` sudah tidak dipakai sejak pilihan kualitas dicabut.

**Jangan commit `.sog` tiap kali bereksperimen.** `.sog` itu zip, jadi
Git tidak bisa memampatkannya maupun menyimpan selisih antarversi. Tiap
commit menyimpan 30 MB utuh, selamanya, dan ikut terunduh setiap orang
setiap clone — dan tidak bisa dihapus tanpa menulis ulang seluruh
history. Commit berkas itu hanya kalau modelnya benar-benar berubah
untuk seluruh tim. Kalau ternyata sering diekspor ulang, pindahkan ke
aset GitHub Release (sampai 2 GB, tidak menyentuh history repo).

**Pola `.gitignore`-nya tidak boleh ditulis sebagai direktori.**
`data/splat/` sebagai pengecualian direktori membuat Git tidak masuk ke
dalamnya sama sekali, jadi `!data/splat/ftspk-penuh.sog` tidak akan
pernah terbaca. Yang dipakai pola berkas (`*.sog`) lalu negasinya.
Periksa dengan `git check-ignore -v <berkas>` sesudah mengubahnya.

**Versi plugin dipin tepat di 0.2.9.** Arti opsi `scale` bergantung pada
sebuah bug di versi itu. Penjelasannya ada di `js/mercator.js`.

**Model baru tidak muncul? Periksa dua hal ini, berurutan.**

Pertama, tanggal ubah `data/splat/ftspk-penuh.sog`. Yang dibaca peta
adalah berkas itu, bukan `splatftspk.sog` di akar proyek — dan
splat-transform **menolak menimpa berkas yang sudah ada** sambil tetap
keluar dengan kode 0. Jadi konversinya bisa gagal tanpa ada yang tampak
gagal. Pakai `-w`, perintah lengkapnya ada di `tools/README.md`.

Kedua, cap versi di URL-nya. Berkas `.sog` disajikan dengan
`Cache-Control: immutable` selama setahun, dan itu disengaja: ukurannya
30 MB, jadi membuka peta untuk kedua kalinya tidak perlu mengunduhnya
lagi. Tapi
`immutable` secara harfiah berarti jangan diperiksa lagi, jadi menekan
refresh pun tidak menolong selama namanya sama. Karena itu
`js/splat.js` menempelkan `?v=<ETag>` ke URL-nya, diambil dari balasan
HEAD yang memang sudah dilakukan sebelum memuat, jadi tanpa permintaan
tambahan. Berkas diganti, cap berubah, URL berubah, unduhan barunya
jalan sendiri; berkas sama, URL sama, cache panjangnya tetap bekerja.
HEAD itu wajib `cache: 'no-store'` — tanpa itu HEAD-nya sendiri dijawab
dari cache dengan ETag lama, dan capnya tidak pernah berubah.

**Angka jumlah splat ada di tiga tempat** — `js/config.js`, `peta.html`,
dan tabel status di atas — dan tidak dibaca dari berkasnya. Setiap kali
model dilatih ulang, angkanya berubah dan ketiganya harus ikut diperbarui.
Jumlah pastinya ada di `meta.json` di dalam zip `.sog`.

## Anggota kelompok

- [Nama anggota 1]
- [Nama anggota 2]
- [Nama anggota 3]
- [Nama anggota 4]
