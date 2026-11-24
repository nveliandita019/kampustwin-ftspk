/**
 * Faktor skala Mercator untuk maplibre-gl-splat.
 *
 * ================== KENAPA FILE INI ADA ==================
 *
 * Opsi `scale` pada loadSplat() BUKAN meter, dan itu akibat bug di
 * plugin v0.2.9. Rangkaiannya begini:
 *
 *   loadSplat() -> createMercatorRTCGroup([lon,lat,alt], euler, s)
 *   di dalam createRTCGroup:  if (a) r.scale.set(a[0]||1, a[1]||1, a[2]||1)
 *
 * `a` di situ sebuah angka, bukan array. Jadi `a[0]` undefined, skala
 * grup jatuh ke (1,1,1), dan createMercatorRTCGroup melewati koreksi
 * meter -> Mercator yang seharusnya ia lakukan. Akibatnya `scale: s`
 * berarti kira-kira `s x 39,1 meter` per satu unit model.
 *
 * Artinya: untuk aset yang sudah di-bake ke meter, kita harus
 * menyuntikkan sendiri faktor Mercator-nya, yaitu nilai dari
 * projectedUnitsPerMeter() di bawah.
 *
 * KONSEKUENSI: versi plugin WAJIB dipin tepat di 0.2.9. Kalau upstream
 * memperbaiki `a[0]||1`, arti `scale` berubah dan splat akan mengecil
 * atau membesar sekitar 39x tanpa pesan error apa pun.
 *
 * Konstanta diambil dari sumber plugin:
 *   R = 6371008.8 m           radius bumi yang dipakai plugin
 *   I = 2 * pi * R            lingkar bumi
 *   projectedUnitsPerMeter(phi) = 1024000 / (cos(phi) * I)
 *
 * Di lintang FTSPK (-7.282) hasilnya sekitar 0.0257884.
 *
 * Frame dunia plugin juga bukan ENU. Dari lngLatToVector3():
 *   x = -R * p * lon * D      -> +X ke BARAT
 *   y = -R * ln(tan(pi/4 + lat/2)) * D  -> +Y ke SELATAN
 *   z = alt * projectedUnitsPerMeter(lat)  -> +Z ke ATAS
 *
 * Jadi ENU (timur, utara, atas) ke frame plugin adalah putaran 180
 * derajat di sumbu Z. Itu asal angka ROTASI_ENU di config.js.
 */

const R_BUMI = 6371008.8;
const LINGKAR = 2 * Math.PI * R_BUMI;

/** Unit terproyeksi per meter pada satu lintang (derajat). */
export function projectedUnitsPerMeter(latDeg) {
  return 1024000 / (Math.cos((latDeg * Math.PI) / 180) * LINGKAR);
}
