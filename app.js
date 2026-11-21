// WebGIS Kabupaten Wakatobi: GeoJSON lokal + titik wisata + fasilitas OSM
const $ = id => document.getElementById(id);
const log = msg => { const el = $('log'); el.textContent += msg + '\n'; el.scrollTop = el.scrollHeight; };

/* ===== PETA ===== */
const map = L.map('map', { preferCanvas: true }).setView([-5.55, 123.75], 9);
const imagery = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', { maxZoom: 19, attribution: 'Esri, Maxar' }).addTo(map);
const osmTiles = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19, attribution: '&copy; OpenStreetMap' });
L.control.layers({ 'Citra Esri': imagery, 'OpenStreetMap': osmTiles }).addTo(map);
L.control.scale({ imperial: false }).addTo(map);

const URUTAN = ['kabupaten', 'kecamatan', 'desa', 'permukiman', 'pantai', 'jalan', 'bangunan', 'pemerintahan'];
URUTAN.forEach((n, i) => { map.createPane('p-' + n).style.zIndex = 401 + i; });
const G = {};
URUTAN.concat(['titik']).forEach(n => { G[n] = L.layerGroup().addTo(map); });

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
  Pariwisata: { cls: 'bg-pariwisata', icon: 'fa-umbrella-beach' },
  Pendidikan: { cls: 'bg-pendidikan', icon: 'fa-graduation-cap' },
  Kesehatan: { cls: 'bg-kesehatan', icon: 'fa-hospital' },
  Pemerintahan: { cls: 'bg-pemerintahan', icon: 'fa-building-columns' },
  Permukiman: { cls: 'bg-permukiman', icon: 'fa-house-chimney' },
  Lainnya: { cls: 'bg-lainnya', icon: 'fa-location-dot' }
};
const ISLAND_BOUNDS = {
  'Wangi-Wangi': [[-5.48, 123.43], [-5.20, 123.65]],
  'Kaledupa': [[-5.55, 123.68], [-5.38, 123.83]],
  'Tomia': [[-5.72, 123.88], [-5.55, 124.02]],
  'Binongko': [[-6.10, 123.92], [-5.82, 124.20]]
};
const ALL_BOUNDS = [[-6.2, 123.3], [-5.15, 124.7]];

const WISATA_MANUAL = [
  ['Liya Togo', -5.373675, 123.628725],
  ['Mola Village', -5.343792, 123.540861],
  ['Waha Tourism Community', -5.251764, 123.526725],
  ['Pantai Cemara', -5.261164, 123.520286],
  ['Moli Sahatu Beach', -5.248033, 123.587],
  ['Puncak Toliamba', -5.295711, 123.544767],
  ['Goa Air Kontamale', -5.318097, 123.534756]
];

let points = [], markerRefs = [], roadFeatures = [], currentCategory = 'ALL';

/* ===== UTIL ===== */
const esc = v => String(v ?? '-').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const norm = s => String(s ?? '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
function firstProp(p, keys) {
  for (const k of keys) if (p && p[k] !== null && p[k] !== undefined && String(p[k]).trim() !== '') return p[k];
  return '';
}
const NAMA_KEYS = ['NAMOBJ', 'NAMA', 'nama', 'NAME', 'name', 'namobj'];
const dataRows = p => Object.entries(p || {}).filter(([, v]) => v !== null && v !== '' && typeof v !== 'object').slice(0, 14);
function islandFrom(lat, lon) {
  if (lat > -5.48 && lon < 123.68) return 'Wangi-Wangi';
  if (lat > -5.58 && lon >= 123.65 && lon < 123.87) return 'Kaledupa';
  if (lat > -5.80 && lon >= 123.85 && lon < 124.08) return 'Tomia';
  if (lat <= -5.80 && lon >= 123.88) return 'Binongko';
  return 'Pulau kecil/area lain';
}
function markerIcon(category) {
  const c = CATS[category] || CATS.Lainnya;
  return L.divIcon({ className: '', html: `<div class="custom-marker ${c.cls}"><i class="fa-solid ${c.icon}"></i></div>`, iconSize: [30, 30], iconAnchor: [15, 15] });
}
function detail(title, category, rows) {
  const c = CATS[category] || { cls: 'bg-lainnya' };
  $('hasil').innerHTML = `<div class="detail-title">${esc(title)}</div><span class="detail-category ${c.cls}">${esc(category)}</span><hr style="margin:6px 0">` +
    rows.map(([k, v]) => `<div class="detail-info-row"><b>${esc(k)}:</b> ${esc(v)}</div>`).join('');
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

/* ===== TITIK FASILITAS (wisata manual + OSM) ===== */
function addPoint({ name, category, lat, lon, source, properties = {} }) {
  if (!Number.isFinite(lat) || !Number.isFinite(lon) || Math.abs(lat) > 90 || Math.abs(lon) > 180) return;
  if (points.some(p => p.name === name && Math.abs(p.lat - lat) < 0.00003 && Math.abs(p.lon - lon) < 0.00003)) return;
  const d = { name: name || category, category, lat, lon, source, island: islandFrom(lat, lon), properties };
  const m = L.marker([lat, lon], { icon: markerIcon(category) });
  m.bindTooltip(esc(d.name), { direction: 'top' });
  m.on('click', () => detail(d.name, d.category, [
    ['Pulau/area', d.island], ['Sumber data', d.source],
    ['Lintang', d.lat.toFixed(6)], ['Bujur', d.lon.toFixed(6)],
    ...dataRows(d.properties).slice(0, 8)
  ]));
  m.featureData = d;
  points.push(d); markerRefs.push(m); G.titik.addLayer(m);
}
function updateRecap() {
  const counts = {};
  points.forEach(p => { counts[p.category] = (counts[p.category] || 0) + 1; });
  $('rekap').innerHTML = '<table class="stat-table"><tr><th>Kategori</th><th class="num">Titik</th></tr>' +
    Object.keys(CATS).filter(k => counts[k]).map(k => `<tr><td>${esc(k)}</td><td class="num">${counts[k]}</td></tr>`).join('') + '</table>';
}
function applyPointFilters() {
  const q = norm($('searchInput').value.trim());
  markerRefs.forEach(m => {
    const d = m.featureData;
    const visible = (currentCategory === 'ALL' || d.category === currentCategory) && norm(d.name).includes(q);
    if (visible) { if (!G.titik.hasLayer(m)) G.titik.addLayer(m); }
    else G.titik.removeLayer(m);
  });
}
document.querySelectorAll('.chip').forEach(btn => btn.addEventListener('click', () => {
  document.querySelectorAll('.chip').forEach(x => x.classList.remove('active'));
  btn.classList.add('active'); currentCategory = btn.dataset.category; applyPointFilters();
}));
$('searchInput').addEventListener('input', applyPointFilters);
$('pulauSel').addEventListener('change', e => map.fitBounds(e.target.value === 'ALL' ? ALL_BOUNDS : ISLAND_BOUNDS[e.target.value]));

/* ===== JALAN: kelas diambil dari data, legenda mengikuti data ===== */
const KELAS_WARNA = [['arteri', '#c0392b'], ['nasional', '#c0392b'], ['kolektor', '#e67e22'], ['provinsi', '#e67e22'], ['lokal', '#f1c40f'], ['kabupaten', '#f1c40f'], ['lingkungan', '#27ae60'], ['desa', '#27ae60'], ['setapak', '#8e44ad']];
const PALET = ['#16a085', '#2980b9', '#d35400', '#c0392b', '#8e44ad', '#f39c12', '#27ae60', '#7f8c8d', '#e84393', '#00acc1'];
const roadColor = {};
let roadField = null;
function pilihKolomKelas(fc) {
  const keys = kunciProps(fc);
  const sample = fc.features.slice(0, 3000);
  const distinct = k => { const s = new Set(); sample.forEach(f => { const v = f.properties && f.properties[k]; if (v !== null && v !== undefined && String(v).trim() !== '') s.add(String(v).trim()); }); return s.size; };
  const prior = ['REMARK', 'KELAS', 'KLASIFIKASI', 'JENJANG', 'FUNGSI', 'FCODE', 'JENIS', 'KATEGORI', 'TIPE', 'TYPE', 'STATUS', 'HIERARKI'];
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
function warnaKelas(k) {
  if (roadColor[k]) return roadColor[k];
  const n = norm(k), m = KELAS_WARNA.find(([w]) => n.includes(w));
  roadColor[k] = m ? m[1] : PALET[Object.keys(roadColor).length % PALET.length];
  return roadColor[k];
}
function addRoads(fc, file) {
  roadField = pilihKolomKelas(fc);
  log(`Kelas jalan dari kolom: ${roadField || '(tidak ditemukan)'}. Kolom tersedia: ${kunciProps(fc).join(', ')}`);
  const stats = {}; let total = 0;
  L.geoJSON(fc, {
    pane: 'p-jalan',
    style: f => ({ color: warnaKelas(kelasJalan(f.properties)), weight: 3, opacity: 0.95 }),
    onEachFeature: (f, layer) => {
      const p = f.properties || {}, kind = kelasJalan(p);
      let km = 0; try { km = turf.length(f, { units: 'kilometers' }); } catch (e) { /* abaikan */ }
      stats[kind] = (stats[kind] || 0) + km; total += km;
      roadFeatures.push({ layer, kind });
      const nm = firstProp(p, NAMA_KEYS);
      layer.on('click', () => detail(nm || kind, kind, [['Panjang', km.toFixed(3) + ' km'], ['Layer', file], ...dataRows(p).slice(0, 12)]));
      if (nm) layer.bindTooltip(esc(nm), { sticky: true });
    }
  }).addTo(G.jalan);
  const rows = Object.entries(stats).sort((a, b) => b[1] - a[1]);
  $('statistikContainer').innerHTML = '<table class="stat-table"><tr><th>Jenis/kelas jalan</th><th class="num">km</th></tr>' +
    rows.map(([k, v]) => `<tr><td><i style="background:${warnaKelas(k)};display:inline-block;width:13px;height:4px;margin-right:5px"></i>${esc(k)}</td><td class="num">${v.toFixed(2)}</td></tr>`).join('') +
    `<tr><th>Total panjang</th><th class="num">${total.toFixed(2)}</th></tr></table>`;
  const sel = $('filterJalan'); sel.innerHTML = '<option value="ALL">Semua jenis jalan</option>';
  rows.forEach(([k]) => sel.add(new Option(k, k)));
  renderLegend();
}
$('filterJalan').addEventListener('change', e => {
  roadFeatures.forEach(({ layer, kind }) => {
    const show = e.target.value === 'ALL' || kind === e.target.value;
    layer.setStyle({ opacity: show ? 0.95 : 0.06, weight: show ? 3 : 1 });
  });
});

/* ===== BANGUNAN & PEMERINTAHAN ===== */
function tampilLayerFasilitas(tipe, fc, file) {
  const warna = tipe === 'pemerintahan' ? '#8e44ad' : '#e84393';
  L.geoJSON(fc, {
    pane: 'p-' + tipe,
    style: () => ({ color: warna, weight: 1, fillColor: warna, fillOpacity: 0.5 }),
    pointToLayer: (f, ll) => tipe === 'pemerintahan'
      ? L.marker(ll, { icon: markerIcon('Pemerintahan') })
      : L.circleMarker(ll, { pane: 'p-bangunan', radius: 4, color: '#ffffff', weight: 1, fillColor: warna, fillOpacity: 0.9 }),
    onEachFeature: (f, l) => {
      const p = f.properties || {}, nm = firstProp(p, NAMA_KEYS);
      if (nm) l.bindTooltip(esc(nm), { sticky: true });
      l.on('click', () => detail(nm || (tipe === 'bangunan' ? 'Bangunan' : 'Pemerintahan'), tipe === 'pemerintahan' ? 'Pemerintahan' : 'Bangunan', [['Layer', file], ...dataRows(p)]));
    }
  }).addTo(G[tipe]);
}

/* ===== PROSES TIAP FILE ===== */
function prosesLayer(tipe, fc, file) {
  if (tipe === 'jalan') { addRoads(fc, file); return; }
  if (tipe === 'bangunan' || tipe === 'pemerintahan') { tampilLayerFasilitas(tipe, fc, file); return; }
  L.geoJSON(fc, {
    pane: 'p-' + tipe,
    style: () => GAYA[tipe],
    onEachFeature: (f, l) => {
      const p = f.properties || {};
      const nm = firstProp(p, NAMA_KEYS.concat(['WADMKC', 'WADMKD', 'NAMKEC', 'NAMDESA']));
      if (nm) l.bindTooltip(esc(nm), { sticky: true });
      l.on('click', () => detail(nm || file, 'Area', dataRows(p)));
    }
  }).addTo(G[tipe]);
}
async function muatFile({ file, tipe }) {
  try {
    const res = await fetch(encodeURI(file));
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const fc = featureCollection(await res.json());
    if (!fc || !fc.features.length) throw new Error('tidak berisi fitur');
    if (!validWgs84(fc)) throw new Error('koordinat bukan lon/lat (WGS84), ekspor ulang dengan EPSG:4326');
    log(`${file}: ${fc.features.length} fitur`);
    prosesLayer(tipe, fc, file);
    return true;
  } catch (err) { log(`${file} GAGAL: ${err.message}`); return false; }
}

/* ===== WISATA MANUAL + OSM ===== */
const namaManual = WISATA_MANUAL.map(w => norm(w[0]));
const sudahManual = nama => { const n = norm(nama); return namaManual.some(m => n.includes(m) || m.includes(n)); };
const Q = '(-6.2,123.3,-5.15,124.7)';
const OVERPASS_QUERY = `[out:json][timeout:60];(
 nwr["place"~"^(village|hamlet|suburb|neighbourhood|town|quarter)$"]${Q};
 nwr["amenity"~"^(school|college|university|kindergarten|hospital|clinic|doctors|townhall|police|courthouse)$"]${Q};
 nwr["healthcare"]${Q}; nwr["office"="government"]${Q};
 nwr["tourism"~"^(attraction|viewpoint|museum|resort|hotel|guest_house)$"]${Q};
 nwr["historic"]${Q}; nwr["natural"~"^(beach|cave_entrance)$"]${Q}; nwr["sport"="scuba_diving"]${Q};
);out center tags;`;
async function loadOSM() {
  const mirrors = ['https://overpass-api.de/api/interpreter', 'https://overpass.private.coffee/api/interpreter'];
  for (const url of mirrors) {
    try {
      log('Mengambil fasilitas OSM dari ' + new URL(url).host);
      const res = await fetch(url, { method: 'POST', body: 'data=' + encodeURIComponent(OVERPASS_QUERY) });
      if (!res.ok) throw new Error('HTTP ' + res.status);
      const data = await res.json();
      let count = 0;
      data.elements.forEach(e => {
        const t = e.tags || {};
        let category = null;
        if (/^(school|college|university|kindergarten)$/.test(t.amenity || '')) category = 'Pendidikan';
        else if (/^(hospital|clinic|doctors)$/.test(t.amenity || '') || t.healthcare) category = 'Kesehatan';
        else if (/^(townhall|police|courthouse)$/.test(t.amenity || '') || t.office === 'government') category = 'Pemerintahan';
        else if (t.tourism || t.historic || t.natural || t.sport) category = 'Pariwisata';
        else if (t.place) category = 'Permukiman';
        if (!category) return;
        const lat = e.lat ?? e.center?.lat, lon = e.lon ?? e.center?.lon;
        if (lat == null || lon == null) return;
        const nm = t.name || t['name:id'] || `${category} (tanpa nama)`;
        if (category === 'Pariwisata' && sudahManual(nm)) return;
        addPoint({ name: nm, category, lat: Number(lat), lon: Number(lon), source: 'OpenStreetMap', properties: t });
        count++;
      });
      log(`${count} titik OSM diproses.`);
      return count;
    } catch (err) { log(`OSM ${new URL(url).host} gagal: ${err.message}`); }
  }
  log('Data OSM tidak termuat. Layer GeoJSON tetap digunakan.');
  return 0;
}

/* ===== LEGENDA (jalan mengikuti data) ===== */
const legendDiv = L.DomUtil.create('div', 'legend');
const legend = L.control({ position: 'bottomright' });
legend.onAdd = () => legendDiv;
legend.addTo(map);
function renderLegend() {
  const jalan = Object.keys(roadColor).sort().map(k =>
    `<div class="legend-item"><span class="legend-line" style="background:${roadColor[k]}"></span>${esc(k)}</div>`).join('');
  legendDiv.innerHTML =
    (jalan ? `<div class="legend-title">Jaringan jalan</div>${jalan}` : '') +
    '<div class="legend-title" style="margin-top:6px">Lapisan</div>' +
    '<div class="legend-item"><span class="legend-box" style="border-color:#f4e342"></span>Batas kabupaten</div>' +
    '<div class="legend-item"><span class="legend-box" style="border-color:#ff8c42;border-style:dashed"></span>Batas kecamatan</div>' +
    '<div class="legend-item"><span class="legend-box" style="border-color:#999;border-style:dotted"></span>Batas desa/kelurahan</div>' +
    '<div class="legend-item"><span class="legend-box" style="border-color:#8e44ad;background:#8e44ad66"></span>Permukiman</div>' +
    '<div class="legend-item"><span class="legend-dot" style="background:#e84393"></span>Bangunan</div>' +
    '<div class="legend-item"><span class="legend-dot" style="background:#8e44ad"></span>Pemerintahan</div>' +
    '<div class="legend-item"><span class="legend-line" style="background:#00e5ff"></span>Garis pantai</div>';
}
renderLegend();

/* ===== INISIALISASI ===== */
(async function init() {
  $('statusData').textContent = 'Memuat data GeoJSON...';
  let ok = 0;
  for (const f of FILES) if (await muatFile(f)) ok++;
  WISATA_MANUAL.forEach(([nama, lat, lon]) => addPoint({ name: nama, category: 'Pariwisata', lat, lon, source: 'Data wisata (koordinat diperbarui)' }));
  updateRecap(); applyPointFilters();
  map.fitBounds(ALL_BOUNDS);
  $('statusData').textContent = ok === FILES.length
    ? `${ok} layer GeoJSON berhasil dimuat. Memuat fasilitas OSM...`
    : `${ok} dari ${FILES.length} layer berhasil. Lihat log di bawah.`;
  if (ok < FILES.length) $('statusData').classList.add('error');
  await loadOSM();
  updateRecap(); applyPointFilters();
  if (ok === FILES.length) $('statusData').textContent = `Selesai: ${ok} layer dan ${points.length} titik fasilitas dimuat.`;
})();
