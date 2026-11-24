# Georeferensi Gaussian splatting FTSPK

Splat hasil training tidak punya koordinat, skala metrik, maupun arah
utara. Folder ini berisi alat untuk memberinya ketiganya, dengan cara
yang bisa dilaporkan angkanya.

Metodenya: transformasi kesebangunan 7 parameter (Helmert) yang
dihitung dengan Umeyama least squares, dari posisi kamera COLMAP ke
koordinat GPS foto. Hasilnya skala, rotasi, translasi, plus RMSE.

## Yang perlu disiapkan

```powershell
pip install -r tools/requirements.txt
npm install -g @playcanvas/splat-transform
```

File `.sog` tidak ikut git (lihat `.gitignore`). Ambil dari drive
kelompok dan taruh di akar proyek sebagai `splatftspk.sog`.

## Langkah

### 1. Ekspor COLMAP ke format teks

```powershell
colmap model_converter --input_path sparse/0 --output_path sparse_txt --output_type TXT
```

### 2. Kumpulkan GPS tiap foto

```powershell
exiftool -n -csv -GPSLatitude -GPSLongitude -GPSAltitude *.JPG > data/gps_foto.csv
```

Ganti nama kolomnya jadi `nama_file,lat,lon,alt`. Nama file harus persis
sama dengan kolom `NAME` di `images.txt`.

Kalau drone Anda RTK atau PPK (Phantom 4 RTK, Mavic 3 Enterprise),
pakai posisi dari file `.MRK`, bukan EXIF. Bedanya sentimeter lawan
2 sampai 5 meter, dan itu akan langsung terlihat di RMSE.

### 3. Periksa dulu: apakah splat sefrme dengan COLMAP?

Ini pemeriksaan yang paling sering dilewati, dan kalau terlewat seluruh
hasil solve jadi sia-sia.

Sebagian trainer Gaussian splatting memusatkan ulang dan menormalkan
skala sebelum training. Kalau itu terjadi, transform COLMAP ke ENU
**tidak berlaku** untuk file `.sog`, dan Anda perlu ikut menyusun
normalisasi trainer-nya.

Cara memeriksa: bandingkan centroid dan jari-jari RMS awan titik
`points3D.txt` dengan bounding box splat. Bentangan splat dibaca dari
`mesh.getBoundingBox()` di console browser, bukan dari `means.mins/maxs`
di `meta.json` — nilai di meta itu rentang pendekodean domain-log, bukan
posisi linear. Untuk file ini bentangan sebenarnya 12,05 x 2,56 x 13,58
unit, sementara `means` hanya menunjukkan 3,87 x 1,63 x 4,11.

### 4. Hitung transformasinya

```powershell
python tools/georef_colmap.py --images sparse_txt/images.txt --gps data/gps_foto.csv --out tools/out
```

Keluarannya:

| File | Isi |
| --- | --- |
| `tools/out/georef.json` | parameter dan statistik |
| `tools/out/georef.sql` | INSERT untuk tabel di `sql/02_splat_georef.sql` |
| `tools/out/residual.csv` | residual per titik, untuk peta vektor residual di QGIS |

Yang dibaca dari keluarannya:

- **RMSE validasi** adalah angka yang masuk laporan, bukan RMSE fit.
  RMSE fit dihitung dari titik yang ikut menentukan solusi, jadi selalu
  optimistis.
- Kalau RMSE validasi jauh lebih besar daripada RMSE fit, solusinya
  overfit atau ada GPS yang salah pasang. Skrip akan memperingatkan.
- RMSE horizontal dan vertikal dipisah karena pola terbang lawnmower
  satu ketinggian menentukan yaw dan skala dengan baik, tapi lemah
  mengikat kemiringan. Vertikal yang buruk biasanya berarti itu.

### 5. Bake ke file .sog

```powershell
.\tools\bake.ps1 -Skala <skala_m_per_unit> -EulerZYX "<rot_euler_zyx_deg>" -Translasi "<translasi_m>"
```

Menghasilkan `data/splat/ftspk-penuh.sog` dan `data/splat/ftspk-ringan.sog`.

### 6. Setel viewer

Di `js/config.js`, ubah `GEOREF.dibake` jadi `true` dan isi `lon`, `lat`,
`alt` dengan origin dari `georef.json`, serta `rmse_m` dan
`rmse_validasi_m`. Mulai saat itu rotasi runtime jadi `ROTASI_ENU` dan
skalanya faktor Mercator murni.

### 7. Masukkan ke PostGIS

```powershell
psql -d ftspk_twin -f sql/02_splat_georef.sql
psql -d ftspk_twin -f tools/out/georef.sql
```

## Hal-hal yang sudah diuji langsung, bukan dugaan

Semua ini ditemukan saat membangun dan menguji di browser, dan sebagian
bertentangan dengan dokumentasi resminya.

**File .sog wajib versi 2.** Spark 0.1.10, yang dipakai
maplibre-gl-splat 0.2.9, menolak SOG v3 dengan pesan
`Invalid PC SOGS zip file`. `splatftspk.sog` asli adalah v3, jadi harus
dikonversi. `tools/bake.ps1` selalu memakai `--sog-version 2`.

**Opsi `scale` bukan meter.** Karena bug di plugin v0.2.9, `scale: s`
berarti sekitar `s x 38,78 m` per unit model pada lintang FTSPK.
Penjelasan lengkapnya ada di `js/mercator.js`. Versi plugin dipin tepat
di 0.2.9 justru karena ini: kalau bug-nya diperbaiki upstream, splat
akan berubah ukuran sekitar 39 kali tanpa pesan error.

**`rotation: [0,0,0]` bukan "tanpa rotasi".** Array yang truthy membuat
plugin melewati rotasi default-nya sendiri, jadi `[0,0,0]` tetap sebuah
pilihan frame. Splat mentah ini perlu `[-90, 0, 0]` supaya terhampar
datar, bukan berdiri seperti papan.

**Ada dua instance three.js kalau tidak ditangani.** Bundel plugin
mengimpor `three@0.186.1`, tapi spark dan maplibre-three-plugin
mengimpor `three@0.178.0`. Import map di `index.html` menyatukannya ke
0.178.0. Tanpa itu objek dari satu instance tidak dikenali yang lain.

**Urutan Euler berbeda antar alat.** `splat-transform -r` memakai ZYX,
opsi `rotation` plugin memakai XYZ.

## Catatan datum tinggi

`GPSAltitude` dari EXIF umumnya tinggi ellipsoid WGS84, sedangkan DEMNAS
memakai tinggi ortometrik EGM2008. Undulasi geoid di sekitar Surabaya
berada di kisaran +10 sampai +20 m.

Karena peta belum memakai layer terrain, `fill-extrusion` tumbuh dari
bidang datar nol. Jadi yang praktis: pilih `alt` sehingga permukaan tanah
splat duduk di 0, menyamai blok gedung. Tabel `georef_origin` menyimpan
tinggi ellipsoid, ortometrik, dan undulasi secara terpisah supaya
simulasi banjir nanti bisa diikat dengan benar.

Sebutkan ini di laporan. Ini kesalahan klasik dan dosen Geomatika akan
mencarinya.

## Verifikasi matematika

Solver Umeyama sudah diuji balik dengan data sintetis berparameter
diketahui: skala dipulihkan 42,4968 dari 42,5 sebenarnya, galat rotasi
0,011 derajat, galat translasi 0,036 m, determinan R = +1 (tidak
tercermin), dan rekonstruksi Euler ZYX tepat sampai 2,2e-16.

Penanganan refleksi di `umeyama()` memang perlu. Tanpa baris
`if det < 0`, SVD kadang menghasilkan matriks berdeterminan -1, yaitu
pencerminan. Modelnya lalu tampak benar tapi tercermin, dan dari udara
itu tidak selalu kelihatan.
