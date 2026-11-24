-- Registry Gaussian splatting dan parameter georeferensinya.
-- Jalankan setelah sql/01_schema.sql.
--
-- Kenapa ada di PostGIS, bukan di-hardcode di JavaScript:
-- residual per titik dan RMSE adalah isi lampiran laporan geomatika.
-- Disimpan sebagai tabel, keduanya bisa dipetakan di QGIS dan
-- dipublikasikan lewat GeoServer seperti layer lain.
--
-- File .sog sendiri TIDAK lewat GeoServer. SOG bukan format GIS dan
-- GeoServer tidak punya data provider untuknya, jadi file-nya disajikan
-- statis oleh Apache sementara tabel di sini memegang metadatanya.

CREATE EXTENSION IF NOT EXISTS postgis;

-- ---------------------------------------------------------------- origin

-- Titik acuan sistem ENU lokal. Semua koordinat metrik hasil solve
-- dihitung relatif terhadap titik ini.
CREATE TABLE georef_origin (
  kode              VARCHAR(40) PRIMARY KEY,
  lon               DOUBLE PRECISION NOT NULL,
  lat               DOUBLE PRECISION NOT NULL,

  -- Tiga tinggi disimpan terpisah, bukan satu kolom.
  -- GPS drone memberi tinggi ellipsoid WGS84, DEMNAS memakai tinggi
  -- ortometrik EGM2008, dan selisihnya di Surabaya sekitar +10..+20 m.
  -- Tanpa ketiganya, simulasi banjir pada Tahap 3 tidak bisa diikat
  -- ke permukaan yang benar.
  alt_ellipsoid_m   DOUBLE PRECISION,
  alt_ortho_m       DOUBLE PRECISION,
  undulasi_geoid_m  DOUBLE PRECISION,

  proj_pipeline     TEXT,
  catatan           TEXT,
  geom              GEOMETRY(Point, 4326),
  dibuat_pada       TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX idx_georef_origin_geom ON georef_origin USING GIST (geom);

-- --------------------------------------------------------------- solusi

-- Satu baris per solve Umeyama. Boleh ada beberapa, misalnya saat
-- membandingkan GPS EXIF dengan posisi RTK.
CREATE TABLE georef_solusi (
  id                SERIAL PRIMARY KEY,
  origin_kode       VARCHAR(40) REFERENCES georef_origin(kode) ON DELETE CASCADE,
  metode            VARCHAR(60) NOT NULL,

  skala             DOUBLE PRECISION NOT NULL,  -- meter per unit model

  -- Matriks rotasi row-major adalah acuan yang sah. Euler hanya
  -- turunannya, dan disimpan karena itu yang dimakan splat-transform.
  rot_matrix        DOUBLE PRECISION[9] NOT NULL,

  -- Urutan ZYX, khusus untuk `splat-transform -r`. Opsi `rotation`
  -- pada maplibre-gl-splat memakai XYZ, jadi angkanya tidak bisa
  -- dipindah begitu saja antar keduanya.
  rot_euler_zyx_deg DOUBLE PRECISION[3],

  translasi_m       DOUBLE PRECISION[3] NOT NULL,

  n_fit             INTEGER,
  n_uji             INTEGER,

  -- rmse_uji_m yang dilaporkan, bukan rmse_fit_m. Yang pertama
  -- dihitung dari titik yang tidak ikut menentukan solusi.
  rmse_fit_m        NUMERIC(10,4),
  rmse_uji_m        NUMERIC(10,4),
  rmse_horizontal_m NUMERIC(10,4),
  rmse_vertikal_m   NUMERIC(10,4),

  catatan           TEXT,
  dibuat_pada       TIMESTAMPTZ DEFAULT now()
);

-- -------------------------------------------------------- titik kontrol

-- Residual per titik. Kolom geom membuatnya bisa digambar sebagai peta
-- vektor residual di QGIS, dan itu gambar paling berguna untuk laporan.
CREATE TABLE georef_titik_kontrol (
  id           SERIAL PRIMARY KEY,
  solusi_id    INTEGER REFERENCES georef_solusi(id) ON DELETE CASCADE,
  label        VARCHAR(160),
  peran        VARCHAR(8) CHECK (peran IN ('fit', 'uji')),

  lokal_x      DOUBLE PRECISION,
  lokal_y      DOUBLE PRECISION,
  lokal_z      DOUBLE PRECISION,

  enu_e        DOUBLE PRECISION,
  enu_n        DOUBLE PRECISION,
  enu_u        DOUBLE PRECISION,

  res_e_m      NUMERIC(10,4),
  res_n_m      NUMERIC(10,4),
  res_u_m      NUMERIC(10,4),
  res_3d_m     NUMERIC(10,4),

  geom         GEOMETRY(Point, 4326)
);
CREATE INDEX idx_georef_tk_geom ON georef_titik_kontrol USING GIST (geom);
CREATE INDEX idx_georef_tk_solusi ON georef_titik_kontrol (solusi_id);

-- -------------------------------------------------------------- registry

-- Daftar file splat yang disajikan ke viewer.
CREATE TABLE splat_aset (
  kode             VARCHAR(40) PRIMARY KEY,
  nama             VARCHAR(120) NOT NULL,
  url              VARCHAR(255) NOT NULL,
  jumlah_splat     BIGINT,
  ukuran_byte      BIGINT,

  -- Spark 0.1.10 hanya membaca SOG v2. File v3 ditolak dengan
  -- "Invalid PC SOGS zip file". Kolom ini ada supaya salah versi
  -- ketahuan dari database, bukan baru saat halaman gagal.
  sog_version      INTEGER DEFAULT 2 CHECK (sog_version IN (2, 3)),
  sh_band          INTEGER,

  solusi_id        INTEGER REFERENCES georef_solusi(id) ON DELETE SET NULL,
  transform_dibake BOOLEAN DEFAULT false,

  anchor_lon       DOUBLE PRECISION,
  anchor_lat       DOUBLE PRECISION,
  anchor_alt_m     DOUBLE PRECISION,

  -- Urutan XYZ, untuk opsi `rotation` maplibre-gl-splat.
  rotasi_xyz_deg   DOUBLE PRECISION[3] DEFAULT '{0,0,180}',

  -- Faktor Mercator, sekitar 0.0257887 di lintang FTSPK.
  skala_viewer     DOUBLE PRECISION,

  default_aktif    BOOLEAN DEFAULT false,

  -- Perintah splat-transform yang menghasilkan file ini. Kolom inilah
  -- yang membuat aset masih bisa dibuat ulang enam bulan kemudian.
  perintah_bake    TEXT,

  dibuat_pada      TIMESTAMPTZ DEFAULT now()
);

-- ------------------------------------------------------------ view info

-- Join bangunan ke departemen, untuk popup di peta. Publikasikan view
-- ini sebagai layer GeoServer supaya popup cukup satu permintaan WFS.
CREATE OR REPLACE VIEW v_bangunan_info AS
SELECT b.id, b.nama, b.fungsi, b.jumlah_lantai, b.tinggi_m,
       b.lod_tersedia, b.model_url, b.foto_url,
       d.nama AS departemen, d.singkatan, d.url_web, d.url_instagram,
       b.geom
FROM bangunan b
LEFT JOIN departemen d ON d.id = b.departemen_id;

-- ------------------------------------------------------------ isi awal

INSERT INTO splat_aset (kode, nama, url, jumlah_splat, sog_version, sh_band, default_aktif)
VALUES
  ('ftspk-ringan', 'FTSPK ringan', 'data/splat/ftspk-ringan.sog', 800000, 2, 3, true),
  ('ftspk-penuh',  'FTSPK penuh',  'data/splat/ftspk-penuh.sog', 2283590, 2, 3, false)
ON CONFLICT (kode) DO NOTHING;
