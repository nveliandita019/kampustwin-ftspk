// Konfigurasi. Ubah GS jika GeoServer tidak lewat proxy.
const GS = '/geoserver';
const WFS_BANGUNAN = GS + '/ftspk/ows?service=WFS&version=1.0.0&request=GetFeature' +
  '&typeName=ftspk:bangunan&outputFormat=application/json';

// Titik awal kira-kira di kampus ITS Sukolilo; sesuaikan ke lokasi FTSPK.
const PUSAT = [112.795, -7.282];

const map = new maplibregl.Map({
  container: 'map',
  center: PUSAT,
  zoom: 16.5,
  pitch: 55,
  bearing: -20,
  style: {
    version: 8,
    sources: {
      osm: {
        type: 'raster',
        tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
        tileSize: 256,
        attribution: '© OpenStreetMap contributors'
      }
    },
    layers: [{ id: 'osm', type: 'raster', source: 'osm' }]
  }
});
map.addControl(new maplibregl.NavigationControl());
map.addControl(new maplibregl.ScaleControl());

map.on('load', async () => {
  try {
    const res = await fetch(WFS_BANGUNAN);
    const data = await res.json();
    map.addSource('bangunan', { type: 'geojson', data });
    map.addLayer({
      id: 'bangunan-3d',
      type: 'fill-extrusion',
      source: 'bangunan',
      paint: {
        'fill-extrusion-color': '#7B5CF0',
        'fill-extrusion-height': ['coalesce', ['get', 'tinggi_m'], 10],
        'fill-extrusion-opacity': 0.9
      }
    });
    map.on('click', 'bangunan-3d', (e) => tampilkanInfo(e.features[0].properties));
    map.on('mouseenter', 'bangunan-3d', () => (map.getCanvas().style.cursor = 'pointer'));
    map.on('mouseleave', 'bangunan-3d', () => (map.getCanvas().style.cursor = ''));
  } catch (err) {
    console.warn('Layer bangunan belum bisa dimuat (cek GeoServer dan CORS):', err);
  }
});

function tampilkanInfo(p) {
  document.getElementById('mg-judul').textContent = p.nama || 'Gedung';
  document.getElementById('mg-isi').innerHTML =
    '<p>Lantai: ' + (p.jumlah_lantai ?? '-') + '<br>Tinggi: ' + (p.tinggi_m ?? '-') + ' m</p>';
  new bootstrap.Modal(document.getElementById('modalGedung')).show();
}

document.getElementById('lyr-bangunan').addEventListener('change', (e) => {
  if (map.getLayer('bangunan-3d')) {
    map.setLayoutProperty('bangunan-3d', 'visibility', e.target.checked ? 'visible' : 'none');
  }
});

document.querySelectorAll('[data-lod]').forEach((b) =>
  b.addEventListener('click', () => {
    document.querySelectorAll('[data-lod]').forEach((x) => x.classList.remove('active'));
    b.classList.add('active');
    // TODO: ganti model gedung sesuai LOD (glTF untuk LOD 2 dan 3).
  })
);
