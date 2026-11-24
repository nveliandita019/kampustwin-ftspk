#!/usr/bin/env python3
"""
Hitung transformasi kesebangunan 7 parameter (Helmert) dari frame lokal
COLMAP ke ENU meter, memakai posisi kamera dan GPS foto.

Dipakai untuk menggeoreferensi Gaussian splatting FTSPK.

Cara pakai:
    python tools/georef_colmap.py \
        --images sparse_txt/images.txt \
        --gps data/gps_foto.csv \
        --out tools/out

Keluaran:
    tools/out/georef.json   parameter + statistik, dibaca manusia dan skrip
    tools/out/georef.sql    INSERT untuk tabel di sql/02_splat_georef.sql
    tools/out/residual.csv  residual per titik, untuk dipetakan di QGIS

Butuh: numpy, pyproj
    pip install numpy pyproj
"""

import argparse
import csv
import json
import math
from pathlib import Path

import numpy as np
from pyproj import Transformer


# --------------------------------------------------------------- COLMAP --

def baca_images_txt(path):
    """
    Baca images.txt COLMAP, kembalikan {nama_file: pusat_kamera_xyz}.

    Format barisnya:
        IMAGE_ID QW QX QY QZ TX TY TZ CAMERA_ID NAME

    Kuaternion dan translasi di situ adalah WORLD -> CAMERA. Pusat kamera
    di frame dunia adalah:

        C = -R(q)^T . t

    Transpose dan tanda minus itu kesalahan paling sering di langkah ini.
    Kalau dilupakan, hasil solve tetap keluar dengan RMSE yang kelihatan
    masuk akal, tapi modelnya salah tempat.

    Baris isi dan baris POINTS2D berselang-seling, jadi hanya baris ganjil
    (setelah komentar dibuang) yang dipakai.
    """
    pusat = {}
    with open(path, encoding='utf-8') as f:
        baris = [b.strip() for b in f if b.strip() and not b.startswith('#')]

    for i in range(0, len(baris), 2):
        bagian = baris[i].split()
        if len(bagian) < 10:
            continue
        qw, qx, qy, qz = map(float, bagian[1:5])
        tx, ty, tz = map(float, bagian[5:8])
        nama = ' '.join(bagian[9:])

        R = kuaternion_ke_matriks(qw, qx, qy, qz)
        C = -R.T @ np.array([tx, ty, tz])
        pusat[nama] = C

    return pusat


def kuaternion_ke_matriks(qw, qx, qy, qz):
    n = math.sqrt(qw * qw + qx * qx + qy * qy + qz * qz)
    qw, qx, qy, qz = qw / n, qx / n, qy / n, qz / n
    return np.array([
        [1 - 2 * (qy * qy + qz * qz), 2 * (qx * qy - qz * qw), 2 * (qx * qz + qy * qw)],
        [2 * (qx * qy + qz * qw), 1 - 2 * (qx * qx + qz * qz), 2 * (qy * qz - qx * qw)],
        [2 * (qx * qz - qy * qw), 2 * (qy * qz + qx * qw), 1 - 2 * (qx * qx + qy * qy)],
    ])


# ------------------------------------------------------------------ GPS --

def baca_gps(path):
    """
    CSV dengan kolom: nama_file, lat, lon, alt

    Kalau drone Anda RTK/PPK (Phantom 4 RTK, Mavic 3 Enterprise), pakai
    posisi dari file .MRK, bukan EXIF. Bedanya sentimeter lawan 2-5 meter,
    dan itu akan langsung terlihat di RMSE.

    Ambil dari EXIF dengan exiftool:
        exiftool -n -csv -GPSLatitude -GPSLongitude -GPSAltitude *.JPG > gps.csv
    lalu ganti nama kolomnya agar cocok.
    """
    gps = {}
    with open(path, encoding='utf-8-sig', newline='') as f:
        for r in csv.DictReader(f):
            kunci = {k.strip().lower(): v for k, v in r.items()}
            nama = kunci.get('nama_file') or kunci.get('filename') or kunci.get('name')
            if not nama:
                continue
            try:
                gps[nama.strip()] = (
                    float(kunci['lat']), float(kunci['lon']), float(kunci.get('alt') or 0.0)
                )
            except (KeyError, TypeError, ValueError):
                continue
    return gps


def buat_transformer_enu(lat0, lon0, alt0):
    """
    Transformer geodetik (derajat) -> ENU meter pada satu origin.

    `+proj=topocentric` hanya menerima koordinat kartesian (ECEF), jadi
    tidak bisa dirangkai langsung dari EPSG:4979. Pipeline di bawah
    melakukan dua langkah yang diperlukan: derajat ke radian, lalu
    geodetik ke ECEF, baru ke topocentric. Merangkainya langsung akan
    ditolak PROJ dengan "Mismatched units between step 1 and 2".

    Transformer dibuat sekali lalu dipakai berulang. Membuatnya per
    titik akan sangat lambat untuk ratusan foto.
    """
    return Transformer.from_pipeline(
        '+proj=pipeline '
        '+step +proj=unitconvert +xy_in=deg +xy_out=rad '
        '+step +proj=cart +ellps=WGS84 '
        f'+step +proj=topocentric +lat_0={lat0} +lon_0={lon0} +h_0={alt0} +ellps=WGS84'
    )


def ke_enu(tf, lat, lon, alt):
    """Satu titik geodetik -> ENU meter. `tf` dari buat_transformer_enu()."""
    e, n, u = tf.transform(lon, lat, alt)
    return np.array([e, n, u])


# -------------------------------------------------------------- Umeyama --

def umeyama(A, B):
    """
    Cari s, R, t sehingga  s * R @ a + t  sedekat mungkin ke b.

    A, B: array (n, 3). Mengembalikan (s, R, t).

    Penanganan refleksi di bawah itu wajib. Tanpa baris `if det < 0`,
    SVD kadang menghasilkan matriks dengan determinan -1, yaitu
    pencerminan, bukan rotasi. Modelnya lalu tampak "benar" tapi
    tercermin, dan itu tidak selalu kelihatan dari udara.
    """
    n = A.shape[0]
    mu_a, mu_b = A.mean(axis=0), B.mean(axis=0)
    A0, B0 = A - mu_a, B - mu_b

    H = (A0.T @ B0) / n
    U, D, Vt = np.linalg.svd(H)

    S = np.eye(3)
    if np.linalg.det(U) * np.linalg.det(Vt) < 0:
        S[2, 2] = -1

    R = Vt.T @ S @ U.T
    var_a = (A0 ** 2).sum() / n
    s = float(np.trace(np.diag(D) @ S) / var_a)
    t = mu_b - s * R @ mu_a
    return s, R, t


def matriks_ke_euler_zyx(R):
    """
    Matriks rotasi -> Euler ZYX dalam derajat.

    PENTING: `splat-transform -r` memakai urutan ZYX, sementara opsi
    `rotation` pada maplibre-gl-splat memakai XYZ. Dua alat, dua urutan.
    Fungsi ini khusus untuk splat-transform. Jangan menyalin angkanya
    ke config.js tanpa dikonversi.
    """
    sy = -R[2, 0]
    sy = max(-1.0, min(1.0, sy))
    y = math.asin(sy)
    if abs(sy) < 0.99999:
        x = math.atan2(R[2, 1], R[2, 2])
        z = math.atan2(R[1, 0], R[0, 0])
    else:  # gimbal lock
        x = math.atan2(-R[1, 2], R[1, 1])
        z = 0.0
    return [math.degrees(x), math.degrees(y), math.degrees(z)]


# ------------------------------------------------------------------ main --

def main():
    p = argparse.ArgumentParser(description=__doc__,
                                formatter_class=argparse.RawDescriptionHelpFormatter)
    p.add_argument('--images', required=True, help='images.txt dari COLMAP (format TXT)')
    p.add_argument('--gps', required=True, help='CSV: nama_file,lat,lon,alt')
    p.add_argument('--out', default='tools/out', help='folder keluaran')
    p.add_argument('--uji', type=float, default=0.2,
                   help='porsi titik yang disisihkan untuk validasi (0-0.5)')
    p.add_argument('--seed', type=int, default=42)
    p.add_argument('--origin', nargs=3, type=float, metavar=('LAT', 'LON', 'ALT'),
                   help='origin ENU; default = rata-rata GPS')
    args = p.parse_args()

    pusat = baca_images_txt(args.images)
    gps = baca_gps(args.gps)

    nama = sorted(set(pusat) & set(gps))
    if len(nama) < 4:
        raise SystemExit(
            f'Hanya {len(nama)} foto yang cocok antara images.txt dan CSV GPS.\n'
            f'  images.txt: {len(pusat)} foto, CSV: {len(gps)} baris.\n'
            'Periksa apakah kolom nama_file persis sama dengan NAME di images.txt.'
        )

    if args.origin:
        lat0, lon0, alt0 = args.origin
    else:
        lat0 = float(np.mean([gps[n][0] for n in nama]))
        lon0 = float(np.mean([gps[n][1] for n in nama]))
        alt0 = float(np.mean([gps[n][2] for n in nama]))

    tf = buat_transformer_enu(lat0, lon0, alt0)
    A = np.array([pusat[n] for n in nama])
    B = np.array([ke_enu(tf, *gps[n]) for n in nama])

    rng = np.random.default_rng(args.seed)
    idx = rng.permutation(len(nama))
    n_uji = int(len(nama) * args.uji)
    i_uji, i_fit = idx[:n_uji], idx[n_uji:]

    s, R, t = umeyama(A[i_fit], B[i_fit])

    def residual(ix):
        if len(ix) == 0:
            return np.zeros((0, 3))
        return (s * (R @ A[ix].T).T + t) - B[ix]

    res_fit, res_uji = residual(i_fit), residual(i_uji)

    def rmse(r):
        return float(np.sqrt((r ** 2).sum(axis=1).mean())) if len(r) else None

    def rmse_komponen(r, kol):
        return float(np.sqrt((r[:, kol] ** 2).mean())) if len(r) else None

    semua = residual(np.arange(len(nama)))
    hasil = {
        'origin': {'lat': lat0, 'lon': lon0, 'alt_ellipsoid_m': alt0},
        'skala_m_per_unit': s,
        'rot_matrix_row_major': R.flatten().tolist(),
        'rot_euler_zyx_deg_untuk_splat_transform': matriks_ke_euler_zyx(R),
        'translasi_m': t.tolist(),
        'n_total': len(nama),
        'n_fit': int(len(i_fit)),
        'n_uji': int(len(i_uji)),
        'rmse_fit_m': rmse(res_fit),
        'rmse_uji_m': rmse(res_uji),
        'rmse_horizontal_m': float(np.sqrt((semua[:, :2] ** 2).sum(axis=1).mean())),
        'rmse_vertikal_m': rmse_komponen(semua, 2),
        'metode': 'umeyama_colmap_gps',
    }

    out = Path(args.out)
    out.mkdir(parents=True, exist_ok=True)
    (out / 'georef.json').write_text(json.dumps(hasil, indent=2), encoding='utf-8')

    with open(out / 'residual.csv', 'w', encoding='utf-8', newline='') as f:
        w = csv.writer(f)
        w.writerow(['nama_file', 'peran', 'lokal_x', 'lokal_y', 'lokal_z',
                    'enu_e', 'enu_n', 'enu_u', 'res_e', 'res_n', 'res_u', 'res_3d'])
        peran = {int(i): 'uji' for i in i_uji}
        for k, n in enumerate(nama):
            r = semua[k]
            w.writerow([n, peran.get(k, 'fit'), *A[k].round(6), *B[k].round(4),
                        *r.round(4), round(float(np.linalg.norm(r)), 4)])

    tulis_sql(out / 'georef.sql', hasil, nama, A, B, semua, set(map(int, i_uji)))

    print(f'Titik cocok      : {hasil["n_total"]} ({hasil["n_fit"]} fit, {hasil["n_uji"]} uji)')
    print(f'Skala            : {s:.4f} m per unit model')
    print(f'RMSE fit         : {hasil["rmse_fit_m"]:.3f} m')
    if hasil['rmse_uji_m'] is not None:
        print(f'RMSE validasi    : {hasil["rmse_uji_m"]:.3f} m')
    print(f'RMSE horizontal  : {hasil["rmse_horizontal_m"]:.3f} m')
    print(f'RMSE vertikal    : {hasil["rmse_vertikal_m"]:.3f} m')
    print(f'Euler ZYX (deg)  : {[round(v, 4) for v in hasil["rot_euler_zyx_deg_untuk_splat_transform"]]}')
    print(f'\nHasil ditulis ke {out}/')

    if hasil['rmse_uji_m'] and hasil['rmse_fit_m'] and \
            hasil['rmse_uji_m'] > 3 * hasil['rmse_fit_m']:
        print('\nPERINGATAN: RMSE validasi jauh lebih besar dari RMSE fit.')
        print('Transform kemungkinan overfit, atau ada GPS yang salah pasang.')


def tulis_sql(path, h, nama, A, B, res, i_uji):
    o = h['origin']
    baris = [
        '-- Dibuat otomatis oleh tools/georef_colmap.py. Jangan diedit tangan.',
        'BEGIN;',
        '',
        "INSERT INTO georef_origin (kode, lon, lat, alt_ellipsoid_m, geom)",
        f"VALUES ('ftspk', {o['lon']:.9f}, {o['lat']:.9f}, {o['alt_ellipsoid_m']:.3f},",
        f"        ST_SetSRID(ST_MakePoint({o['lon']:.9f}, {o['lat']:.9f}), 4326))",
        'ON CONFLICT (kode) DO UPDATE SET',
        '  lon = EXCLUDED.lon, lat = EXCLUDED.lat,',
        '  alt_ellipsoid_m = EXCLUDED.alt_ellipsoid_m, geom = EXCLUDED.geom;',
        '',
        'INSERT INTO georef_solusi (origin_kode, metode, skala, rot_matrix,',
        '  rot_euler_zyx_deg, translasi_m, n_fit, n_uji,',
        '  rmse_fit_m, rmse_uji_m, rmse_horizontal_m, rmse_vertikal_m)',
        f"VALUES ('ftspk', '{h['metode']}', {h['skala_m_per_unit']:.9f},",
        '  ARRAY[' + ', '.join(f'{v:.9f}' for v in h['rot_matrix_row_major']) + ']::double precision[],',
        '  ARRAY[' + ', '.join(f'{v:.6f}' for v in h['rot_euler_zyx_deg_untuk_splat_transform']) + ']::double precision[],',
        '  ARRAY[' + ', '.join(f'{v:.6f}' for v in h['translasi_m']) + ']::double precision[],',
        f"  {h['n_fit']}, {h['n_uji']}, {h['rmse_fit_m']:.4f},",
        f"  {h['rmse_uji_m'] if h['rmse_uji_m'] is not None else 'NULL'},",
        f"  {h['rmse_horizontal_m']:.4f}, {h['rmse_vertikal_m']:.4f});",
        '',
        'INSERT INTO georef_titik_kontrol (solusi_id, label, peran,',
        '  lokal_x, lokal_y, lokal_z, enu_e, enu_n, enu_u,',
        '  res_e_m, res_n_m, res_u_m, res_3d_m)',
        'VALUES',
    ]
    nilai = []
    for k, n in enumerate(nama):
        r = res[k]
        peran = 'uji' if k in i_uji else 'fit'
        aman = n.replace("'", "''")
        nilai.append(
            f"  (currval('georef_solusi_id_seq'), '{aman}', '{peran}', "
            f'{A[k][0]:.6f}, {A[k][1]:.6f}, {A[k][2]:.6f}, '
            f'{B[k][0]:.4f}, {B[k][1]:.4f}, {B[k][2]:.4f}, '
            f'{r[0]:.4f}, {r[1]:.4f}, {r[2]:.4f}, {float(np.linalg.norm(r)):.4f})'
        )
    baris.append(',\n'.join(nilai) + ';')
    baris += ['', 'COMMIT;', '']
    Path(path).write_text('\n'.join(baris), encoding='utf-8')


if __name__ == '__main__':
    main()
