<#
    Bake transformasi georeferensi ke file .sog, lalu buat versi ringan.

    Jalankan dari akar proyek:
        .\tools\bake.ps1 -Skala 42.4968 -EulerZYX "0,2.5,37.01" -Translasi "12,-7.5,55"

    Angka-angkanya diambil dari tools/out/georef.json, kolom:
        skala_m_per_unit
        rot_euler_zyx_deg_untuk_splat_transform
        translasi_m

    DUA HAL YANG MUDAH SALAH DI LANGKAH INI
    ---------------------------------------
    1. VERSI SOG WAJIB 2, BUKAN 3.
       File splatftspk.sog asli adalah SOG v3. Spark 0.1.10, yang dipakai
       maplibre-gl-splat 0.2.9, hanya bisa membaca v2 dan akan menolak v3
       dengan pesan "Invalid PC SOGS zip file". Ini sudah diuji langsung,
       bukan dugaan. Karena itu setiap keluaran .sog di bawah memakai
       --sog-version 2.

    2. URUTAN EULER BERBEDA ANTAR ALAT.
       `splat-transform -r` memakai urutan ZYX, sedangkan opsi `rotation`
       pada maplibre-gl-splat memakai XYZ. Skrip georef_colmap.py sudah
       mengeluarkan versi ZYX khusus untuk dipakai di sini. Jangan
       menyalin angka dari js/config.js ke sini atau sebaliknya.

    Aksi dijalankan sesuai urutan penulisan, jadi -s lalu -r lalu -t
    menghasilkan  p' = t + R(s*p), persis bentuk keluaran Umeyama.
#>

param(
    [Parameter(Mandatory = $true)][double]$Skala,
    [Parameter(Mandatory = $true)][string]$EulerZYX,
    [Parameter(Mandatory = $true)][string]$Translasi,
    [string]$Sumber = 'splatftspk.sog',
    [int]$JumlahRingan = 800000,
    [string]$Keluaran = 'data/splat'
)

$ErrorActionPreference = 'Stop'
$ST = @('npx', '--yes', '@playcanvas/splat-transform@3.12.0')

if (-not (Test-Path $Sumber)) {
    throw "File sumber '$Sumber' tidak ada. Ambil dari drive kelompok dulu."
}
New-Item -ItemType Directory -Force -Path $Keluaran | Out-Null
$tmp = Join-Path $env:TEMP 'ftspk-ringan.ply'

# -N membuang gaussian NaN, -F membuang floater (gumpalan melayang di
# langit yang ikut terbentuk saat training). Keduanya dijalankan sebelum
# transform supaya outlier tidak ikut menggeser hasil.
Write-Host '[1/3] Bake transform ke versi penuh' -ForegroundColor Cyan
& $ST[0] $ST[1..2] $Sumber -N -F `
    -s $Skala -r $EulerZYX -t $Translasi `
    "$Keluaran/ftspk-penuh.sog" --sog-version 2

# Decimate wajib jadi aksi terakhir dan keluarannya wajib .ply, jadi
# tidak bisa digabung ke satu perintah dengan konversi .sog.
Write-Host '[2/3] Decimate ke PLY' -ForegroundColor Cyan
& $ST[0] $ST[1..2] "$Keluaran/ftspk-penuh.sog" -d $JumlahRingan $tmp

Write-Host '[3/3] PLY kembali ke SOG v2' -ForegroundColor Cyan
& $ST[0] $ST[1..2] $tmp "$Keluaran/ftspk-ringan.sog" --sog-version 2
Remove-Item $tmp -ErrorAction SilentlyContinue

Write-Host ''
Get-ChildItem $Keluaran -Filter '*.sog' | Format-Table Name, @{N = 'MB'; E = { [math]::Round($_.Length / 1MB, 1) } }
Write-Host 'Selesai. Setel GEOREF.dibake = true di js/config.js.' -ForegroundColor Green
