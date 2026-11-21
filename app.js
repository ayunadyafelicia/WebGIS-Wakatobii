// WebGIS Kabupaten Wakatobi: GeoJSON lokal + titik wisata + fasilitas OSM
const $ = id => document.getElementById(id);
const on = (id, ev, fn) => { const el = $(id); if (el) el.addEventListener(ev, fn); };
const setHTML = (id, html) => { const el = $(id); if (el) el.innerHTML = html; };
function setStatus(text, error) {
  const el = $('statusData');
  if (!el) return;
  el.textContent = text;
  el.classList.toggle('error', !!error);
}

/* ===== PETA & BASEMAP ===== */
const kanvas = L.canvas({ padding: 0.5 });
L.Path.mergeOptions({ renderer: kanvas });
const map = L.map('map', { preferCanvas: true, maxZoom: 22 }).setView([-5.55, 123.75], 9);
const imagery = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
  maxZoom: 22, maxNativeZoom: 17, attribution: 'Esri, Maxar'
}).addTo(map);
const osmTiles = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  maxZoom: 22, maxNativeZoom: 19, attribution: '&copy; OpenStreetMap'
});
L.control.layers({ 'Citra Satelit': imagery, 'OpenStreetMap': osmTiles }).addTo(map);
L.control.scale({ imperial: false }).addTo(map);

const URUTAN = ['kabupaten', 'kecamatan', 'desa', 'permukiman', 'pantai', 'jalan', 'bangunan'];
URUTAN.forEach((n, i) => { map.createPane('p-' + n).style.zIndex = 401 + i; });
const G = {};
URUTAN.concat(['titik']).forEach(n => { G[n] = L.layerGroup().addTo(map); });

// Kotak centang jaringan
document.querySelectorAll('input[data-layer]').forEach(cb => cb.addEventListener('change', () => {
  const g = G[cb.dataset.layer];
  if (g) cb.checked ? g.addTo(map) : map.removeLayer(g);
}));

/* ===== KONFIGURASI ===== */
const FILES = [
  { file: 'administrasi_kabkota.geojson', tipe: 'kabupaten' },
  { file: 'administrasikecamatan.geojson', tipe: 'kecamatan' },
  { file: 'bataskelurahandesa.geojson', tipe: 'desa' },
  { file: 'permukiman.geojson', tipe: 'permukiman' },
  { file: 'garispantai.geojson', tipe: 'pantai' },
  { file: 'jalan.geojson', tipe: 'jalan' },
  { file: 'bangunan.geojson', tipe: 'bangunan' },
  { file: 'pemerintahan.geojson', tipe: 'pemerintahan' }
];
const GAYA = {
  kabupaten: { color: '#f4e342', weight: 3, fillColor: '#f4e342', fillOpacity: 0.1 },
  kecamatan: { color: '#ff8c42', weight: 2.5, dashArray: '8 6', fillColor: '#ff8c42', fillOpacity: 0.06 },
  desa: { color: '#ffffff', weight: 1, dashArray: '2 4', fillColor: '#ffffff', fillOpacity: 0.02 },
  permukiman: { color: '#8e44ad', weight: 1, fillColor: '#8e44ad', fillOpacity: 0.4 },
  pantai: { color: '#00e5ff', weight: 3, dashArray: '8 6' }
};
const CATS = {
  'Wisata Pantai': { cls: 'bg-w-pantai', icon: 'fa-umbrella-beach', warna: '#e67e22' },
  'Wisata Bahari': { cls: 'bg-w-bahari', icon: 'fa-fish', warna: '#0097a7' },
  'Wisata Sejarah/Budaya': { cls: 'bg-w-sejarah', icon: 'fa-landmark', warna: '#8d6e63' },
  'Wisata Alam': { cls: 'bg-w-alam', icon: 'fa-mountain', warna: '#2e7d32' },
  'Desa Wisata': { cls: 'bg-w-desa', icon: 'fa-people-roof', warna: '#9e9d24' },
  'Penginapan': { cls: 'bg-w-inap', icon: 'fa-bed', warna: '#d81b60' },
  'Wisata Lainnya': { cls: 'bg-w-lain', icon: 'fa-camera', warna: '#607d8b' },
  Pendidikan: { cls: 'bg-pendidikan', icon: 'fa-graduation-cap', warna: '#2980b9' },
  Kesehatan: { cls: 'bg-kesehatan', icon: 'fa-hospital', warna: '#e74c3c' },
  Pemerintahan: { cls: 'bg-pemerintahan', icon: 'fa-building-columns', warna: '#8e44ad' },
  Permukiman: { cls: 'bg-permukiman', icon: 'fa-house-chimney', warna: '#8e44ad' },
  Bangunan: { cls: 'bg-bangunan', icon: 'fa-building', warna: '#3949ab' },
  Lainnya: { cls: 'bg-lainnya', icon: 'fa-location-dot', warna: '#34495e' }
};
const WISATA_CATS = ['Wisata Pantai', 'Wisata Bahari', 'Wisata Sejarah/Budaya', 'Wisata Alam', 'Desa Wisata', 'Penginapan', 'Wisata Lainnya'];
const ISLAND_BOUNDS = {
  'Wangi-Wangi': [[-5.48, 123.43], [-5.20, 123.65]],
  'Kaledupa': [[-5.55, 123.68], [-5.38, 123.83]],
  'Tomia': [[-5.72, 123.88], [-5.55, 124.02]],
  'Binongko': [[-6.10, 123.92], [-5.82, 124.20]]
};
const ALL_BOUNDS = [[-6.2, 123.3], [-5.15, 124.7]];

// Koordinat wisata yang sudah diperbaiki: [nama, lintang, bujur, jenis wisata]
const WISATA_MANUAL = [
  ['Liya Togo', -5.373675, 123.628725, 'Wisata Sejarah/Budaya'],
  ['Mola Village', -5.343792, 123.540861, 'Desa Wisata'],
  ['Waha Tourism Community', -5.251764, 123.526725, 'Desa Wisata'],
  ['Pantai Cemara', -5.261164, 123.520286, 'Wisata Pantai'],
  ['Moli Sahatu Beach', -5.248033, 123.587, 'Wisata Pantai'],
  ['Puncak Toliamba', -5.295711, 123.544767, 'Wisata Alam'],
  ['Goa Air Kontamale', -5.318097, 123.534756, 'Wisata Alam']
];

let points = [], markerRefs = [];

/* ===== UTIL ===== */
const esc = v => String(v ?? '-').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const norm = s => String(s ?? '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
function firstProp(p, keys) {
  for (const k of keys) if (p && p[k] !== null && p[k] !== undefined && String(p[k]).trim() !== '') return p[k];
  return '';
}
const NAMA_KEYS = ['NAMOBJ', 'NAMA', 'nama', 'NAME', 'name', 'namobj'];
const dataRows = (p, n = 12) => Object.entries(p || {}).filter(([, v]) => v !== null && v !== '' && typeof v !== 'object').slice(0, n);
const remarkOf = p => {
  const k = Object.keys(p || {}).find(x => x.toUpperCase() === 'REMARK');
  return k && p[k] !== null && String(p[k]).trim() !== '' ? String(p[k]).trim() : '';
};
function islandFrom(lat, lon) {
  if (lat > -5.48 && lon < 123.68) return 'Wangi-Wangi';
  if (lat > -5.58 && lon >= 123.65 && lon < 123.87) return 'Kaledupa';
  if (lat > -5.80 && lon >= 123.85 && lon < 124.08) return 'Tomia';
  if (lat <= -5.80 && lon >= 123.88) return 'Binongko';
  return 'Pulau kecil/area lain';
}
// Tentukan jenis wisata dari tag OSM + nama (ubah kata kunci di sini bila perlu)
function klasifikasiWisata(nama, t = {}) {
  const n = norm(nama);
  if (/desa wisata|kampung wisata|village|tourism community|komunitas wisata/.test(n)) return 'Desa Wisata';
  if (/^(hotel|guest_house|hostel|motel|resort|apartment|chalet)$/.test(t.tourism || '') || /hotel|homestay|penginapan|losmen|resort|cottage|villa|bungalow|guest ?house/.test(n)) return 'Penginapan';
  if (t.sport === 'scuba_diving' || /selam|diving|dive|snorkel|bahari|terumbu|reef|karang|dermaga wisata|marine/.test(n)) return 'Wisata Bahari';
  if (t.natural === 'beach' || /pantai|beach|pasir putih|pesisir/.test(n)) return 'Wisata Pantai';
  if (t.historic || t.tourism === 'museum' || /benteng|keraton|liya|makam|museum|masjid tua|baluwara|situs|budaya|kuno|bersejarah|sejarah|tugu/.test(n)) return 'Wisata Sejarah/Budaya';
  if (t.natural === 'cave_entrance' || t.tourism === 'viewpoint' || /goa|gua|puncak|bukit|gunung|air terjun|danau|mangrove|hutan|view ?point|taman|telaga/.test(n)) return 'Wisata Alam';
  return 'Wisata Lainnya';
}
function markerIcon(category) {
  const c = CATS[category] || CATS.Lainnya;
  return L.divIcon({ className: '', html: `<div class="custom-marker ${c.cls}"><i class="fa-solid ${c.icon}"></i></div>`, iconSize: [30, 30], iconAnchor: [15, 15] });
}
function detail(title, category, rows) {
  const c = CATS[category] || CATS.Lainnya;
  setHTML('hasil', `<div class="detail-title">${esc(title)}</div><span class="detail-category" style="background:${c.warna}">${esc(category)}</span><hr style="margin:6px 0">` +
    rows.map(([k, v]) => `<div class="detail-info-row"><b>${esc(k)}:</b> ${esc(v)}</div>`).join(''));
}
function featureCollection(v) {
  if (!v) return null;
  if (v.type === 'FeatureCollection') return v;
  if (v.type === 'Feature') return { type: 'FeatureCollection', features: [v] };
  return null;
}
function validWgs84(fc) {
  const f = fc.features.find(x => x.geometry && x.geometry.coordinates);
  if (!f) return true;
  let c = f.geometry.coordinates;
  while (Array.isArray(c[0])) c = c[0];
  return Number.isFinite(c[0]) && Number.isFinite(c[1]) && Math.abs(c[0]) <= 180 && Math.abs(c[1]) <= 90;
}
const kunciProps = fc => Object.keys((fc.features.find(f => f.properties) || {}).properties || {});

/* ===== TITIK FASILITAS ===== */
function addPoint({ name, category, lat, lon, source, properties = {} }) {
  if (!Number.isFinite(lat) || !Number.isFinite(lon) || Math.abs(lat) > 90 || Math.abs(lon) > 180) return;
  if (points.some(p => p.name === name && Math.abs(p.lat - lat) < 0.00003 && Math.abs(p.lon - lon) < 0.00003)) return;
  const d = { name: name || category, category, lat, lon, source, island: islandFrom(lat, lon), properties };
  const m = L.marker([lat, lon], { icon: markerIcon(category) });
  m.bindTooltip(esc(d.name), { direction: 'top' });
  m.on('click', () => detail(d.name, d.category, [
    ['Pulau/area', d.island], ['Sumber data', d.source],
    ['Lintang', d.lat.toFixed(6)], ['Bujur', d.lon.toFixed(6)],
    ...dataRows(d.properties, 8)
  ]));
  m.featureData = d;
  points.push(d); markerRefs.push(m); G.titik.addLayer(m);
}
function updateRecap() {
  const counts = {};
  points.forEach(p => { counts[p.category] = (counts[p.category] || 0) + 1; });
  setHTML('rekap', '<table class="stat-table"><tr><th>Kategori</th><th class="num">Titik</th></tr>' +
    Object.keys(CATS).filter(k => counts[k]).map(k => `<tr><td>${esc(k)}</td><td class="num">${counts[k]}</td></tr>`).join('') + '</table>');
}

/* ===== FILTER FASILITAS (tiap tombol bisa dinyalakan/dimatikan; "Semua" = nyala/mati semuanya) ===== */
function applyPointFilters() {
  const aktif = new Set([...document.querySelectorAll('.chip[data-category]:not([data-category="ALL"])')]
    .filter(b => b.classList.contains('active')).map(b => b.dataset.category));
  markerRefs.forEach(m => {
    const visible = aktif.has(m.featureData.category);
    if (visible) { if (!G.titik.hasLayer(m)) G.titik.addLayer(m); }
    else G.titik.removeLayer(m);
  });
}
function terapkanChip() {
  document.querySelectorAll('.chip[data-layer]').forEach(b => {
    const g = G[b.dataset.layer];
    if (g) b.classList.contains('active') ? g.addTo(map) : map.removeLayer(g);
  });
  applyPointFilters();
  const semua = document.querySelector('.chip[data-category="ALL"]');
  const lain = [...document.querySelectorAll('.chip:not([data-category="ALL"])')];
  if (semua) semua.classList.toggle('active', lain.every(b => b.classList.contains('active')));
}
document.querySelectorAll('.chip').forEach(btn => btn.addEventListener('click', () => {
  if (btn.dataset.category === 'ALL') {
    const nyalakan = !btn.classList.contains('active');
    document.querySelectorAll('.chip').forEach(b => b.classList.toggle('active', nyalakan));
  } else btn.classList.toggle('active');
  terapkanChip();
}));
document.querySelectorAll('.chip').forEach(b => b.classList.add('active'));

on('pulauSel', 'change', e => map.fitBounds(e.target.value === 'ALL' ? ALL_BOUNDS : ISLAND_BOUNDS[e.target.value]));

/* ===== NAMA KECAMATAN ===== */
function getKecamatanName(p) {
  const n = firstProp(p, ['NAMOBJ', 'WADMKC', 'NAMKEC', 'NAMAKEC', 'NAMA_KEC', 'KECAMATAN', 'NAME_2', 'NAMA', 'NAME', 'name']);
  if (n) return String(n).trim();
  const s = Object.values(p || {}).find(v => typeof v === 'string' && v.trim());
  return s ? s.trim() : '';
}

/* ===== JALAN: gaya sesuai legenda RBI ===== */
const GAYA_JALAN = [
  ['arteri', { color: '#e31a1c', weight: 4.5 }],
  ['nasional', { color: '#e31a1c', weight: 4.5 }],
  ['kolektor', { color: '#ff7f00', weight: 4 }],
  ['provinsi', { color: '#ff7f00', weight: 4 }],
  ['lokal', { color: '#ffd700', weight: 3.5 }],
  ['kabupaten', { color: '#ffd700', weight: 3.5 }],
  ['lingkungan', { color: '#b15928', weight: 3 }],
  ['desa', { color: '#b15928', weight: 3 }],
  ['setapak', { color: '#000000', weight: 2, dashArray: '5 4' }],
  ['lain', { color: '#9e9e9e', weight: 2.5 }]
];
const roadStyle = {};
const PALET = ['#16a085', '#2980b9', '#d35400', '#c0392b', '#8e44ad', '#f39c12', '#27ae60', '#7f8c8d', '#e84393', '#00acc1'];
const roadColor = {};
let roadField = null;
function pilihKolomKelas(fc) {
  const keys = kunciProps(fc);
  const sample = fc.features.slice(0, 3000);
  const distinct = k => { const s = new Set(); sample.forEach(f => { const v = f.properties && f.properties[k]; if (v !== null && v !== undefined && String(v).trim() !== '') s.add(String(v).trim()); }); return s.size; };
  const prior = ['REMARK', 'KELAS', 'KLASIFIKASI', 'JENJANG', 'FUNGSI', 'JENIS', 'KATEGORI', 'TIPE', 'TYPE', 'STATUS', 'HIERARKI', 'FCODE'];
  for (const k of prior) { const r = keys.find(x => x.toUpperCase() === k); if (r) { const n = distinct(r); if (n >= 2 && n <= 25) return r; } }
  for (const k of keys) {
    if (/^(NAMOBJ|NAMA|NAME|OBJECTID|FID|ID|UID|SHAPE)/i.test(k)) continue;
    const n = distinct(k); if (n >= 2 && n <= 12) return k;
  }
  return null;
}
function kelasJalan(p) {
  const v = roadField && p ? p[roadField] : null;
  return (v === null || v === undefined || String(v).trim() === '') ? 'Tidak diklasifikasikan' : String(v).trim();
}
function gayaKelas(k) {
  if (roadStyle[k]) return roadStyle[k];
  const n = norm(k), m = GAYA_JALAN.find(([w]) => n.includes(w));
  roadStyle[k] = m ? m[1] : { color: PALET[Object.keys(roadStyle).length % PALET.length], weight: 3 };
  roadColor[k] = roadStyle[k].color;
  return roadStyle[k];
}
function warnaKelas(k) { return gayaKelas(k).color; }

/* ===== LEGENDA ===== */
const legendDiv = L.DomUtil.create('div', 'legend');
const legend = L.control({ position: 'bottomright' });
legend.onAdd = () => legendDiv;
let legendAdded = false;
function renderLegend() {
  const svg = inner => `<svg width="30" height="16" viewBox="0 0 30 16">${inner}</svg>`;
  const baris = (sym, label) => `<div class="legend-row"><span class="legend-sym">${sym}</span><span>${esc(label)}</span></div>`;
  const seksi = t => `<div class="legend-section">${t}</div>`;

  const garisKelas = k => { const s = gayaKelas(k); return svg(`<line x1="2" y1="8" x2="28" y2="8" stroke="${s.color}" stroke-width="3" stroke-linecap="round"${s.dashArray ? ' stroke-dasharray="' + s.dashArray + '"' : ''}/>`); };
  const putus = (w, tebal) => svg(`<line x1="1" y1="8" x2="29" y2="8" stroke="${w}" stroke-width="${tebal}" stroke-dasharray="6 4"/>`);
  const kabSym = svg(`<rect x="2" y="2" width="26" height="12" fill="#f4e342" fill-opacity="0.25" stroke="#f4e342" stroke-width="3"/>`);
  const desaSym = svg(`<rect x="0" y="1" width="30" height="14" rx="2" fill="#37474f"/><line x1="2" y1="8" x2="28" y2="8" stroke="#ffffff" stroke-width="1.5" stroke-dasharray="2 4"/>`);
  const permSym = svg(`<rect x="2" y="2" width="26" height="12" fill="#8e44ad" fill-opacity="0.4" stroke="#8e44ad" stroke-width="1.5"/>`);
  const marker = (cls, icon) => `<div class="custom-marker ${cls}"><i class="fa-solid ${icon}"></i></div>`;

  const batas =
    baris(kabSym, 'Batas kabupaten') +
    baris(putus('#ff8c42', 2.5), 'Batas kecamatan') +
    baris(desaSym, 'Batas desa/kelurahan') +
    baris(putus('#00e5ff', 3), 'Garis pantai');
  const lahan =
    baris(permSym, 'Permukiman') +
    baris(marker('marker-bangunan', 'fa-building'), 'Bangunan');
  const jalan = Object.keys(roadColor).sort().map(k => baris(garisKelas(k), k)).join('');
  const wisata = WISATA_CATS.map(k => baris(marker(CATS[k].cls, CATS[k].icon), k)).join('');
  const umum = ['Pendidikan', 'Kesehatan', 'Pemerintahan'].map(k => baris(marker(CATS[k].cls, CATS[k].icon), k)).join('');

  legendDiv.innerHTML =
    `<div class="legend-title">Legenda</div>` +
    seksi('Batas wilayah') + batas +
    seksi('Permukiman &amp; bangunan') + lahan +
    (jalan ? seksi('Jaringan jalan') + jalan : '') +
    seksi('Jenis wisata') + wisata +
    seksi('Fasilitas umum') + umum;
  if (!legendAdded) { legend.addTo(map); legendAdded = true; }
}
function addRoads(fc, file) {
  roadField = pilihKolomKelas(fc);
  console.log('Kelas jalan dari kolom:', roadField, '| kolom tersedia:', kunciProps(fc).join(', '));
  const stats = {}; let total = 0;
  // garis putih tipis di bawah jalan agar jalan gelap/putus-putus tetap terlihat di citra satelit
  L.geoJSON(fc, {
    pane: 'p-jalan', interactive: false,
    style: f => ({ color: '#ffffff', weight: gayaKelas(kelasJalan(f.properties)).weight + 2, opacity: 0.55 })
  }).addTo(G.jalan);
  L.geoJSON(fc, {
    pane: 'p-jalan',
    style: f => { const s = gayaKelas(kelasJalan(f.properties)); return { color: s.color, weight: s.weight, dashArray: s.dashArray, opacity: 1 }; },
    onEachFeature: (f, layer) => {
      const p = f.properties || {}, kind = kelasJalan(p);
      let km = 0; try { km = turf.length(f, { units: 'kilometers' }); } catch (e) { /* abaikan */ }
      stats[kind] = (stats[kind] || 0) + km; total += km;
      const nm = firstProp(p, NAMA_KEYS);
      layer.on('click', () => detail(nm || kind, kind, [['Kelas jalan', kind], ['Panjang', km.toFixed(3) + ' km'], ['Layer', file], ...dataRows(p)]));
      if (nm) layer.bindTooltip(esc(nm), { sticky: true });
    }
  }).addTo(G.jalan);
  const rows = Object.entries(stats).sort((a, b) => b[1] - a[1]);
  setHTML('statistikContainer', '<table class="stat-table"><tr><th>Jenis/kelas jalan</th><th class="num">km</th></tr>' +
    rows.map(([k, v]) => `<tr><td><i style="background:${warnaKelas(k)};display:inline-block;width:13px;height:4px;margin-right:5px"></i>${esc(k)}</td><td class="num">${v.toFixed(2)}</td></tr>`).join('') +
    `<tr><th>Total panjang</th><th class="num">${total.toFixed(2)}</th></tr></table>`);
  renderLegend();
}

/* ===== PERMUKIMAN ===== */
function tampilPermukiman(fc, file) {
  L.geoJSON(fc, {
    pane: 'p-permukiman',
    style: () => GAYA.permukiman,
    onEachFeature: (f, l) => {
      const p = f.properties || {};
      const nm = remarkOf(p) || firstProp(p, NAMA_KEYS.concat(['WADMKD', 'NAMDESA'])) || 'Permukiman';
      const c = l.getBounds().getCenter();
      let ha = null; try { ha = turf.area(f) / 10000; } catch (e) { /* abaikan */ }
      l.bindTooltip(esc(nm), { sticky: true });
      l.on('click', () => detail(String(nm), 'Permukiman', [
        ['Pulau/area', islandFrom(c.lat, c.lng)],
        ['Sumber data', file],
        ...(ha !== null ? [['Luas', ha.toFixed(2) + ' ha']] : []),
        ['Lintang', c.lat.toFixed(6)],
        ['Bujur', c.lng.toFixed(6)],
        ...dataRows(p, 8)
      ]));
    }
  }).addTo(G.permukiman);
}

/* ===== BANGUNAN ===== */
const iconBangunan = L.divIcon({
  className: '',
  html: '<div class="custom-marker marker-bangunan"><i class="fa-solid fa-building"></i></div>',
  iconSize: [24, 24],
  iconAnchor: [12, 12]
});
function tampilBangunan(fc, file) {
  L.geoJSON(fc, {
    pane: 'p-bangunan',
    style: () => ({ color: '#3949ab', weight: 1, fillColor: '#3949ab', fillOpacity: 0.5 }),
    pointToLayer: (f, ll) => L.marker(ll, { icon: iconBangunan }),
    onEachFeature: (f, l) => {
      const p = f.properties || {};
      const nm = remarkOf(p) || firstProp(p, NAMA_KEYS) || 'Bangunan';
      const c = l.getLatLng ? l.getLatLng() : l.getBounds().getCenter();
      l.bindTooltip(esc(nm), { sticky: true });
      l.on('click', () => detail(String(nm), 'Bangunan', [
        ['Pulau/area', islandFrom(c.lat, c.lng)],
        ['Sumber data', file],
        ['Lintang', c.lat.toFixed(6)],
        ['Bujur', c.lng.toFixed(6)],
        ...dataRows(p, 8)
      ]));
    }
  }).addTo(G.bangunan);
}

/* ===== PEMERINTAHAN ===== */
function titikPemerintahan(fc, file) {
  fc.features.forEach(f => {
    if (!f.geometry) return;
    const p = f.properties || {};
    let coord = null;
    const g = f.geometry;
    if (g.type === 'Point') coord = g.coordinates;
    else if (g.type === 'MultiPoint') coord = g.coordinates[0];
    else { try { coord = turf.pointOnFeature(f).geometry.coordinates; } catch (e) { /* abaikan */ } }
    if (!coord || coord.length < 2) return;
    const remark = remarkOf(p);
    const nm = remark || firstProp(p, NAMA_KEYS) || 'Pemerintahan';
    addPoint({
      name: String(nm), category: 'Pemerintahan',
      lat: Number(coord[1]), lon: Number(coord[0]), source: file,
      properties: remark ? { REMARK: remark, ...p } : p
    });
  });
}

/* ===== BATAS DESA/KELURAHAN (garis gelap + putus-putus putih, sama dengan legenda) ===== */
function tampilDesa(fc, file) {
  L.geoJSON(fc, { pane: 'p-desa', interactive: false, style: () => ({ color: '#37474f', weight: 4, opacity: 0.9, fill: false }) }).addTo(G.desa);
  L.geoJSON(fc, {
    pane: 'p-desa',
    style: () => ({ color: '#ffffff', weight: 1.5, dashArray: '2 4', fillColor: '#ffffff', fillOpacity: 0.02 }),
    onEachFeature: (f, l) => {
      const p = f.properties || {};
      const nm = firstProp(p, NAMA_KEYS.concat(['WADMKD', 'NAMDESA']));
      if (nm) l.bindTooltip(esc(nm), { sticky: true });
      l.on('click', () => detail(nm || file, 'Lainnya', dataRows(p)));
    }
  }).addTo(G.desa);
}

/* ===== PROSES TIAP FILE ===== */
function prosesLayer(tipe, fc, file) {
  if (tipe === 'jalan') { addRoads(fc, file); return; }
  if (tipe === 'permukiman') { tampilPermukiman(fc, file); return; }
  if (tipe === 'bangunan') { tampilBangunan(fc, file); return; }
  if (tipe === 'pemerintahan') { titikPemerintahan(fc, file); return; }
  if (tipe === 'desa') { tampilDesa(fc, file); return; }
  L.geoJSON(fc, {
    pane: 'p-' + tipe,
    style: () => GAYA[tipe],
    onEachFeature: (f, l) => {
      const p = f.properties || {};
      const nm = tipe === 'kecamatan' ? getKecamatanName(p) : firstProp(p, NAMA_KEYS.concat(['WADMKD', 'NAMDESA']));
      if (nm) l.bindTooltip(esc(nm), { sticky: true });
      l.on('click', () => detail(nm || file, 'Lainnya', dataRows(p)));
    }
  }).addTo(G[tipe]);
}
async function muatFile({ file, tipe }) {
  try {
    const res = await fetch(encodeURI(file) + '?t=' + Date.now());
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const fc = featureCollection(await res.json());
    if (!fc || !fc.features.length) throw new Error('tidak berisi fitur');
    if (!validWgs84(fc)) throw new Error('koordinat bukan lon/lat (WGS84)');
    prosesLayer(tipe, fc, file);
    return true;
  } catch (err) { console.warn(file + ' gagal:', err); return false; }
}

/* ===== WISATA MANUAL + OSM ===== */
const namaManual = WISATA_MANUAL.map(w => norm(w[0]));
const sudahManual = nama => { const n = norm(nama); return namaManual.some(m => n.includes(m) || m.includes(n)); };
const Q = '(-6.2,123.3,-5.15,124.7)';
const OVERPASS_QUERY = `[out:json][timeout:60];(
 nwr["amenity"~"^(school|college|university|kindergarten|hospital|clinic|doctors|townhall|police|courthouse)$"]${Q};
 nwr["healthcare"]${Q}; nwr["office"="government"]${Q};
 nwr["tourism"~"^(attraction|viewpoint|museum|resort|hotel|guest_house)$"]${Q};
 nwr["historic"]${Q}; nwr["natural"~"^(beach|cave_entrance)$"]${Q}; nwr["sport"="scuba_diving"]${Q};
);out center tags;`;
async function loadOSM() {
  const mirrors = ['https://overpass-api.de/api/interpreter', 'https://overpass.private.coffee/api/interpreter'];
  for (const url of mirrors) {
    try {
      const res = await fetch(url, { method: 'POST', body: 'data=' + encodeURIComponent(OVERPASS_QUERY) });
      if (!res.ok) throw new Error('HTTP ' + res.status);
      const data = await res.json();
      data.elements.forEach(e => {
        const t = e.tags || {};
        let category = null, wisata = false;
        if (/^(school|college|university|kindergarten)$/.test(t.amenity || '')) category = 'Pendidikan';
        else if (/^(hospital|clinic|doctors)$/.test(t.amenity || '') || t.healthcare) category = 'Kesehatan';
        else if (/^(townhall|police|courthouse)$/.test(t.amenity || '') || t.office === 'government') category = 'Pemerintahan';
        else if (t.tourism || t.historic || t.natural || t.sport) { category = 'Wisata'; wisata = true; }
        if (!category) return;
        const lat = e.lat ?? e.center?.lat, lon = e.lon ?? e.center?.lon;
        if (lat == null || lon == null) return;
        const nm = t.name || t['name:id'] || `${category} (tanpa nama)`;
        if (wisata) {
          if (sudahManual(nm)) return; // pakai koordinat manual
          category = klasifikasiWisata(nm, t);
        }
        addPoint({ name: nm, category, lat: Number(lat), lon: Number(lon), source: 'OpenStreetMap', properties: t });
      });
      return true;
    } catch (err) { console.warn('OSM gagal:', url, err); }
  }
  return false;
}

/* ===== INISIALISASI ===== */
(async function init() {
  if (location.protocol === 'file:') {
    setStatus('Halaman dibuka lewat file://, sehingga file GeoJSON diblokir browser. Jalankan lewat server lokal (mis. "python -m http.server" di folder ini, lalu buka http://localhost:8000).', true);
  } else {
    setStatus('Memuat data GeoJSON...');
  }
  renderLegend();
  let ok = 0; const gagal = [];
  for (const f of FILES) { if (await muatFile(f)) ok++; else gagal.push(f.file); }
  WISATA_MANUAL.forEach(([nama, lat, lon, jenis]) => addPoint({ name: nama, category: jenis || klasifikasiWisata(nama), lat, lon, source: 'Data wisata (koordinat diperbarui)' }));
  updateRecap(); applyPointFilters();
  renderLegend();
  map.fitBounds(ALL_BOUNDS);
  if (location.protocol !== 'file:') {
    setStatus(gagal.length ? `Layer gagal dimuat: ${gagal.join(', ')} (cek nama & lokasi file, harus satu folder dengan index.html)` : `${ok} layer dimuat. Memuat fasilitas OSM...`, gagal.length > 0);
  }
  const osmOk = await loadOSM();
  updateRecap(); applyPointFilters();
  if (!gagal.length) setStatus(osmOk ? `Selesai: ${ok} layer dan ${points.length} titik fasilitas dimuat.` : `${ok} layer dimuat. Data OSM tidak termuat.`, !osmOk);
})().catch(err => setStatus('Kesalahan: ' + err.message, true));
