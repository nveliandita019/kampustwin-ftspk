CREATE EXTENSION IF NOT EXISTS postgis;

CREATE TABLE departemen (
  id SERIAL PRIMARY KEY,
  nama VARCHAR(100) NOT NULL,
  singkatan VARCHAR(20),
  deskripsi TEXT,
  url_web VARCHAR(255),
  url_instagram VARCHAR(255)
);

CREATE TABLE bangunan (
  id SERIAL PRIMARY KEY,
  nama VARCHAR(200) NOT NULL,
  departemen_id INTEGER REFERENCES departemen(id),
  fungsi VARCHAR(50),
  jumlah_lantai INTEGER,
  tinggi_m NUMERIC(5,1),
  lod_tersedia INTEGER DEFAULT 1,
  model_url VARCHAR(255),
  foto_url VARCHAR(255),
  geom GEOMETRY(Polygon, 4326)
);
CREATE INDEX idx_bangunan_geom ON bangunan USING GIST (geom);

CREATE TABLE jalan (
  id SERIAL PRIMARY KEY,
  nama VARCHAR(150),
  jenis VARCHAR(50),
  geom GEOMETRY(LineString, 4326)
);
CREATE INDEX idx_jalan_geom ON jalan USING GIST (geom);

CREATE TABLE sungai (
  id SERIAL PRIMARY KEY,
  nama VARCHAR(150),
  lebar_m NUMERIC(6,1),
  geom GEOMETRY(LineString, 4326)
);
CREATE INDEX idx_sungai_geom ON sungai USING GIST (geom);

CREATE TABLE elevasi (
  id SERIAL PRIMARY KEY,
  elev_m NUMERIC(6,2),
  geom GEOMETRY(Point, 4326)
);
CREATE INDEX idx_elevasi_geom ON elevasi USING GIST (geom);

INSERT INTO departemen (nama, singkatan) VALUES
  ('Teknik Sipil', 'TS'),
  ('Teknik Lingkungan', 'TL'),
  ('Arsitektur', 'ARS'),
  ('Teknik Geomatika', 'GMT'),
  ('Teknik Geofisika', 'GFS'),
  ('Perencanaan Wilayah dan Kota', 'PWK');
