/* ===== KONFIGURASI (sesuaikan dengan datamu) ===== */
const CONFIG = {
  center: [-5.3, 123.6],
  zoom: 10,
  data: {
    kabupaten: 'data/kabupaten.geojson',
    kecamatan: 'data/kecamatan.geojson',
    desa: 'data/desa.geojson',
    jalan: 'data/jalan.geojson',
    pantai: 'data/pantai.geojson',
    permukiman: 'data/permukiman.geojson',
    bangunan: 'data/bangunan.geojson',
    pemerintahan: 'data/pemerintahan.geojson'
  },
  // urutan nama atribut kecamatan yang dicoba
  kecamatanFields: ['NAMOBJ', 'KECAMATAN', 'kecamatan', 'WADMKC', 'NAMA', 'nama', 'NAME']
};

/* ===== DATA PARIWISATA (koordinat sudah diperbaiki) ===== */
const PARIWISATA = [
  { nama: 'Liya Togo', lat: -5.373675, lng: 123.628725, kategori: 'wisata-sejarah' },
  { nama: 'Mola Village', lat: -5.343792, lng: 123.540861, kategori: 'wisata-budaya' },
  { nama: 'Waha Tourism Community', lat: -5.251764, lng: 123.526725, kategori: 'wisata-budaya' },
  { nama: 'Pantai Cemara', lat: -5.261164, lng: 123.520286, kategori: 'wisata-pantai' },
  { nama: 'Moli Sahatu Beach', lat: -5.248033, lng: 123.587, kategori: 'wisata-pantai' },
  { nama: 'Puncak Toliamba', lat: -5.295711, lng: 123.544767, kategori: 'wisata-alam' },
  { nama: 'Goa Air Kontamale', lat: -5.318097, lng: 123.534756, kategori: 'wisata-alam' },
  // Koordinat tidak diubah: salin dari app.js lamamu
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
  desa: { color: '#eeeeee', weight: 1.5, dashArray: '2 5', fillColor: '#ffffff', fillOpacity: 0.08 },
  jalan: { color: '#ff3b30', weight: 3 },
  pantai: { color: '#00e5ff', weight: 3, dashArray: '8 6' },
  permukiman: { color: '#8e44ad', weight: 2, fillColor: '#8e44ad', fillOpacity: 0.35 },
  bangunan: { color: '#e84393', weight: 1, fillColor: '#e84393', fillOpacity: 0.5 },
  pemerintahan: { color: '#8e44ad', weight: 2, fillColor: '#8e44ad', fillOpacity: 0.4 }
};
const IKON_TITIK = { bangunan: ['#e84393', 'fa-building'], pemerintahan: ['#8e44ad', 'fa-landmark'], permukiman: ['#8e44ad', 'fa-house-chimney'] };

/* ===== PETA & BASEMAP ===== */
const map = L.map('map').setView(CONFIG.center, CONFIG.zoom);
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

function tampilDetail(judul, props) {
  const rows = Object.entries(props || {})
    .filter(([, v]) => v !== null && v !== '')
    .map(([k, v]) => `<div class="detail-row"><b>${esc(k)}:</b> ${esc(v)}</div>`).join('');
  hasil.innerHTML = `<div class="detail-title">${esc(judul)}</div>${rows}`;
}
const namaKecamatan = p => {
  for (const f of CONFIG.kecamatanFields) if (p && p[f]) return p[f];
  return null;
};
const judulFitur = p => namaKecamatan(p) || (p && (p.nama || p.NAMA || p.NAMOBJ || p.name)) || 'Objek';

function buatIkon(warna, ikon) {
  return L.divIcon({
    className: 'marker-wrap',
    html: `<div class="custom-marker" style="background:${warna}"><i class="fa-solid ${ikon}"></i></div>`,
    iconSize: [32, 32],
    iconAnchor: [16, 16],
    popupAnchor: [0, -16]
  });
}

/* ===== LAYER GEOJSON ===== */
const layers = {};
const kecamatanLayer = {}; // nama -> sublayer, untuk auto zoom

function aktifkan(nama) {
  const cb = document.querySelector(`input[data-layer="${nama}"]`);
  if (layers[nama] && cb && cb.checked) layers[nama].addTo(map);
}

Object.entries(CONFIG.data).forEach(([nama, url]) => {
  fetch(url)
    .then(r => { if (!r.ok) throw new Error(r.status); return r.json(); })
    .then(geo => {
      layers[nama] = L.geoJSON(geo, {
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
      if (['jalan', 'pantai'].includes(nama) === false && layers.pariwisata) layers.pariwisata.eachLayer(l => l.bringToFront && l.bringToFront());
    })
    .catch(err => console.warn(`Layer ${nama} gagal dimuat (${url}):`, err));
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
