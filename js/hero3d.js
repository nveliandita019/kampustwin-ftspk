/**
 * Model 3D gedung rektorat ITS di halaman depan.
 *
 * Bentuk dan warnanya mengikuti tampak depan gedungnya: tiga lantai
 * berdinding putih, pita jendela kaca hijau kebiruan, bidang tengah
 * menjorok ke depan yang memanggul lambang ITS, atap limas genting
 * oranye dengan lantai jendela kecil di puncaknya, serta tiang bendera
 * di halaman muka. Sisi dan belakangnya tidak ada di foto, jadi bagian
 * itu disusun mengikuti irama muka — pita jendela dengan tinggi yang
 * sama, atap yang menaungi keempat sisi.
 *
 * Ini model ilustratif, bukan hasil ukur. Yang hasil ukur sungguhan ada
 * di peta: gaussian splatting dari pemotretan drone.
 *
 * Tiga ragam gambar di sini sengaja dibuat sejajar dengan tiga mode di
 * aplikasi peta: padat (seperti splat), blok (seperti footprint yang
 * diekstrusi), titik (awan titik). Ragam blok dan titik tidak punya
 * daftar sendiri — keduanya diturunkan dari geometri ragam padat, jadi
 * mengubah satu massa cukup sekali.
 *
 * Satuannya kira-kira meter: gedungnya 50 lebar, 30 dalam, 25,8 sampai
 * tepi atap.
 *
 * three.js dipin di 0.178.0 lewat importmap di index.html, versi yang
 * sama dengan yang dipakai aplikasi peta.
 */

import * as THREE from 'three';

/* Diambil dari foto gedungnya, bukan dari palet situs: di sini yang
   dikejar kemiripan, bukan keserasian dengan halaman. Satu-satunya yang
   dipinjam dari css/tema.css adalah biru untuk grid dan garis blok. */
const WARNA = {
  dinding: 0xf6f4ef,      /* plester putih gading                      */
  dindingTeduh: 0xe6e1d6, /* plint dan tapak                           */
  kaca: 0x2f7174,         /* pita jendela, hijau kebiruan              */
  kacaTua: 0x1b4f52,      /* jendela lantai atap                       */
  genting: 0xdf4a1d,      /* atap limas                                */
  gentingTua: 0xb73a14,   /* atap kecil di puncak                      */
  kayu: 0xdca96c,         /* langit-langit teras masuk                 */
  emas: 0xd4a017,         /* pucuk tiang bendera dan mustaka           */
  merah: 0xd4291d,        /* separuh atas bendera                      */
  logoBiru: 0x2f6fae,
};

const BIRU = 0x0067ae;    /* grid tanah, milik situs                   */
const BIRU_TUA = 0x013a63;

/* ------------------------------------------------------------- ukuran -- */

const LEBAR = 50;         /* badan gedung                              */
const DALAM = 30;
const LANTAI = 2.3;       /* muka dinding mulai di sini                */
const ATAS = 25.8;        /* tepi atap                                 */
const MUKA = DALAM / 2;   /* z muka dinding                            */

/* Pita jendela tiap lantai: [y pusat, tinggi] */
const PITA = [
  [7.0, 4.8],
  [14.0, 4.8],
  [20.6, 4.0],
];

/* Panel kaca di muka, per pita: [x pusat, lebar]. Sayap kiri dan kanan
   masing-masing dibelah satu pilaster, persis seperti di fotonya. */
const PANEL_MUKA = [-20.5, -12.1, 12.1, 20.5];

const TINGGI = ATAS - LANTAI;          /* tinggi dinding                */
const PUSAT = (ATAS + LANTAI) / 2;     /* y pusatnya                    */
const RELUNG = 3.2;                    /* dalamnya teras masuk          */
const Z_RELUNG = MUKA - RELUNG;        /* muka dinding di dalam teras   */

/**
 * Daftar massa berbentuk balok.
 * [lebar, tinggi, dalam, x, y pusat, z, peran]
 *
 * Badannya dipecah tiga — sayap kiri, sayap kanan, dan dinding yang
 * mundur di tengah — bukan satu balok lebar. Kalau satu balok, teras
 * masuknya tidak bisa benar-benar menjorok ke dalam: kacanya akan
 * terkubur di dalam dinding dan tak satu piksel pun kelihatan.
 */
const MASSA = [
  /* tapak dan plint */
  [58, 0.9, 38, 0, 0.45, 0, 'dindingTeduh'],
  [52, 1.4, 31, 0, 1.6, 0, 'dindingTeduh'],

  /* badan: dua sayap dan dinding dalam teras */
  [18, TINGGI, DALAM, -16, PUSAT, 0, 'dinding'],
  [18, TINGGI, DALAM, 16, PUSAT, 0, 'dinding'],
  [14, TINGGI, DALAM - RELUNG, 0, PUSAT, -RELUNG / 2, 'dinding'],

  /* pier yang mengapit teras, sekaligus dinding sampingnya */
  [1.8, TINGGI, RELUNG + 0.4, -7.6, PUSAT, MUKA - RELUNG / 2, 'dinding'],
  [1.8, TINGGI, RELUNG + 0.4, 7.6, PUSAT, MUKA - RELUNG / 2, 'dinding'],
  /* pilaster yang membelah tiap sayap */
  [1.5, TINGGI, 0.7, -16.3, PUSAT, MUKA, 'dinding'],
  [1.5, TINGGI, 0.7, 16.3, PUSAT, MUKA, 'dinding'],

  /* isi teras: dua lantai kaca dengan pelat lantai di antaranya */
  [14, 6.4, 0.5, 0, 6.2, Z_RELUNG + 0.25, 'kaca'],
  [14, 1.2, RELUNG, 0, 10.0, MUKA - RELUNG / 2, 'dinding'],
  [14, 5.6, 0.5, 0, 13.6, Z_RELUNG + 0.25, 'kaca'],
  /* langit-langit teras — satu-satunya bidang hangat di seluruh muka */
  [14.6, 0.55, RELUNG + 0.2, 0, 16.9, MUKA - RELUNG / 2, 'kayu'],

  /* bidang tengah berlambang: menjorok melewati tepi atap */
  [15, 10.5, 1.8, 0, 22.15, MUKA + 0.8, 'dinding'],

  /* lantai jendela di atas atap, menembus bubungan */
  [24, 2.4, 8, 0, 31.0, 0, 'dinding'],
  [21, 1.5, 8.3, 0, 31.1, 0, 'kacaTua'],

  /* alas tiang bendera di halaman muka */
  [2.6, 2.0, 2.6, 0, 1.9, 18.5, 'dindingTeduh'],
];

/*
 * Pita jendela di muka, sisi, dan belakang. Semuanya sedikit menonjol,
 * bukan masuk ke dalam: dindingnya balok pejal, jadi panel yang dibuat
 * rata atau mundur akan hilang di balik dinding.
 */
for (const [y, t] of PITA) {
  for (const x of PANEL_MUKA) {
    MASSA.push([7.0, t, 0.6, x, y, MUKA - 0.1, 'kaca']);
  }
  /* sisi dan belakang: tebakan, tapi tingginya harus sama persis dengan
     muka, kalau tidak gedungnya terbaca seperti dua bangunan berbeda */
  MASSA.push([0.6, t, 20, -LEBAR / 2 + 0.1, y, 0, 'kaca']);
  MASSA.push([0.6, t, 20, LEBAR / 2 - 0.1, y, 0, 'kaca']);
  MASSA.push([38, t, 0.6, 0, y, -MUKA + 0.1, 'kaca']);
}

/* Bidang tengah lantai tiga tidak berjendela — di fotonya di situlah
   lambangnya dipasang. */

/** Atap limas: [lebar, dalam, tinggi, inset bubungan, y alas, peran] */
const ATAP = [
  [54, 33, 5.6, 15, ATAS, 'genting'],
  [26, 10, 2.6, 5, 32.2, 'gentingTua'],
];

/* Peran yang terlalu kecil untuk ikut ragam blok: di ragam itu yang
   dicari massa bangunannya, bukan perabotnya. */
const KECIL = new Set(['kayu', 'emas', 'merah', 'logoBiru', 'kacaTua']);

/* ------------------------------------------------------------- bentuk -- */

/**
 * Atap limas: empat bidang miring bertemu di satu bubungan sepanjang
 * sumbu x. Tidak bisa dibikin dari BoxGeometry, dan CylinderGeometry
 * bersegi empat cuma memberi limas terpancung — bubungannya jadi bidang,
 * bukan garis. Jadi delapan segitiganya ditulis sendiri.
 */
function geoAtapLimas(w, d, h, inset) {
  const x = w / 2;
  const z = d / 2;
  const r = x - inset;

  /* A..D alas searah jarum jam dilihat dari atas, E dan F ujung bubungan */
  const A = [-x, 0, z];
  const B = [x, 0, z];
  const C = [x, 0, -z];
  const D = [-x, 0, -z];
  const E = [-r, h, 0];
  const F = [r, h, 0];

  const titik = [
    A, B, F, A, F, E,   /* bidang depan   */
    C, D, E, C, E, F,   /* bidang belakang */
    B, C, F,            /* jurai kanan    */
    D, A, E,            /* jurai kiri     */
    A, D, C, A, C, B,   /* alas, supaya tertutup waktu disebar jadi titik */
  ];

  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(titik.flat(), 3));
  g.computeVertexNormals();
  return g;
}

/* ------------------------------------------------- sebar titik di muka -- */

/**
 * Siapkan tabel luas segitiga kumulatif sebuah geometri, supaya titik
 * bisa disebar merata per satuan luas dan bukan per segitiga — kalau
 * per segitiga, bidang sempit akan sepadat bidang lebar.
 */
function tabelLuas(geo) {
  const pos = geo.attributes.position;
  const idx = geo.index;
  const jml = (idx ? idx.count : pos.count) / 3;
  const kum = new Float64Array(jml);
  const a = new THREE.Vector3();
  const b = new THREE.Vector3();
  const c = new THREE.Vector3();
  const u = new THREE.Vector3();
  const v = new THREE.Vector3();

  let total = 0;
  for (let t = 0; t < jml; t++) {
    const i0 = idx ? idx.getX(t * 3) : t * 3;
    const i1 = idx ? idx.getX(t * 3 + 1) : t * 3 + 1;
    const i2 = idx ? idx.getX(t * 3 + 2) : t * 3 + 2;
    a.fromBufferAttribute(pos, i0);
    b.fromBufferAttribute(pos, i1);
    c.fromBufferAttribute(pos, i2);
    total += u.subVectors(b, a).cross(v.subVectors(c, a)).length() / 2;
    kum[t] = total;
  }
  return { kum, total, pos, idx, jml };
}

/** Cari segitiga yang memuat nilai luas tertentu. */
function cariRuas(kum, nilai) {
  let lo = 0;
  let hi = kum.length - 1;
  while (lo < hi) {
    const tengah = (lo + hi) >> 1;
    if (kum[tengah] < nilai) lo = tengah + 1;
    else hi = tengah;
  }
  return lo;
}

/** Sebar n titik di permukaan geo, sesudah digeser oleh matriks. */
function sebar(tabel, matriks, n, keluar, mulai) {
  const { kum, total, pos, idx } = tabel;
  const a = new THREE.Vector3();
  const b = new THREE.Vector3();
  const c = new THREE.Vector3();
  const p = new THREE.Vector3();

  for (let i = 0; i < n; i++) {
    const t = cariRuas(kum, Math.random() * total);
    const i0 = idx ? idx.getX(t * 3) : t * 3;
    const i1 = idx ? idx.getX(t * 3 + 1) : t * 3 + 1;
    const i2 = idx ? idx.getX(t * 3 + 2) : t * 3 + 2;
    a.fromBufferAttribute(pos, i0);
    b.fromBufferAttribute(pos, i1);
    c.fromBufferAttribute(pos, i2);

    /* Koordinat barisentrik acak yang merata di segitiga. */
    let s = Math.random();
    let u = Math.random();
    if (s + u > 1) { s = 1 - s; u = 1 - u; }

    p.copy(a)
      .addScaledVector(b.sub(a), s)
      .addScaledVector(c.sub(a), u)
      .applyMatrix4(matriks);

    const k = (mulai + i) * 3;
    keluar[k] = p.x;
    keluar[k + 1] = p.y;
    keluar[k + 2] = p.z;
  }
  return mulai + n;
}

/* -------------------------------------------------------------- bantu -- */

/** Tekstur kisi kusen: satu tekstur untuk semua pita jendela. */
function teksturKaca() {
  const c = document.createElement('canvas');
  c.width = 256;
  c.height = 128;
  const g = c.getContext('2d');
  g.fillStyle = '#3f8e90';
  g.fillRect(0, 0, 256, 128);

  /* Pantulan langit: jendela di lantai atas selalu lebih terang. */
  const kilau = g.createLinearGradient(0, 0, 0, 128);
  kilau.addColorStop(0, 'rgba(206, 234, 236, 0.46)');
  kilau.addColorStop(0.55, 'rgba(206, 234, 236, 0.10)');
  kilau.addColorStop(1, 'rgba(14, 54, 58, 0.16)');
  g.fillStyle = kilau;
  g.fillRect(0, 0, 256, 128);

  g.strokeStyle = 'rgba(238, 240, 236, 0.85)';
  g.lineWidth = 4;
  for (let i = 1; i < 8; i++) {
    const x = (256 / 8) * i;
    g.beginPath(); g.moveTo(x, 0); g.lineTo(x, 128); g.stroke();
  }
  g.beginPath(); g.moveTo(0, 64); g.lineTo(256, 64); g.stroke();

  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

/** Bayangan kontak: tekstur gradien radial, dipakai sebagai alas lembut. */
function teksturBayangan() {
  const c = document.createElement('canvas');
  c.width = c.height = 256;
  const g = c.getContext('2d');
  const grad = g.createRadialGradient(128, 128, 0, 128, 128, 128);
  grad.addColorStop(0, 'rgba(1, 58, 99, 0.30)');
  grad.addColorStop(0.45, 'rgba(1, 58, 99, 0.13)');
  grad.addColorStop(1, 'rgba(1, 58, 99, 0)');
  g.fillStyle = grad;
  g.fillRect(0, 0, 256, 256);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

/**
 * Graticule tanah: garis grid yang memudar ke tepi.
 * Pemudarannya pakai alfa per-verteks, jadi tiap garis dipotong-potong
 * dulu supaya nilai alfanya mengikuti jarak sebenarnya dari pusat.
 */
function graticuleTanah(ukuran = 112, bagi = 16, potong = 14) {
  const pos = [];
  const warna = [];
  const c = new THREE.Color(BIRU);
  const setengah = ukuran / 2;
  const langkah = ukuran / bagi;

  const tambah = (x, z) => {
    pos.push(x, 0, z);
    const jarak = Math.hypot(x, z) / setengah;
    warna.push(c.r, c.g, c.b, Math.max(0, 1 - jarak * jarak) * 0.5);
  };

  for (let i = 0; i <= bagi; i++) {
    const t = -setengah + i * langkah;
    for (let j = 0; j < potong; j++) {
      const a = -setengah + (ukuran * j) / potong;
      const b = -setengah + (ukuran * (j + 1)) / potong;
      tambah(a, t); tambah(b, t);
      tambah(t, a); tambah(t, b);
    }
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.setAttribute('color', new THREE.Float32BufferAttribute(warna, 4));
  return new THREE.LineSegments(
    geo,
    new THREE.LineBasicMaterial({ vertexColors: true, transparent: true, depthWrite: false })
  );
}

/* ----------------------------------------------------------------- adegan -- */

/**
 * @param {HTMLCanvasElement} kanvas
 * @returns {{setRagam: Function, hancurkan: Function} | null} null kalau WebGL mati.
 */
export function buatAdegan(kanvas) {
  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas: kanvas, antialias: true, alpha: true });
  } catch {
    return null;
  }
  if (!renderer.getContext()) return null;

  /*
   * Gerakannya tidak dimatikan waktu sistem minta hemat gerak: Windows
   * mengirim sinyal itu begitu "Show animations" dipadamkan, dan model ini
   * tetap harus hidup di laptop tersebut. Yang berubah hanya kecepatannya.
   */
  const pelanGerak = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setClearAlpha(0);
  renderer.outputColorSpace = THREE.SRGBColorSpace;

  const adegan = new THREE.Scene();
  const kamera = new THREE.PerspectiveCamera(34, 1, 1, 500);

  /* Semua isi digantung di satu pivot supaya memutarnya cukup satu objek. */
  const pivot = new THREE.Group();
  adegan.add(pivot);

  /* -- cahaya: tanpa shadow map, bayangannya dipalsukan dengan tekstur -- */
  adegan.add(new THREE.HemisphereLight(0xdcebf8, 0xfff6e8, 1.9));

  const kunci = new THREE.DirectionalLight(0xfff4e2, 2.2);
  kunci.position.set(30, 44, 30);
  adegan.add(kunci);

  const isi = new THREE.DirectionalLight(0xcfe4f6, 1.0);
  isi.position.set(-28, 14, -22);
  adegan.add(isi);

  /* -- alas -- */
  const bayangan = new THREE.Mesh(
    new THREE.PlaneGeometry(132, 132),
    new THREE.MeshBasicMaterial({
      map: teksturBayangan(), transparent: true, depthWrite: false,
    })
  );
  bayangan.rotation.x = -Math.PI / 2;
  bayangan.position.y = 0.02;
  pivot.add(bayangan);

  const grid = graticuleTanah();
  pivot.add(grid);

  /* -- ragam 1: padat -------------------------------------------------- */

  const gPadat = new THREE.Group();
  const bahanPadat = new Map();
  const petaKaca = teksturKaca();

  function bahanPeran(peran) {
    if (bahanPadat.has(peran)) return bahanPadat.get(peran);
    const kaca = peran === 'kaca' || peran === 'kacaTua';
    const berpeta = peran === 'kaca';
    const b = new THREE.MeshStandardMaterial({
      /* Warna bahan dikalikan dengan teksturnya, jadi yang bertekstur
         harus putih — kalau tidak, hijau kali hijau jadi hitam. */
      color: berpeta ? 0xffffff : WARNA[peran],
      map: berpeta ? petaKaca : null,
      roughness: kaca ? 0.22 : peran === 'genting' || peran === 'gentingTua' ? 0.72 : 0.84,
      metalness: kaca ? 0.3 : peran === 'emas' ? 0.6 : 0.02,
      transparent: true,
    });
    bahanPadat.set(peran, b);
    return b;
  }

  /* Tiap bagian dicatat sekali di sini; ragam blok dan ragam titik
     dibangun ulang dari catatan ini, bukan dari daftar terpisah. */
  const bagian = [];
  const geometri = [];

  function tambah(geo, peran, x, y, z, putar) {
    const m = new THREE.Mesh(geo, bahanPeran(peran));
    m.position.set(x, y, z);
    if (putar) m.rotation.set(putar[0], putar[1], putar[2]);
    m.updateMatrix();
    gPadat.add(m);
    geometri.push(geo);
    bagian.push({ geo, matriks: m.matrix.clone(), peran });
    return m;
  }

  for (const [w, h, d, x, y, z, peran] of MASSA) {
    tambah(new THREE.BoxGeometry(w, h, d), peran, x, y, z);
  }

  for (const [w, d, h, inset, y, peran] of ATAP) {
    tambah(geoAtapLimas(w, d, h, inset), peran, 0, y, 0);
  }

  /* -- lambang ITS di bidang tengah -- */
  /* Muka bidang tengahnya di MUKA + 1,7; lambangnya ditempel di situ. */
  const zLambang = MUKA + 1.72;
  tambah(
    new THREE.CylinderGeometry(3.1, 3.1, 0.18, 40), 'dinding',
    0, 23.4, zLambang, [Math.PI / 2, 0, 0],
  );
  tambah(
    new THREE.TorusGeometry(2.6, 0.42, 10, 28), 'logoBiru',
    0, 23.4, zLambang + 0.14,
  );
  tambah(
    new THREE.SphereGeometry(0.85, 16, 12), 'emas',
    0, 23.4, zLambang + 0.1,
  );

  /* -- tiang bendera -- */
  const zTiang = 18.5;
  tambah(
    new THREE.CylinderGeometry(0.2, 0.26, 30, 14), 'dinding',
    0, 17.9, zTiang,
  );
  tambah(new THREE.SphereGeometry(0.42, 14, 10), 'emas', 0, 33.1, zTiang);
  /*
   * Benderanya terkulai di tiang, seperti di fotonya: merah di atas.
   * Digantung setinggi lantai dua, bukan di puncak tiang — di puncak,
   * separuh putihnya hilang di depan bidang putih yang memanggul
   * lambang, dan merahnya menutup lambang itu sendiri.
   */
  tambah(new THREE.BoxGeometry(2.6, 3.4, 0.12), 'merah', 1.4, 19.0, zTiang);
  tambah(new THREE.BoxGeometry(2.6, 3.4, 0.12), 'dinding', 1.4, 15.6, zTiang);

  /* -- mustaka kecil di puncak atap -- */
  tambah(new THREE.SphereGeometry(0.5, 14, 10), 'emas', 0, 35.2, 0);

  pivot.add(gPadat);

  /* -- ragam 2: blok --------------------------------------------------- */

  const gBlok = new THREE.Group();
  const bahanBlokIsi = new THREE.MeshBasicMaterial({
    color: BIRU, transparent: true, opacity: 0, depthWrite: false,
  });
  const bahanBlokGaris = new THREE.LineBasicMaterial({
    color: BIRU_TUA, transparent: true, opacity: 0,
  });

  for (const { geo, matriks, peran } of bagian) {
    if (KECIL.has(peran)) continue;
    const isiMesh = new THREE.Mesh(geo, bahanBlokIsi);
    isiMesh.applyMatrix4(matriks);
    gBlok.add(isiMesh);

    const tepi = new THREE.EdgesGeometry(geo, 18);
    geometri.push(tepi);
    const garis = new THREE.LineSegments(tepi, bahanBlokGaris);
    garis.applyMatrix4(matriks);
    gBlok.add(garis);
  }
  pivot.add(gBlok);

  /* -- ragam 3: titik -------------------------------------------------- */

  const KERAPATAN = 2.4; /* titik per satuan luas permukaan */
  const tabel = bagian.map(({ geo }) => tabelLuas(geo));
  const jatah = tabel.map((t) => Math.max(12, Math.round(t.total * KERAPATAN)));
  const jumlahTitik = jatah.reduce((a, b) => a + b, 0);

  const tujuan = new Float32Array(jumlahTitik * 3);
  let tulis = 0;
  bagian.forEach(({ matriks }, i) => {
    tulis = sebar(tabel[i], matriks, jatah[i], tujuan, tulis);
  });

  /* Posisi awal: dihambur ke atas dan ke luar, lalu merapat saat halaman
     dibuka. Inilah satu-satunya animasi otomatis di hero ini. */
  const awal = new Float32Array(tujuan);
  for (let i = 0; i < jumlahTitik; i++) {
    const k = i * 3;
    const sudut = Math.random() * Math.PI * 2;
    const jauh = 16 + Math.random() * 30;
    awal[k] += Math.cos(sudut) * jauh;
    awal[k + 1] += Math.random() * 34 + 5;
    awal[k + 2] += Math.sin(sudut) * jauh;
  }

  /* Titiknya mewarisi warna bagian asalnya, jadi awan titik masih terbaca
     sebagai gedung yang sama — bukan sekadar gumpalan biru. */
  const warnaTitik = new Float32Array(jumlahTitik * 3);
  const c = new THREE.Color();
  let kursor = 0;
  bagian.forEach(({ peran }, i) => {
    c.setHex(WARNA[peran]).convertSRGBToLinear();
    for (let j = 0; j < jatah[i]; j++) {
      /* Sedikit gelap-terang acak supaya permukaannya tidak rata mati. */
      const g = 0.82 + Math.random() * 0.36;
      const k = (kursor + j) * 3;
      warnaTitik[k] = c.r * g;
      warnaTitik[k + 1] = c.g * g;
      warnaTitik[k + 2] = c.b * g;
    }
    kursor += jatah[i];
  });

  const geoTitik = new THREE.BufferGeometry();
  geoTitik.setAttribute('position', new THREE.BufferAttribute(new Float32Array(awal), 3));
  geoTitik.setAttribute('color', new THREE.BufferAttribute(warnaTitik, 3));
  geometri.push(geoTitik);

  const bahanTitik = new THREE.PointsMaterial({
    size: 0.34,
    vertexColors: true,
    transparent: true,
    opacity: 1,
    sizeAttenuation: true,
    depthWrite: false,
  });
  const gTitik = new THREE.Points(geoTitik, bahanTitik);
  pivot.add(gTitik);

  /* ------------------------------------------------------------ keadaan -- */

  const RAGAM = { padat: 0, blok: 1, titik: 2 };
  let ragam = 'padat';
  /* Bobot tiap ragam, selalu menuju target. Perpindahan = silang pudar. */
  const bobot = [0, 0, 1];
  const target = [0, 0, 1];

  let yaw = -0.46;
  let pitch = 0.26;
  let yawTarget = yaw;
  let pitchTarget = pitch;
  let seret = false;
  let seretPernah = false;
  let diamSejak = performance.now();
  const onSeretPertama = [];

  /* Animasi masuk: 0 sampai 1 selama ~1,6 detik. */
  let masuk = 0;
  let mulaiPada = 0;

  const dentuman = (t) => 1 - Math.pow(1 - t, 3);

  /* ------------------------------------------------------------ ukuran -- */

  function ukurUlang() {
    const r = kanvas.parentElement.getBoundingClientRect();
    if (!r.width || !r.height) return;
    renderer.setSize(r.width, r.height, false);
    kamera.aspect = r.width / r.height;

    /* Pada layar sempit bangunan ditarik mundur supaya tetap utuh. */
    const jauh = r.width < 520 ? 142 : r.width < 760 ? 126 : 116;
    kamera.userData.jarak = jauh;
    kamera.updateProjectionMatrix();
  }

  const pengamat = new ResizeObserver(ukurUlang);
  pengamat.observe(kanvas.parentElement);
  ukurUlang();

  /* ------------------------------------------------------------- seret -- */

  let xTerakhir = 0;
  let yTerakhir = 0;

  function turun(e) {
    seret = true;
    xTerakhir = e.clientX;
    yTerakhir = e.clientY;
    kanvas.setPointerCapture(e.pointerId);
    if (!seretPernah) {
      seretPernah = true;
      for (const fn of onSeretPertama) fn();
    }
  }

  function gerak(e) {
    if (!seret) return;
    yawTarget -= (e.clientX - xTerakhir) * 0.008;
    pitchTarget = Math.max(-0.1, Math.min(0.8, pitchTarget + (e.clientY - yTerakhir) * 0.005));
    xTerakhir = e.clientX;
    yTerakhir = e.clientY;
    diamSejak = performance.now();
  }

  function naik(e) {
    seret = false;
    diamSejak = performance.now();
    try { kanvas.releasePointerCapture(e.pointerId); } catch { /* sudah lepas */ }
  }

  kanvas.addEventListener('pointerdown', turun);
  kanvas.addEventListener('pointermove', gerak);
  kanvas.addEventListener('pointerup', naik);
  kanvas.addEventListener('pointercancel', naik);

  /* Keyboard: panah kiri/kanan memutar, supaya tidak hanya bisa diseret. */
  kanvas.tabIndex = 0;
  kanvas.setAttribute('role', 'img');
  kanvas.setAttribute('aria-label',
    'Model tiga dimensi gedung rektorat ITS: tiga lantai berdinding putih, ' +
    'pita jendela hijau kebiruan, atap limas genting oranye, dan tiang ' +
    'bendera di halaman muka. Panah kiri dan kanan memutarnya.');
  kanvas.addEventListener('keydown', (e) => {
    if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
    e.preventDefault();
    yawTarget += e.key === 'ArrowLeft' ? -0.25 : 0.25;
    diamSejak = performance.now();
    if (!seretPernah) {
      seretPernah = true;
      for (const fn of onSeretPertama) fn();
    }
  });

  /* ------------------------------------------------------------ gambar -- */

  let hidup = true;
  const posTitik = geoTitik.attributes.position;

  let jalan = true;

  function bingkai(waktu) {
    if (!hidup) return;
    requestAnimationFrame(bingkai);
    if (!jalan) return;

    if (!mulaiPada) mulaiPada = waktu;

    /* Titik merapat ke tempatnya. */
    if (masuk < 1) {
      masuk = Math.min(1, (waktu - mulaiPada) / 1600);
      const t = dentuman(masuk);
      const a = posTitik.array;
      for (let i = 0; i < a.length; i++) a[i] = awal[i] + (tujuan[i] - awal[i]) * t;
      posTitik.needsUpdate = true;

      /* Ragam padat baru menyusul setelah titik hampir sampai. */
      if (masuk > 0.52) {
        target[RAGAM.padat] = 1;
        target[RAGAM.titik] = 0;
      }
    }

    /* Silang pudar antar ragam. */
    let berubah = false;
    for (let i = 0; i < 3; i++) {
      const d = target[i] - bobot[i];
      if (Math.abs(d) > 0.001) { bobot[i] += d * 0.13; berubah = true; }
      else if (bobot[i] !== target[i]) { bobot[i] = target[i]; berubah = true; }
    }
    if (berubah) terapkanBobot();

    /* Putar sendiri saat tidak disentuh. */
    if (!seret && waktu - diamSejak > 1800) yawTarget += pelanGerak ? 0.0008 : 0.0016;

    yaw += (yawTarget - yaw) * 0.085;
    pitch += (pitchTarget - pitch) * 0.085;
    pivot.rotation.y = yaw;

    const jarak = kamera.userData.jarak || 116;
    kamera.position.set(
      0,
      Math.sin(pitch) * jarak + 13,
      Math.cos(pitch) * jarak
    );
    kamera.lookAt(0, 14, 0);

    renderer.render(adegan, kamera);
  }

  function terapkanBobot() {
    const [p, b, t] = bobot;

    for (const bahan of bahanPadat.values()) bahan.opacity = p;
    gPadat.visible = p > 0.01;

    bahanBlokIsi.opacity = b * 0.16;
    bahanBlokGaris.opacity = b * 0.95;
    gBlok.visible = b > 0.01;

    bahanTitik.opacity = t;
    gTitik.visible = t > 0.01;

    /* Bayangan dan grid ikut nada ragam yang sedang kuat. */
    bayangan.material.opacity = 0.35 + p * 0.65;
  }

  terapkanBobot();
  requestAnimationFrame(bingkai);

  /* ------------------------------------------------------------ keluar -- */

  return {
    setRagam(nama) {
      if (!(nama in RAGAM) || nama === ragam) return;
      ragam = nama;
      for (let i = 0; i < 3; i++) target[i] = 0;
      target[RAGAM[nama]] = 1;
      /* Animasi masuk dianggap selesai begitu pengguna memilih sendiri. */
      masuk = 1;
      diamSejak = performance.now();
    },

    saatSeretPertama(fn) { onSeretPertama.push(fn); },

    /* Dipakai halaman depan untuk berhenti menggambar waktu keluar layar. */
    jeda() { jalan = false; },
    lanjut() { jalan = true; },

    hancurkan() {
      hidup = false;
      pengamat.disconnect();
      kanvas.removeEventListener('pointerdown', turun);
      kanvas.removeEventListener('pointermove', gerak);
      kanvas.removeEventListener('pointerup', naik);
      kanvas.removeEventListener('pointercancel', naik);
      for (const g of geometri) g.dispose();
      petaKaca.dispose();
      renderer.dispose();
    },
  };
}
