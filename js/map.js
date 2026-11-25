/**
 * Inisialisasi MapLibre dan pergantian basemap.
 *
 * Ketiga basemap dipasang sekaligus sebagai layer raster, lalu ditukar
 * dengan visibility. Sengaja tidak memakai map.setStyle(), karena itu
 * membuang semua source dan layer yang sudah kita tambahkan -- termasuk
 * splat-nya -- dan harus dirangkai ulang dari nol.
 */

import { PUSAT, ZOOM_AWAL, PITCH_AWAL, BEARING_AWAL } from './config.js';

/**
 * tileSize wajib cocok dengan ukuran piksel tile sebenarnya. URL @2x
 * CARTO mengirim tile 512 px; kalau tetap ditulis 256, MapLibre salah
 * menghitung dan meminta satu tingkat zoom lebih dalam dari yang perlu.
 */
const BASEMAP = {
  // Esri Light Gray Canvas: nada abu-biru muda, cocok dengan tema putih
  // ITS dan membuat splat berwarna tetap menonjol di atasnya.
  terang: {
    tiles: ['https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Base/MapServer/tile/{z}/{y}/{x}'],
    tileSize: 256,
    maxzoom: 16,
    attribution: '© Esri, HERE, Garmin, © OpenStreetMap contributors',
  },
  // CARTO dark_all sempat dipakai, tapi sejak akhir 2026 tile-nya
  // mengembalikan gambar "API KEY REQUIRED". Esri Dark Gray Canvas
  // masih bebas kunci dan satu penyedia dengan layer satelit di bawah.
  gelap: {
    tiles: ['https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}'],
    tileSize: 256,
    maxzoom: 16,
    attribution: '© Esri, HERE, Garmin, © OpenStreetMap contributors',
  },
  satelit: {
    tiles: ['https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'],
    tileSize: 256,
    attribution: 'Citra © Esri, Maxar, Earthstar Geographics',
  },
  osm: {
    tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
    tileSize: 256,
    attribution: '© OpenStreetMap contributors',
  },
};

export const BASEMAP_AWAL = 'terang';

/**
 * Piksel backbuffer per piksel CSS.
 *
 * Rasio layarnya sendiri, tapi dibatasi supaya sisi terpendek kanvas
 * paling banyak 2160 piksel — 1080 di perangkat bergerak. Disalin dari
 * `canvasPixelRatio()` di viewer SuperSplat, dan alasannya sama: biaya
 * menggambar splat sebanding lurus dengan jumlah piksel, jadi layar
 * ber-DPI tinggi membayar dua sampai empat kali lipat untuk ketajaman
 * yang hampir tidak terlihat pada gaussian yang tepinya memang lembut.
 *
 * Di layar biasa nilainya sama dengan devicePixelRatio, jadi tidak ada
 * yang berubah. Yang terbantu justru laptop ber-DPI tinggi, yang
 * selama ini paling berat menjalankan halaman ini.
 */
function rasioPiksel() {
  const bergerak = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
  const maksSisi = bergerak ? 1080 : 2160;
  const sisiPendek = Math.min(screen.width, screen.height) || 1080;
  return Math.min(maksSisi / sisiPendek, window.devicePixelRatio || 1);
}

/** Urutan ini juga jadi urutan layer di peta, jadi basemap selalu paling bawah. */
const URUTAN = ['terang', 'gelap', 'satelit', 'osm'];

export function buatPeta(container = 'map') {
  const sources = {};
  const layers = [];

  for (const key of URUTAN) {
    sources[`bm-${key}`] = {
      type: 'raster',
      tiles: BASEMAP[key].tiles,
      tileSize: BASEMAP[key].tileSize,
      attribution: BASEMAP[key].attribution,
      // Di atas maxzoom tile terakhir diregangkan, bukan dicari yang
      // tidak ada. Esri Dark Gray berhenti di z16, sementara kita
      // sering melihat kampus di z17-18.
      ...(BASEMAP[key].maxzoom ? { maxzoom: BASEMAP[key].maxzoom } : {}),
    };
    layers.push({
      id: `bm-${key}`,
      type: 'raster',
      source: `bm-${key}`,
      layout: { visibility: key === BASEMAP_AWAL ? 'visible' : 'none' },
    });
  }

  const map = new maplibregl.Map({
    container,
    center: PUSAT,
    zoom: ZOOM_AWAL,
    pitch: PITCH_AWAL,
    bearing: BEARING_AWAL,
    maxPitch: 85,
    /*
     * MSAA dimatikan. Splat adalah jutaan quad beralpha yang digambar
     * ke framebuffer yang sama; dengan MSAA tiap pikselnya dibayar
     * berkali-kali, dan gaussian yang tepinya memang lembut tidak
     * mendapat apa-apa dari situ. Viewer SuperSplat juga membuat
     * device-nya dengan antialias: false.
     *
     * Harganya: tepi gedung di mode Blok 3D jadi lebih bergerigi. Itu
     * ditukar sadar dengan peta yang lancar waktu diseret.
     */
    antialias: false,
    pixelRatio: rasioPiksel(),
    style: { version: 8, sources, layers, glyphs: 'https://demotiles.maplibre.org/font/{fontstack}/{range}.pbf' },
  });

  map.addControl(new maplibregl.NavigationControl({ visualizePitch: true }), 'bottom-right');
  map.addControl(new maplibregl.ScaleControl({ maxWidth: 100, unit: 'metric' }), 'bottom-left');

  return map;
}

/**
 * Gambar hanya waktu perlu.
 *
 * Plugin splat memanggil map.triggerRepaint() di setiap bingkai, jadi
 * peta tidak pernah berhenti menggambar. Diukur di halaman ini: 113
 * bingkai per detik sementara tidak ada seorang pun menyentuh peta,
 * masing-masing 3,5 juta piksel gaussian beralpha. Laju gambarnya
 * sendiri tidak pernah jadi masalah — yang jadi masalah GPU yang tidak
 * pernah menganggur. Itu yang membuat kipas menyala dan seluruh jendela
 * terasa berat, bukan jumlah gaussian-nya.
 *
 * Jadi triggerRepaint dibungkus. Panggilan hanya diteruskan selama
 * "jendela sadar" masih terbuka, dan jendela itu dibuka ulang oleh apa
 * pun yang benar-benar mengubah gambar: sentuhan di kanvas, gerak
 * kamera, data layer yang baru datang. Ia menutup sendiri `jeda`
 * milidetik setelah yang terakhir. Waktu tidak ada apa-apa, peta diam
 * sepenuhnya, dan bingkai terakhir yang sudah tergambar tetap terlihat.
 *
 * `jeda` sengaja tidak pendek. Spark menyusun ulang urutan gaussian
 * secara asinkron sesudah kamera berhenti, dan penyusunan itu butuh
 * beberapa bingkai lagi. Jendela yang menutup terlalu cepat akan
 * membekukan splat di urutan yang belum selesai.
 *
 * @returns {(ms?: number) => void} pembangun manual, untuk perubahan
 *   yang tidak memancarkan event peta — mis. opasitas splat.
 */
/**
 * Gerbang bingkai: tahan permintaan gambar selama GPU masih tertinggal.
 *
 * Peramban dengan senang hati mengantrekan bingkai jauh di depan GPU
 * yang sibuk. Akibatnya bukan laju gambar yang turun, melainkan JEDA:
 * yang Anda lihat adalah keadaan kamera beberapa bingkai yang lalu,
 * jadi peta terasa molor waktu diseret meskipun angka FPS-nya bagus.
 * Catatan di viewer SuperSplat menyebut angka ukurnya — sekitar 110 ms
 * di Chrome dengan WebGPU, dan 400 ms dengan WebGL.
 *
 * Jadi tiap bingkai yang sudah tergambar diberi pagar (`fenceSync`),
 * dan permintaan gambar baru ditahan selama masih ada `batas` pagar
 * yang belum dilewati GPU. Begitu satu selesai, bingkai yang tertunggak
 * digambar — dengan kamera di posisinya saat itu, bukan posisi lama.
 *
 * fenceSync hanya ada di WebGL2. Di WebGL1 fungsi ini mengembalikan
 * null dan pemanggilnya jalan tanpa gerbang, bukan gagal.
 */
function gerbangBingkai(map, batas) {
  const gl = map.painter?.context?.gl;
  if (!gl || typeof gl.fenceSync !== 'function') return null;

  const pagar = [];

  const bersihkan = () => {
    if (gl.isContextLost()) {
      pagar.length = 0;
      return;
    }
    while (pagar.length && gl.getSyncParameter(pagar[0], gl.SYNC_STATUS) === gl.SIGNALED) {
      gl.deleteSync(pagar.shift());
    }
  };

  /* Dipasang sesudah seluruh perintah gambar bingkai ini dikirim. */
  map.on('render', () => {
    bersihkan();
    const p = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
    if (p) pagar.push(p);
  });

  return () => {
    bersihkan();
    return pagar.length < batas;
  };
}

export function gambarSeperlunya(
  map, { jeda = 1200, ekor = 2500, awal = 20000, bingkaiDiAntrean = 2 } = {},
) {
  const gambar = map.triggerRepaint.bind(map);

  /* Dibuka lebar di awal: splat 30 MB perlu waktu diunduh dan diurai,
     dan selama itu belum tentu ada event peta sama sekali. */
  let sadarSampai = performance.now() + awal;

  /* Baru bisa dipasang sesudah peta punya konteks WebGL. */
  let bolehGambar = null;
  map.once('load', () => {
    bolehGambar = gerbangBingkai(map, bingkaiDiAntrean);
  });

  let tertunggak = false;

  /* Selama ada bingkai tertunggak, periksa tiap bingkai layar apakah
     GPU sudah menyusul. Gelung ini berhenti sendiri begitu lunas. */
  function tagih() {
    if (!tertunggak) return;
    if (!bolehGambar || bolehGambar()) {
      tertunggak = false;
      gambar();
      return;
    }
    requestAnimationFrame(tagih);
  }

  map.triggerRepaint = () => {
    if (performance.now() > sadarSampai) return;
    if (bolehGambar && !bolehGambar()) {
      if (!tertunggak) {
        tertunggak = true;
        requestAnimationFrame(tagih);
      }
      return;
    }
    gambar();
  };

  const bangunkan = (ms = jeda) => {
    sadarSampai = Math.max(sadarSampai, performance.now() + ms);
    gambar();
  };

  /*
   * Kanvas didengarkan langsung, bukan cuma lewat event kamera. Waktu
   * jendelanya sedang tertutup, panggilan triggerRepaint milik MapLibre
   * sendiri ikut tertelan — jadi kita harus sudah bangun sebelum
   * hitungan kameranya jalan, bukan sesudahnya.
   */
  const kanvas = map.getCanvasContainer();
  for (const ev of ['pointerdown', 'pointermove', 'wheel', 'touchstart', 'keydown']) {
    kanvas.addEventListener(ev, () => bangunkan(), { passive: true });
  }

  /* Gerak kamera, termasuk inersia dan easeTo, plus data yang datang. */
  for (const ev of ['movestart', 'move', 'zoom', 'rotate', 'pitch',
                    'resize', 'styledata', 'sourcedata']) {
    map.on(ev, () => bangunkan());
  }

  /* Ekor lebih panjang tepat sesudah kamera berhenti. Di situlah spark
     menyelesaikan penyusunan urutan gaussian untuk sudut pandang yang
     baru; jendela yang menutup lebih cepat dari itu akan meninggalkan
     splat dalam urutan yang belum selesai sampai disentuh lagi. */
  map.on('moveend', () => bangunkan(ekor));

  return bangunkan;
}

/** Tampilkan satu basemap, sembunyikan sisanya. */
export function gantiBasemap(map, key) {
  if (!BASEMAP[key]) return;
  for (const k of URUTAN) {
    if (!map.getLayer(`bm-${k}`)) continue;
    map.setLayoutProperty(`bm-${k}`, 'visibility', k === key ? 'visible' : 'none');
  }
}
