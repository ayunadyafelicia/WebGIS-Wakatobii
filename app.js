
// =====================================================
// WEBGIS KABUPATEN WAKATOBI
// =====================================================


// =====================================================
// 1. INISIALISASI PETA
// =====================================================

const map = L.map("map", {
  preferCanvas: true
}).setView([-5.3, 123.6], 9);


// =====================================================
// 2. BASEMAP
// =====================================================

const satelit = L.tileLayer(
  "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
  {
    attribution: "Tiles &copy; Esri"
  }
);

const osm = L.tileLayer(
  "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
  {
    attribution: "&copy; OpenStreetMap"
  }
);

satelit.addTo(map);


// Kontrol kanan hanya untuk basemap
L.control.layers(
  {
    "Citra Satelit": satelit,
    "OpenStreetMap": osm
  },
  null,
  {
    collapsed: false,
    position: "topright"
  }
).addTo(map);


// =====================================================
// 3. STYLE POLIGON DAN GARIS
// =====================================================

const styleKabupaten = {
  color: "#ff3b30",
  weight: 4,
  fillColor: "#ff3b30",
  fillOpacity: 0.08
};

const styleKecamatan = {
  color: "#ff9800",
  weight: 2.5,
  dashArray: "8,5",
  fillOpacity: 0.03
};

const styleDesa = {
  color: "#ffeb3b",
  weight: 1.5,
  dashArray: "4,4",
  fillOpacity: 0.02
};

const styleJalan = {
  color: "#f5f5f5",
  weight: 2,
  opacity: 0.9
};

const stylePermukiman = {
  color: "#9c27b0",
  weight: 1.5,
  fillColor: "#ba68c8",
  fillOpacity: 0.4
};

const stylePantai = {
  color: "#00e5ff",
  weight: 3,
  opacity: 1
};


// =====================================================
// 4. IKON TITIK
// =====================================================

function buatIkon(jenis, warna) {

  const ikon = {
    pemerintahan: "fa-landmark",
    bangunan: "fa-building",
    permukiman: "fa-house",
    pantai: "fa-umbrella-beach",
    bahari: "fa-water",
    alam: "fa-mountain-sun",
    budaya: "fa-house-flag",
    sejarah: "fa-monument"
  };

  const namaIkon = ikon[jenis] || "fa-location-dot";

  return L.divIcon({
    className: "ikon-peta",

    html: `
      <div class="marker-custom" style="--warna:${warna}">
        <i class="fa-solid ${namaIkon}"></i>
      </div>
    `,

    iconSize: [36, 42],
    iconAnchor: [18, 38],
    popupAnchor: [0, -38]
  });
}


// =====================================================
// 5. INFORMASI OBJEK
// =====================================================

function escapeHTML(teks) {

  return String(teks).replace(/[&<>"']/g, karakter => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;"
  })[karakter]);

}


function buatIsiInformasi(properti = {}) {

  let isi = "<h3>Informasi Objek</h3>";
  let adaData = false;

  Object.entries(properti).forEach(([key, value]) => {

    if (
      value === null ||
      value === undefined ||
      value === "" ||
      key.toUpperCase() === "LCODE"
    ) return;

    const label =
      key.toUpperCase() === "REMARK"
        ? "Jenis"
        : key;

    isi += `
      <p>
        <b>${escapeHTML(label)}:</b>
        ${escapeHTML(value)}
      </p>
    `;

    adaData = true;

  });

  return adaData
    ? isi
    : "<p>Informasi objek tidak tersedia.</p>";

}


function tampilkanInformasi(feature, layer) {

  const isi = buatIsiInformasi(
    feature.properties || {}
  );

  layer.bindPopup(isi);

  layer.on("click", function () {

    const hasil = document.getElementById("hasil");

    if (hasil) {
      hasil.innerHTML = isi;
    }

  });

}


// =====================================================
// 6. MEMBUAT LAYER GEOJSON
// =====================================================

const layerKabupaten = L.geoJSON(null, {
  style: styleKabupaten,
  onEachFeature: tampilkanInformasi
});


const layerKecamatan = L.geoJSON(null, {
  style: styleKecamatan,
  onEachFeature: tampilkanInformasi
});


const layerDesa = L.geoJSON(null, {
  style: styleDesa,
  onEachFeature: tampilkanInformasi
});


const layerJalan = L.geoJSON(null, {
  style: styleJalan,
  onEachFeature: tampilkanInformasi
});


const layerBangunan = L.geoJSON(null, {

  pointToLayer: (feature, latlng) =>
    L.marker(latlng, {
      icon: buatIkon("bangunan", "#e91e63")
    }),

  style: {
    color: "#e91e63",
    fillColor: "#f06292",
    fillOpacity: 0.8,
    weight: 1
  },

  onEachFeature: tampilkanInformasi

});


const layerPermukiman = L.geoJSON(null, {
  style: stylePermukiman,
  onEachFeature: tampilkanInformasi
});


const layerPemerintahan = L.geoJSON(null, {

  pointToLayer: (feature, latlng) =>
    L.marker(latlng, {
      icon: buatIkon("pemerintahan", "#1976d2")
    }),

  style: {
    color: "#1976d2",
    fillColor: "#42a5f5",
    fillOpacity: 0.8,
    weight: 1
  },

  onEachFeature: tampilkanInformasi

});


const layerPantai = L.geoJSON(null, {
  style: stylePantai,
  onEachFeature: tampilkanInformasi
});


const layerPariwisata = L.layerGroup();


// =====================================================
// 7. DATA PARIWISATA
// =====================================================

const dataWisata = [

  {
    nama: "Sombu Dive",
    lat: -5.295736,
    lon: 123.544769,
    jenis: "Wisata Bahari",
    ikon: "bahari",
    warna: "#00bcd4"
  },

  {
    nama: "Goa Air Kontamale",
    lat: -5.3100,
    lon: 123.5700,
    jenis: "Wisata Alam",
    ikon: "alam",
    warna: "#43a047"
  },

  {
    nama: "Puncak Toliamba",
    lat: -5.295736,
    lon: 123.544769,
    jenis: "Wisata Alam",
    ikon: "alam",
    warna: "#ff9800"
  },

  {
    nama: "Pantai Cemara",
    lat: -5.255556,
    lon: 123.527083,
    jenis: "Wisata Pantai",
    ikon: "pantai",
    warna: "#0288d1"
  },

  {
    nama: "Pantai Waha",
    lat: -5.263210,
    lon: 123.548120,
    jenis: "Wisata Pantai",
    ikon: "pantai",
    warna: "#00acc1"
  },

  {
    nama: "Pantai Moli Sahatu",
    lat: -5.2500,
    lon: 123.5700,
    jenis: "Wisata Pantai",
    ikon: "pantai",
    warna: "#0097a7"
  },

  {
    nama: "Desa Wisata Liya Togo",
    lat: -5.373700,
    lon: 123.623200,
    jenis: "Wisata Budaya",
    ikon: "budaya",
    warna: "#8e24aa"
  },

  {
    nama: "Kampung Bajo Mola",
    lat: -5.344500,
    lon: 123.539200,
    jenis: "Wisata Budaya",
    ikon: "budaya",
    warna: "#d81b60"
  },

  {
    nama: "Pantai Sousu",
    lat: -5.286400,
    lon: 123.638400,
    jenis: "Wisata Pantai",
    ikon: "pantai",
    warna: "#039be5"
  },

  {
    nama: "Benteng Tindoi",
    lat: -5.2800,
    lon: 123.5900,
    jenis: "Wisata Sejarah",
    ikon: "sejarah",
    warna: "#795548"
  }

];


const markerWisata = [];

dataWisata.forEach(item => {

  const marker = L.marker(
    [item.lat, item.lon],
    {
      icon: buatIkon(item.ikon, item.warna)
    }
  );

  marker.options.nama = item.nama;

  marker.options.kategoriFilter =
    item.jenis.toLowerCase().replaceAll(" ", "-");

  const isi = `
    <h3>${escapeHTML(item.nama)}</h3>
    <p><b>Jenis:</b> ${escapeHTML(item.jenis)}</p>
  `;

  marker.bindPopup(isi);

  marker.on("click", function () {

    const hasil = document.getElementById("hasil");

    if (hasil) {

      hasil.innerHTML = `
        ${isi}
        <p>
          <b>Koordinat:</b>
          ${item.lat}, ${item.lon}
        </p>
      `;

    }

  });

  markerWisata.push({
    marker,
    kategori: marker.options.kategoriFilter
  });

  layerPariwisata.addLayer(marker);

});


// =====================================================
// 8. LEGENDA PETA
// =====================================================

const legenda = L.control({
  position: "topleft"
});


legenda.onAdd = function () {

  const div = L.DomUtil.create(
    "div",
    "legenda-peta"
  );

  div.innerHTML = `

    <h4>LEGENDA PETA</h4>

    <div class="legend-item">
      <span class="legend-line kabupaten"></span>
      Batas Kabupaten
    </div>

    <div class="legend-item">
      <span class="legend-line kecamatan"></span>
      Batas Kecamatan
    </div>

    <div class="legend-item">
      <span class="legend-line desa"></span>
      Batas Desa/Kelurahan
    </div>

    <div class="legend-item">
      <span class="legend-line jalan"></span>
      Jaringan Jalan
    </div>

    <div class="legend-item">
      <span class="legend-line pantai"></span>
      Garis Pantai
    </div>

    <div class="legend-item">
      <span class="legend-area permukiman"></span>
      Permukiman
    </div>

    <hr>

    <b>OBJEK TITIK</b>

    <div class="legend-item">
      <span class="legend-icon" style="--warna:#e91e63">
        <i class="fa-solid fa-building"></i>
      </span>
      Bangunan
    </div>

    <div class="legend-item">
      <span class="legend-icon" style="--warna:#1976d2">
        <i class="fa-solid fa-landmark"></i>
      </span>
      Pemerintahan
    </div>

    <hr>

    <b>PARIWISATA</b>

    <div class="legend-item">
      <span class="legend-icon" style="--warna:#00bcd4">
        <i class="fa-solid fa-water"></i>
      </span>
      Wisata Bahari
    </div>

    <div class="legend-item">
      <span class="legend-icon" style="--warna:#0288d1">
        <i class="fa-solid fa-umbrella-beach"></i>
      </span>
      Wisata Pantai
    </div>

    <div class="legend-item">
      <span class="legend-icon" style="--warna:#43a047">
        <i class="fa-solid fa-mountain-sun"></i>
      </span>
      Wisata Alam
    </div>

    <div class="legend-item">
      <span class="legend-icon" style="--warna:#8e24aa">
        <i class="fa-solid fa-house-flag"></i>
      </span>
      Wisata Budaya
    </div>

    <div class="legend-item">
      <span class="legend-icon" style="--warna:#795548">
        <i class="fa-solid fa-monument"></i>
      </span>
      Wisata Sejarah
    </div>

  `;

  L.DomEvent.disableClickPropagation(div);

  return div;

};

legenda.addTo(map);


// =====================================================
// 9. MEMUAT GEOJSON
// =====================================================

async function muatLayer(namaFile, layer) {

  try {

    const response = await fetch(
      `data/${namaFile}`
    );

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const data = await response.json();

    layer.addData(data);

    console.log(`${namaFile} berhasil dimuat`);

    return true;

  } catch (error) {

    console.error(
      `Gagal memuat ${namaFile}:`,
      error
    );

    return false;

  }

}


// =====================================================
// 10. PENGATURAN FILTER OBJEK
// =====================================================

const daftarLayer = {

  kabupaten: layerKabupaten,
  kecamatan: layerKecamatan,
  desa: layerDesa,
  jalan: layerJalan,
  permukiman: layerPermukiman,
  bangunan: layerBangunan,
  pemerintahan: layerPemerintahan,
  pantai: layerPantai,
  pariwisata: layerPariwisata

};


// Mengatur tampilan layer berdasarkan checkbox

document.querySelectorAll(
  "input[data-layer]"
).forEach(input => {

  input.addEventListener("change", function () {

    const namaLayer = this.dataset.layer;
    const layer = daftarLayer[namaLayer];

    if (!layer) return;

    if (this.checked) {
      layer.addTo(map);
    } else {
      map.removeLayer(layer);
    }

  });

});


// =====================================================
// 11. FILTER KATEGORI PARIWISATA
// =====================================================

const semuaKategori = [
  "wisata-bahari",
  "wisata-pantai",
  "wisata-alam",
  "wisata-budaya",
  "wisata-sejarah"
];

const filterAktif = new Set(semuaKategori);


function terapkanFilterWisata() {

  markerWisata.forEach(({ marker, kategori }) => {

    const tampil = filterAktif.has(kategori);

    if (tampil && !layerPariwisata.hasLayer(marker)) {
      layerPariwisata.addLayer(marker);
    }

    if (!tampil && layerPariwisata.hasLayer(marker)) {
      layerPariwisata.removeLayer(marker);
    }

  });


  // Memperbarui status tombol filter

  document.querySelectorAll(
    ".chip[data-category]"
  ).forEach(tombol => {

    const kategori = tombol.dataset.category;

    tombol.classList.toggle(
      "active",
      kategori === "semua"
        ? filterAktif.size === semuaKategori.length
        : filterAktif.has(kategori)
    );

  });

}


// Aksi tombol kategori wisata

document.querySelectorAll(
  ".chip[data-category]"
).forEach(tombol => {

  tombol.addEventListener("click", () => {

    const kategori = tombol.dataset.category;

    if (kategori === "semua") {

      filterAktif.clear();

      semuaKategori.forEach(item => {
        filterAktif.add(item);
      });

    } else if (filterAktif.has(kategori)) {

      filterAktif.delete(kategori);

    } else {

      filterAktif.add(kategori);

    }

    terapkanFilterWisata();

  });

});


// =====================================================
// 12. MENAMPILKAN PETA DAN MEMUAT DATA
// =====================================================

async function mulaiPeta() {

  // Layer yang ditampilkan secara default

  const layerDefault = [

    layerKabupaten,
    layerKecamatan,
    layerDesa,
    layerJalan,
    layerPantai,
    layerPariwisata

  ];

  layerDefault.forEach(layer => {
    layer.addTo(map);
  });


  // Daftar data GeoJSON

  const daftarData = [

    [
      "administrasi_kabkota.geojson",
      layerKabupaten
    ],

    [
      "administrasikecamatan.geojson",
      layerKecamatan
    ],

    [
      "bataskelurahandesa.geojsons",
      layerDesa
    ],

    [
      "jalan.geojson",
      layerJalan
    ],

    [
      "bangunan.geojson",
      layerBangunan
    ],

    [
      "permukiman.geojson",
      layerPermukiman
    ],

    [
      "pemerintahan.geojson",
      layerPemerintahan
    ],

    [
      "garispantai.geojson",
      layerPantai
    ]

  ];


  await Promise.all(

    daftarData.map(([file, layer]) => {
      return muatLayer(file, layer);
    })

  );


  // Zoom otomatis ke batas kabupaten

  if (layerKabupaten.getLayers().length > 0) {

    const bounds = layerKabupaten.getBounds();

    if (bounds.isValid()) {

      map.fitBounds(
        bounds,
        {
          padding: [20, 20]
        }
      );

    }

  }

}


// =====================================================
// 13. JALANKAN PETA
// =====================================================

mulaiPeta();
