// WebGIS Kabupaten Wakatobi — memuat ZIP SHP secara otomatis dan data fasilitas OSM.
const $ = id => document.getElementById(id);
const log = msg => { const el = $('log'); el.textContent += msg + '\n'; el.scrollTop = el.scrollHeight; };

const SHP_ZIP_URL = './WEBGIS_WAKATOBI.ZIP'; // Letakkan ZIP sejajar dengan index.html.
const map = L.map('map', { preferCanvas: true }).setView([-5.55, 123.75], 9);
const imagery = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', { maxZoom: 19, attribution: 'Esri, Maxar' }).addTo(map);
const osmTiles = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19, attribution: '&copy; OpenStreetMap' });
const roadGroup = L.layerGroup().addTo(map);
const pointGroup = L.layerGroup().addTo(map);
const polygonGroup = L.layerGroup().addTo(map);
L.control.layers({ 'Citra Esri': imagery, 'OpenStreetMap': osmTiles }, { 'Jaringan jalan': roadGroup, 'Titik fasilitas': pointGroup, 'Batas dan area SHP': polygonGroup }).addTo(map);
L.control.scale({ imperial: false }).addTo(map);

const CATS = {
  Pariwisata: { cls:'bg-pariwisata', icon:'fa-umbrella-beach', color:'#e67e22' },
  Pendidikan: { cls:'bg-pendidikan', icon:'fa-graduation-cap', color:'#2980b9' },
  Kesehatan: { cls:'bg-kesehatan', icon:'fa-hospital', color:'#e74c3c' },
  Pemerintahan: { cls:'bg-pemerintahan', icon:'fa-building-columns', color:'#8e44ad' },
  Permukiman: { cls:'bg-permukiman', icon:'fa-house-chimney', color:'#d4ac0d' },
  Lainnya: { cls:'bg-lainnya', icon:'fa-location-dot', color:'#34495e' }
};
const ISLAND_BOUNDS = {
  'Wangi-Wangi': [[-5.48,123.43],[-5.20,123.65]],
  'Kaledupa': [[-5.55,123.68],[-5.38,123.83]],
  'Tomia': [[-5.72,123.88],[-5.55,124.02]],
  'Binongko': [[-6.10,123.92],[-5.82,124.20]]
};
const ALL_BOUNDS = [[-6.2,123.3],[-5.15,124.7]];
let points = [], markerRefs = [], roadFeatures = [], currentCategory = 'ALL';

// Zoom ke kecamatan: bounds diambil dari SHP administrasi kecamatan.
const kecamatanBounds = {};
const zoomKecamatanEl = document.getElementById('zoomKecamatan');
if (zoomKecamatanEl) zoomKecamatanEl.innerHTML = '<option value="">Seluruh Wakatobi</option>';
function getKecamatanName(p) {
  return firstProp(p, ['NAMOBJ','WADMKC','NAMKEC','NAMAKEC','NAMA_KEC','KECAMATAN','NAMKECAM','NAME_2','NAME','name']);
}
function addKecamatanBounds(name, bounds) {
  if (!name || !bounds || !bounds.isValid()) return;
  if (kecamatanBounds[name]) kecamatanBounds[name].extend(bounds);
  else kecamatanBounds[name] = bounds;
  if (zoomKecamatanEl && !Array.from(zoomKecamatanEl.options).some(o => o.value === name)) {
    zoomKecamatanEl.add(new Option(name, name));
  }
}
if (zoomKecamatanEl) zoomKecamatanEl.addEventListener('change', e => {
  const name = e.target.value;
  if (!name) { map.fitBounds(ALL_BOUNDS); return; }
  const bounds = kecamatanBounds[name];
  if (bounds && bounds.isValid()) map.flyToBounds(bounds, {padding:[30,30], maxZoom:14, duration:1.2});
});

function esc(v) {
  return String(v ?? '-').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}
function norm(s) { return String(s ?? '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,''); }
function propsText(p) { return Object.entries(p || {}).map(([k,v]) => `${k} ${v}`).join(' '); }
function firstProp(p, keys) {
  for (const k of keys) if (p && p[k] !== null && p[k] !== undefined && String(p[k]).trim() !== '') return p[k];
  return '';
}
function islandFrom(lat, lon) {
  // Label pulau bersifat perkiraan berdasarkan posisi geografis; geometri SHP tetap menjadi acuan lokasi.
  if (lat > -5.48 && lon < 123.68) return 'Wangi-Wangi';
  if (lat > -5.58 && lon >= 123.65 && lon < 123.87) return 'Kaledupa';
  if (lat > -5.80 && lon >= 123.85 && lon < 124.08) return 'Tomia';
  if (lat <= -5.80 && lon >= 123.88) return 'Binongko';
  return 'Pulau kecil/area lain';
}
function classifyText(text) {
  const t = norm(text);
  if (/sekolah|sdn?|smpn?|sman?|smk|madrasah|mts|mi\b|paud|tk\b|universitas|politeknik|pesantren|pendidikan/.test(t)) return 'Pendidikan';
  if (/puskesmas|pustu|rumah sakit|rsud|klinik|dokter|posyandu|polindes|poskesdes|apotek|kesehatan/.test(t)) return 'Kesehatan';
  if (/kantor|camat|bupati|dprd|kelurahan|kecamatan|polres|polsek|koramil|kodim|pemerintah|balai desa|instansi/.test(t)) return 'Pemerintahan';
  if /pantai|wisata|objek wisata|destinasi|benteng|gua|goa|diving|selam|resort|keraton|museum|taman wisata|air terjun|tourism/.test(t)) return 'Pariwisata';
  if /permukiman|pemukiman|perumahan|kampung|dusun|permukiman|village|residential/.test(t)) return 'Permukiman';
  return null;
}
function markerIcon(category) {
  const c = CATS[category] || CATS.Lainnya;
  return L.divIcon({ className:'', html:`<div class="custom-marker ${c.cls}"><i class="fa-solid ${c.icon}"></i></div>`, iconSize:[30,30], iconAnchor:[15,15] });
}
function detail(title, category, rows) {
  const c = CATS[category] || {cls:'bg-lainnya'};
  $('hasil').innerHTML = `<div class="detail-title">${esc(title)}</div><span class="detail-category ${c.cls}">${esc(category)}</span><hr style="margin:6px 0">` +
    rows.map(([k,v]) => `<div class="detail-info-row"><b>${esc(k)}:</b> ${esc(v)}</div>`).join('');
}
function addPoint({name, category, lat, lon, source, properties={}}) {
  if (!Number.isFinite(lat) || !Number.isFinite(lon) || Math.abs(lat)>90 || Math.abs(lon)>180) return;
  const duplicate = points.some(p => p.name === name && Math.abs(p.lat-lat)<0.00003 && Math.abs(p.lon-lon)<0.00003);
  if (duplicate) return;
  const island = islandFrom(lat,lon);
  const d = {name:name || category, category, lat, lon, source, island, properties};
  const m = L.marker([lat,lon], {icon:markerIcon(category)});
  m.bindTooltip(esc(d.name), {direction:'top'});
  m.on('click', () => detail(d.name, d.category, [
    ['Pulau/area', d.island], ['Sumber data', d.source],
    ['Lintang', d.lat.toFixed(6)], ['Bujur', d.lon.toFixed(6)],
    ...Object.entries(d.properties).slice(0,8).map(([k,v])=>[k,v])
  ]));
  m.featureData = d;
  points.push(d); markerRefs.push(m); pointGroup.addLayer(m);
}
function updateRecap() {
  const counts = {};
  points.forEach(p => counts[p.category] = (counts[p.category]||0)+1);
  $('rekap').innerHTML = `<table class="stat-table"><tr><th>Kategori</th><th class="num">Titik</th></tr>` +
    Object.entries(CATS).filter(([k])=>counts[k]).map(([k])=>`<tr><td>${esc(k)}</td><td class="num">${counts[k]}</td></tr>`).join('') + '</table>';
}
function applyPointFilters() {
  const q = norm($('searchInput').value.trim());
  markerRefs.forEach(m => {
    const d = m.featureData;
    const visible = (currentCategory==='ALL' || d.category===currentCategory) && norm(d.name).includes(q);
    if (visible) { if (!pointGroup.hasLayer(m)) pointGroup.addLayer(m); }
    else pointGroup.removeLayer(m);
  });
}
document.querySelectorAll('.chip').forEach(btn => btn.addEventListener('click', () => {
  document.querySelectorAll('.chip').forEach(x=>x.classList.remove('active'));
  btn.classList.add('active'); currentCategory=btn.dataset.category; applyPointFilters();
}));
$('searchInput').addEventListener('input', applyPointFilters);
$('pulauSel').addEventListener('change', e => map.fitBounds(e.target.value==='ALL' ? ALL_BOUNDS : ISLAND_BOUNDS[e.target.value]));
$('filterJalan').addEventListener('change', e => {
  roadFeatures.forEach(({layer,kind}) => {
    const show = e.target.value==='ALL' || kind===e.target.value;
    layer.setStyle({opacity:show?0.95:0.06, weight:show?3:1});
  });
});

const roadStyle = {
  'Jalan arteri':'#c0392b', 'Jalan kolektor':'#e67e22', 'Jalan lokal':'#f1c40f',
  'Jalan lingkungan':'#27ae60', 'Jalan setapak':'#8e44ad', 'Jalan lainnya':'#34495e'
};
function roadKind(p) {
  const raw = norm(firstProp(p,['REMARK','KELAS','KLASIFIKASI','JENJANG','FUNGSI','FCODE','JENIS','NAMOBJ']));
  if (/arteri|primary|trunk/.test(raw)) return 'Jalan arteri';
  if (/kolektor|secondary/.test(raw)) return 'Jalan kolektor';
  if /lokal|tertiary/.test(raw)) return 'Jalan lokal';
  if /lingkungan|residential|unclassified/.test(raw)) return 'Jalan lingkungan';
  if /setapak|footway|path|track|steps/.test(raw)) return 'Jalan setapak';
  return 'Jalan lainnya';
}
function addRoads(fc, layerName) {
  const stats = {}, total = {km:0};
  const group = L.geoJSON(fc, {
    style: f => { const kind=roadKind(f.properties||{}); return {color:roadStyle[kind],weight:3,opacity:0.95}; },
    onEachFeature: (f, layer) => {
      const p=f.properties||{}, kind=roadKind(p);
      let km=0; try { km=turf.length(f,{units:'kilometers'}); } catch(e) {}
      stats[kind]=(stats[kind]||0)+km; total.km+=km;
      roadFeatures.push({layer,kind});
      layer.on('click',()=>detail(firstProp(p,['NAMOBJ','NAMA','nama'])||kind,kind,[
        ['Panjang',km.toFixed(3)+' km'],['Layer',layerName],
        ...Object.entries(p).slice(0,12).map(([k,v])=>[k,v]
      ]));
      const nm=firstProp(p,['NAMOBJ','NAMA','nama']);
      if(nm) layer.bindTooltip(esc(nm),{sticky:true});
    }
  }).addTo(roadGroup);
  return {stats,total:total.km};
}
function showRoadStats(stats,total) {
  const rows=Object.entries(stats).sort((a,b)=>b[1]-a[1]);
  $('statistikContainer').innerHTML=`<table class="stat-table"><tr><th>Jenis/kelas jalan</th><th class="num">km</th></tr>`+
    rows.map(([k,v])=>`<tr><td><i style="background:${roadStyle[k]};display:inline-block;width:13px;height:4px;margin-right:5px"></i>${esc(k)}</td><td class="num">${v.toFixed(2)}</td></tr>`).join('')+
    `<tr><th>Total panjang</th><th class="num">${total.toFixed(2)}</th></tr></table>`;
  const sel=$('filterJalan'); sel.innerHTML='<option value="ALL">Semua jenis jalan</option>';
  rows.forEach(([k])=>sel.add(new Option(k,k)));
}
function featureCollection(value) {
  if (!value) return null;
  if (value.type==='FeatureCollection') return value;
  if (value.type==='Feature') return {type:'FeatureCollection',features:[value]};
  if (Array.isArray(value.features)) return {type:'FeatureCollection',features:value.features};
  return null;
}
function validWgs84(fc) {
  const f=fc.features.find(x=>x.geometry && x.geometry.coordinates);
  if(!f) return true;
  let c=f.geometry.coordinates;
  while(Array.isArray(c[0])) c=c[0];
  return Number.isFinite(c[0]) && Number.isFinite(c[1]) && Math.abs(c[0])<=180 && Math.abs(c[1])<=90;
}
function layerNameOf(name) { return norm(name).replace(/\.shp$/,'').replace(/^.*\//,'').replace(/[_-]+/g,''); }
function handleSHP(name, value) {
  const fc=featureCollection(value);
  if(!fc || !fc.features.length) { log(`SHP ${name}: tidak berisi fitur GeoJSON.`); return; }
  if(!validWgs84(fc)) { log(`SHP ${name}: koordinat bukan longitude/latitude. Pastikan file .prj ikut di dalam ZIP.`); return; }
  const n=layerNameOf(name);
  log(`SHP ${name}: ${fc.features.length} fitur`);
  if(n.includes('jalan') || n.includes('jaringanjalan')) {
    const result=addRoads(fc,name); showRoadStats(result.stats,result.total); return;
  }

  // Tampilkan poligon administrasi dan poligon permukiman sebagai layer area.
  const isAdmin=n.includes('administrasi') || n.includes('kecamatan') || n.includes('desa');
  const isSettlement=n.includes('permukiman') || n.includes('pemukiman');

  // Tambahan dropdown zoom kecamatan; tidak mengubah proses layer yang sudah ada.
  const isKecamatanLayer = n.includes('administrasikecamatan') || n.includes('administrasikec') || n.includes('kecamatan');
  if (isKecamatanLayer) {
    fc.features.forEach(f => {
      if (!f.geometry) return;
      const nama = getKecamatanName(f.properties || {});
      if (!nama) return;
      try { addKecamatanBounds(String(nama).trim(), L.geoJSON(f).getBounds()); }
      catch (err) { console.warn('Bounds kecamatan gagal:', nama, err); }
    });
    log(`${Object.keys(kecamatanBounds).length} kecamatan terbaca untuk dropdown zoom.`);
  }
  if(isAdmin || isSettlement) {
    L.geoJSON(fc,{style:()=>({
      color:isAdmin?'#ffffff':'#f1c40f', weight:isAdmin?1.4:1.2,
      fillColor:isAdmin?'#2c3e50':'#f1c40f', fillOpacity:isAdmin?0.04:0.28
    }),onEachFeature:(f,l)=>{
      const p=f.properties||{}, nm=firstProp(p,['NAMOBJ','WADMKD','NAMDESA','NAMA']);
      if(nm) l.bindTooltip(esc(nm),{sticky:true});
      l.on('click',()=>detail(nm||name,'Area SHP',Object.entries(p).slice(0,12)));
    }}).addTo(polygonGroup);
  }

  let added=0;
  fc.features.forEach(f=>{
    if(!f.geometry) return;
    const p=f.properties||{};
    let category=null, coord=null;
    const geom=f.geometry;
    if(geom.type==='Point') coord=geom.coordinates;
    else if(geom.type==='MultiPoint') coord=geom.coordinates[0];
    else if(isSettlement && /Polygon/.test(geom.type)) {
      try { coord=turf.pointOnFeature(f).geometry.coordinates; category='Permukiman'; } catch(e) {}
    }
    if(!coord || coord.length<2) return;
    const [lon,lat]=coord;
    if(!category) {
      if(n.includes('fasilitaspendidikan')) category='Pendidikan';
      else if(n.includes('fasilitaskesehatan')) category='Kesehatan';
      else if(n.includes('pemerintahan')) category='Pemerintahan';
      else if(n.includes('bangunan')) category=classifyText(propsText(p));
      else category=classifyText(propsText(p));
    }
    if(category) {
      const nameValue=firstProp(p,['NAMOBJ','NAMObJ','NAMA','nama','NAME','namobj']) || `${category} ${added+1}`;
      addPoint({name:String(nameValue),category,lat:Number(lat),lon:Number(lon),source:`SHP: ${name}`,properties:p});
      added++;
    }
  });
  if(added) log(`  ${added} titik/representasi area ${name} ditambahkan.`);
  updateRecap(); applyPointFilters();
}

// Baca SHP langsung dari folder hasil ekstraksi.
// Folder KAB. WAKATOBI harus sejajar dengan index.html.
const SHP_FOLDER = './KAB. WAKATOBI/';
const SHP_LAYERS = [
  'JALAN_LN_50K',
  'ADMINISTRASIKECAMATAN_AR_50K',
  'ADMINISTRASIDESA_AR_50K',
  'PERMUKIMAN_AR_50K',
  'BANGUNAN_PT_50K',
  'PEMERINTAHAN_PT_50K',
  'DERMAGA_PT_50K',
  'SARANAIBADAH_PT_50K',
  'FASILITASPENDIDIKAN_PT_50K',
  'FASILITASKESEHATAN_PT_50K'
];

async function loadSHPFolder() {
  if (typeof shp !== 'function') throw new Error('Pustaka shpjs tidak berhasil dimuat.');
  let loaded=0, failed=0;
  log('Membaca SHP langsung dari folder ' + SHP_FOLDER);
  for (const layerName of SHP_LAYERS) {
    const url = encodeURI(SHP_FOLDER + layerName);
    try {
      log('Memuat layer: ' + layerName);
      // shpjs mengambil pasangan .shp, .dbf, dan .prj dari basename ini.
      const parsed = await shp(url);
      if (parsed && parsed.type === 'FeatureCollection') {
        handleSHP(layerName, parsed);
        loaded++;
      } else if (parsed && typeof parsed === 'object') {
        const sublayers = Object.entries(parsed).filter(([,v]) => featureCollection(v));
        if (!sublayers.length) throw new Error('Tidak ada FeatureCollection pada layer ini.');
        sublayers.forEach(([subName, value]) => handleSHP(subName || layerName, value));
        loaded++;
      } else {
        throw new Error('Format SHP tidak dikenali.');
      }
    } catch (err) {
      failed++;
      log('Layer ' + layerName + ' tidak terbaca: ' + (err.message || err));
    }
  }
  log(`SHP selesai: ${loaded} layer berhasil, ${failed} layer gagal/tidak ditemukan.`);
  if (!loaded) throw new Error('Tidak ada SHP yang berhasil dibaca. Periksa nama layer dan struktur folder KAB. WAKATOBI.');
  return loaded;
}

const OVERPASS_QUERY=`[out:json][timeout:60];(
 nwr["place"~"^(village|hamlet|suburb|neighbourhood|town|quarter)$"](-6.2,123.3,-5.15,124.7);
 nwr["amenity"~"^(school|college|university|kindergarten|hospital|clinic|doctors|townhall|police|courthouse)$"](-6.2,123.3,-5.15,124.7);
 nwr["healthcare"](-6.2,123.3,-5.15,124.7);
 nwr["office"="government"](-6.2,123.3,-5.15,124.7);
 nwr["tourism"~"^(attraction|viewpoint|museum|resort|hotel|guest_house)$"](-6.2,123.3,-5.15,124.7);
 nwr["historic"](-6.2,123.3,-5.15,124.7);
 nwr["natural"~"^(beach|cave_entrance)$"](-6.2,123.3,-5.15,124.7);
 nwr["sport"="scuba_diving"](-6.2,123.3,-5.15,124.7);
);out center tags;`;
async function loadOSM() {
  const mirrors=['https://overpass-api.de/api/interpreter','https://overpass.private.coffee/api/interpreter'];
  for(const url of mirrors) {
    try {
      log('Mengambil fasilitas OSM dari '+new URL(url).host);
      const res=await fetch(url,{method:'POST',body:'data='+encodeURIComponent(OVERPASS_QUERY)});
      if(!res.ok) throw new Error('HTTP '+res.status);
      const data=await res.json();
      let count=0;
      data.elements.forEach(e=>{
        const t=e.tags||{};
        let category=null;
        if(/^(school|college|university|kindergarten)$/.test(t.amenity||'')) category='Pendidikan';
        else if(/^(hospital|clinic|doctors)$/.test(t.amenity||'')||t.healthcare) category='Kesehatan';
        else if(/^(townhall|police|courthouse)$/.test(t.amenity||'')||t.office==='government') category='Pemerintahan';
        else if(t.tourism||t.historic||t.natural||t.sport) category='Pariwisata';
        else if(t.place) category='Permukiman';
        if(!category) return;
        const lat=e.lat??e.center?.lat, lon=e.lon??e.center?.lon;
        if(lat==null||lon==null) return;
        addPoint({name:t.name||t['name:id']||`${category} (tanpa nama)`,category,lat:Number(lat),lon:Number(lon),source:'OpenStreetMap',properties:t});
        count++;
      });
      log(`${count} titik OSM diproses.`);
      return count;
    } catch(err) { log(`OSM ${new URL(url).host} gagal: ${err.message}`); }
  }
  log('Data OSM tidak berhasil dimuat. Layer SHP tetap digunakan jika tersedia.');
  return 0;
}

(async function init(){
  $('statusData').textContent='Memuat SHP dari folder KAB. WAKATOBI...';
  let shpOK=false;
  try { await loadSHPFolder(); shpOK=true; }
  catch(err) { log('Kesalahan SHP: '+err.message); }
  await loadOSM();
  updateRecap(); applyPointFilters();
  $('statusData').textContent=shpOK
    ? `${points.length} titik fasilitas dimuat. SHP lokal dan OSM selesai diproses.`
    : 'SHP belum termuat. Periksa nama layer dan folder KAB. WAKATOBI.';
  if(!shpOK) $('statusData').classList.add('error');
  map.fitBounds(ALL_BOUNDS);
})();
