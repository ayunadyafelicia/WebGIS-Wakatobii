/* ===== KONFIGURASI ===== */
const CONFIG = {
  center: [-5.3, 123.6],
  zoom: 10,
  // Jika sudah tahu path pastinya, isi di sini. Contoh: kabupaten: 'data/batas_kabupaten.geojson'
  // Jika dikosongkan, kode mencoba banyak kemungkinan nama dan folder.
  data: {
    kabupaten: '', kecamatan: '', desa: '', jalan: '',
    pantai: '', permukiman: '', bangunan: '', pemerintahan: ''
  },
  folders: ['data/', 'geojson/', 'assets/', ''],
  ext: ['.geojson', '.json'],
  alias: {
    desa: ['batas_desa', 'desa_kelurahan', 'kelurahan'],
    jalan: ['jaringan_jalan', 'jaringan-jalan'],
    pantai: ['garis_pantai', 'garis-pantai'],
    permukiman: ['pemukiman'],
    bangunan: ['gedung'],
    pemerintahan: ['pemerintah']
  },
  kecamatanFields: ['NAMOBJ', 'KECAMATAN', 'kecamatan', 'WADMKC', 'NAMA', 'nama', 'NAME']
};

const LABEL = {
  kabupaten: 'Batas Kabupaten', kecamatan: 'Batas Kecamatan', desa: 'Batas Desa/Kelurahan',
  jalan: 'Jaringan Jalan', pantai: 'Garis Pantai', permukiman: 'Permukiman',
  bangunan: 'Bangunan', pemerintahan: 'Pemerintahan'
};

/* ===== DATA PARIWISATA ===== */
const PARIWISATA = [
  { nama: 'Liya Togo', lat: -5.373675, lng: 123.628725, kategori: 'wisata-sejarah' },
  { nama: 'Mola Village', lat: -5.343792, lng: 123.540861, kategori: 'wisata-budaya' },
  { nama: 'Waha Tourism Community', lat: -5.251764, lng: 123.526725, kategori: 'wisata-budaya' },
  { nama: 'Pantai Cemara', lat: -5.261164, lng: 123.520286, kategori: 'wisata-pantai' },
  { nama: 'Moli Sahatu Beach', lat: -5.248033, lng: 123.587, kategori: 'wisata-pantai' },
  { nama: 'Puncak Toliamba', lat: -5.295711, lng: 123.544767, kategori: 'wisata-alam' },
  { nama: 'Goa Air Kontamale', lat: -5.318097, lng: 123.534756, kategori: 'wisata-alam' },
  // Koordinat dua lokasi ini tidak diubah: salin dari app.js lamamu
  { nama: 'Pantai Sousu', lat: null, lng: null, kategori: 'wisata-pantai' },
  { nama: 'Benteng Tidoi', lat: null, lng: null, kategori: 'wisata-sejarah' }
];

const KATEGORI_STYLE = {
  'wisata-bahari': { warna: '#0077b6', ikon: 'fa-water' },
  'wisata-pantai': { warna: '#00a8cc', ikon: 'fa-umbrella-beach' },
  'wisata-alam': { warna: '#2e8b57', ikon: 'fa-mountain' },
  'wisata-budaya': { warna: '#d35400', ikon: 'fa-people-group' },
  'wisata-sejarah': { warna: '#8b4513', ikon: 'fa-monument' }
};

/* ===== GAYA LAYER ===== */
const GAYA = {
  kabupaten: { color: '#f4e342', weight: 3, fillColor: '#f4e342', fillOpacity: 0.18 },
  kecamatan: { color: '#ff8c42', weight: 2, dashArray: '8 6', fillColor: '#ff8c42', fillOpacity: 0.12 },
  desa: { color: '#eeeeee', weight: 1.5, dashArray: '2 5', fillColor: '#ffffff', fillOpacity: 0.05 },
  jalan: { color: '#ff3b30', weight: 3 },
  pantai: { color: '#00e5ff', weight: 3, dashArray: '8 6' },
  permukiman: { color: '#8e44ad', weight: 2, fillColor: '#8e44ad', fillOpacity: 0.35 },
  bangunan: { color: '#e84393', weight: 1, fillColor: '#e84393', fillOpacity: 0.5 },
  pemerintahan: { color: '#8e44ad', weight: 2, fillColor: '#8e44ad', fillOpacity: 0.4 }
};
const IKON_TITIK = {
  bangunan: ['#e84393', 'fa-building'],
  pemerintahan: ['#8e44ad', 'fa-landmark'],
  permukiman: ['#8e44ad', 'fa-house-chimney']
};
const URUTAN = ['kabupaten', 'kecamatan', 'desa', 'permukiman', 'bangunan', 'pemerintahan', 'pantai', 'jalan'];

/* ===== PETA & BASEMAP ===== */
const map = L.map('map').setView(CONFIG.center, CONFIG.zoom);
URUTAN.forEach((n, i) => { map.createPane('p-' + n).style.zIndex = 401 + i; });

const basemaps = {
  satelit: L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', { maxZoom: 19, attribution: 'Tiles &copy; Esri' }),
  osm: L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19, attribution: '&copy; OpenStreetMap' })
};
basemaps.satelit.addTo(map);
document.querySelectorAll('input[name="basemap"]').forEach(r => {
  r.addEventListener('change', () => {
    Object.values(basemaps).forEach(b => map.removeLayer(b));
    basemaps[r.value].addTo(map);
  });
});

/* ===== UTIL ===== */
const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const hasil = document.getElementById('hasil');
const statusBox = document.getElementById('status-data');
const statusBaris = {};

function tampilDetail(judul, props) {
  const rows = Object.entries(props || {})
    .filter(([, v]) => v !== null && v !== '' && typeof v !== 'object')
    .map(([k, v]) => `<div class="detail-row"><b>${esc(k)}:</b> ${esc(v)}</div>`).join('');
  hasil.innerHTML = `<div class="detail-title">${esc(judul)}</div>${rows}`;
}
const namaKecamatan = p => {
  for (const f of CONFIG.kecamatanFields) if (p && p[f]) return p[f];
  return null;
};
const judulFitur = p => namaKecamatan(p) || (p && (p.nama || p.NAMA || p.NAMOBJ || p.name)) || 'Objek';

function setStatus(nama, ok, url) {
  if (!statusBaris[nama]) {
    if (!Object.keys(statusBaris).length) statusBox.innerHTML = '';
    statusBaris[nama] = document.createElement('div');
    statusBox.appendChild(statusBaris[nama]);
  }
  statusBaris[nama].className = ok ? 'ok' : 'gagal';
  statusBaris[nama].textContent = ok
    ? `✓ ${LABEL[nama]} (${url})`
    : `✗ ${LABEL[nama]}: file tidak ditemukan, isi path di CONFIG.data.${nama}`;
}

function buatIkon(warna, ikon) {
  return L.divIcon({
    className: 'marker-wrap',
    html: `<div class="custom-marker" style="background:${warna}"><i class="fa-solid ${ikon}"></i></div>`,
    iconSize: [32, 32],
    iconAnchor: [16, 16],
    popupAnchor: [0, -16]
  });
}

/* ===== MUAT GEOJSON (coba banyak kemungkinan path) ===== */
function kandidat(nama) {
  if (CONFIG.data[nama]) return [CONFIG.data[nama]];
  const names = [...new Set([nama, ...(CONFIG.alias[nama] || []), 'batas_' + nama, 'batas-' + nama])];
  const out = [];
  CONFIG.folders.forEach(f => names.forEach(n => CONFIG.ext.forEach(e => out.push(f + n + e))));
  return out;
}

async function muatGeoJSON(nama) {
  for (const url of kandidat(nama)) {
    try {
      const r = await fetch(url);
      if (!r.ok) continue;
      return { url, geo: await r.json() };
    } catch (e) { /* lanjut ke kandidat berikutnya */ }
  }
  return null;
}

const layers = {};
const kecamatanLayer = {};

function aktifkan(nama) {
  const cb = document.querySelector(`input[data-layer="${nama}"]`);
  if (layers[nama] && (!cb || cb.checked)) layers[nama].addTo(map);
}

URUTAN.forEach(async nama => {
  const hsl = await muatGeoJSON(nama);
  if (!hsl) { setStatus(nama, false); return; }
  setStatus(nama, true, hsl.url);

  layers[nama] = L.geoJSON(hsl.geo, {
    pane: 'p-' + nama,
    style: () => GAYA[nama],
    pointToLayer: (f, ll) => {
      const [w, i] = IKON_TITIK[nama] || ['#555', 'fa-location-dot'];
      return L.marker(ll, { icon: buatIkon(w, i) });
    },
    onEachFeature: (f, layer) => {
      layer.on('click', () => tampilDetail(judulFitur(f.properties), f.properties));
      if (nama === 'kecamatan') {
        const n = namaKecamatan(f.properties);
        if (n) kecamatanLayer[n] = layer;
      }
    }
  });
  aktifkan(nama);
  if (nama === 'kecamatan') isiPilihanKecamatan();
});

/* ===== PARIWISATA ===== */
layers.pariwisata = L.layerGroup();
function tampilPariwisata(kategori) {
  layers.pariwisata.clearLayers();
  PARIWISATA.forEach(p => {
    if (p.lat === null || p.lng === null) return;
    if (kategori !== 'semua' && p.kategori !== kategori) return;
    const s = KATEGORI_STYLE[p.kategori] || { warna: '#00a8cc', ikon: 'fa-location-dot' };
    L.marker([p.lat, p.lng], { icon: buatIkon(s.warna, s.ikon) })
      .on('click', () => tampilDetail(p.nama, {
        Kategori: p.kategori.replace('wisata-', 'Wisata '),
        Latitude: p.lat,
        Longitude: p.lng
      }))
      .addTo(layers.pariwisata);
  });
}
tampilPariwisata('semua');
aktifkan('pariwisata');

document.querySelectorAll('.chip').forEach(chip => {
  chip.addEventListener('click', () => {
    document.querySelectorAll('.chip').forEach(c => c.classList.remove('active'));
    chip.classList.add('active');
    tampilPariwisata(chip.dataset.category);
  });
});

/* ===== CHECKBOX LAYER ===== */
document.querySelectorAll('input[data-layer]').forEach(cb => {
  cb.addEventListener('change', () => {
    const l = layers[cb.dataset.layer];
    if (!l) return;
    cb.checked ? l.addTo(map) : map.removeLayer(l);
  });
});

/* ===== AUTO ZOOM KE KECAMATAN ===== */
const selectKec = document.getElementById('pilih-kecamatan');

function isiPilihanKecamatan() {
  Object.keys(kecamatanLayer).sort().forEach(n => {
    const o = document.createElement('option');
    o.value = n;
    o.textContent = n;
    selectKec.appendChild(o);
  });
}

selectKec.addEventListener('change', () => {
  const n = selectKec.value;
  if (!n) {
    map.flyTo(CONFIG.center, CONFIG.zoom, { duration: 1 });
    return;
  }
  const layer = kecamatanLayer[n];
  if (!layer) return;
  map.flyToBounds(layer.getBounds(), { padding: [30, 30], duration: 1 });
  layer.setStyle({ weight: 4, color: '#ffffff', fillOpacity: 0.3 });
  tampilDetail('Kecamatan ' + n, layer.feature.properties);
  setTimeout(() => layers.kecamatan && layers.kecamatan.resetStyle(layer), 2500);
});
