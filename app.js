
// ======================================================
// WEBGIS KABUPATEN WAKATOBI
// Membaca seluruh GeoJSON langsung dari ROOT repository
// ======================================================


// 1. INISIALISASI PETA
const map = L.map("map", {
  preferCanvas: true
}).setView([-5.3250, 123.5880], 10);


// 2. BASEMAP
const basemapSatelit = L.tileLayer(
  "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
  {
    attribution: "Tiles © Esri",
    maxZoom: 19
  }
);

const basemapOSM = L.tileLayer(
  "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
  {
    attribution: "© OpenStreetMap contributors",
    maxZoom: 19
  }
);

basemapSatelit.addTo(map);

document.querySelectorAll('input[name="basemap"]').forEach(input => {
  input.addEventListener("change", function () {
    if (this.value === "satelit") {
      map.removeLayer(basemapOSM);
      basemapSatelit.addTo(map);
    } else {
      map.removeLayer(basemapSatelit);
      basemapOSM.addTo(map);
    }
  });
});


// 3. PANE UNTUK MENGATUR URUTAN LAYER
const daftarPane = [
  ["paneKabupaten", 410],
  ["paneKecamatan", 420],
  ["paneDesa", 425],
  ["panePantai", 430],
  ["paneJalan", 440],
  ["paneFasilitas", 450],
  ["paneWisata", 460]
];

daftarPane.forEach(([nama, zIndex]) => {
  if (!map.getPane(nama)) {
    map.createPane(nama);
  }

  map.getPane(nama).style.zIndex = zIndex;
});


// 4. REFERENSI ELEMEN HTML
const hasilDetail = document.getElementById("hasil");


// 5. WARNA LAYER
const warnaLayer = {
  kabupaten: "#f4e342",
  kecamatan: "#ff8c42",
  desa: "#eeeeee",
  jalan: "#ff3b30",
  pantai: "#00e5ff",
  permukiman: "#e67e22",
  bangunan: "#e84393",
  pemerintahan: "#8e44ad"
};


// 6. KONFIGURASI FILE GEOJSON
// Semua file berada sejajar dengan index.html dan app.js.

const konfigurasiData = {
  kabupaten: {
    nama: "Batas Kabupaten",
    file: "administrasi_kabkota.geojson",
    pane: "paneKabupaten",
    ikon: "fa-map-location-dot"
  },

  kecamatan: {
    nama: "Batas Kecamatan",
    file: "administrasikecamatan.geojson",
    pane: "paneKecamatan",
    ikon: "fa-map"
  },

  desa: {
    nama: "Batas Desa/Kelurahan",
    file: "bataskelurahandesa.geojson",
    pane: "paneDesa",
    ikon: "fa-house"
  },

  jalan: {
    nama: "Jaringan Jalan",
    file: "jalan.geojson",
    pane: "paneJalan",
    ikon: "fa-road"
  },

  pantai: {
    nama: "Garis Pantai",
    file: "garispantai.geojson",
    pane: "panePantai",
    ikon: "fa-water"
  },

  permukiman: {
    nama: "Permukiman",
    file: "permukiman.geojson",
    pane: "paneFasilitas",
    ikon: "fa-house-chimney"
  },

  bangunan: {
    nama: "Bangunan",
    file: "bangunan.geojson",
    pane: "paneFasilitas",
    ikon: "fa-building"
  },

  pemerintahan: {
    nama: "Pemerintahan",
    file: "pemerintahan.geojson",
    pane: "paneFasilitas",
    ikon: "fa-landmark"
  }
};


// 7. PENYIMPANAN LAYER
const layerData = {};


// 8. FUNGSI MEMBACA NILAI REMARK
function ambilRemark(properties = {}) {
  const keyRemark = Object.keys(properties).find(key => {
    return key.toLowerCase().trim() === "remark";
  });

  if (!keyRemark) return "";

  const nilai = properties[keyRemark];

  if (
    nilai === null ||
    nilai === undefined ||
    String(nilai).trim() === ""
  ) {
    return "";
  }

  return String(nilai);
}


// 9. FUNGSI MENGAMBIL NAMA PROPERTI
function ambilNama(properties = {}) {
  const kandidat = [
    "nama",
    "Nama",
    "NAMA",
    "name",
    "NAME",
    "namobj",
    "NAMOBJ",
    "WADMKC",
    "WADMKD",
    "WADMKK",
    "NAMOBJ_1",
    "kecamatan",
    "desa",
    "kabupaten",
    "jenis",
    "fungsi"
  ];

  for (const key of kandidat) {
    if (
      properties[key] !== undefined &&
      properties[key] !== null &&
      String(properties[key]).trim() !== ""
    ) {
      return String(properties[key]);
    }
  }

  const remark = ambilRemark(properties);

  if (remark) return remark;

  return "Objek tanpa nama";
}


// 10. FUNGSI MENGAMANKAN TEKS HTML
function escapeHTML(nilai) {
  return String(nilai)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}


// 11. FUNGSI MENAMPILKAN DETAIL OBJEK
function tampilkanDetail(properties, layer, jenis) {
  if (!hasilDetail) return;

  // Nama layer bangunan selalu ditulis "Bangunan".
  const nama = jenis === "Bangunan"
    ? "Bangunan"
    : ambilNama(properties);

  const remark = ambilRemark(properties);

  let html = `
    <div class="detail-title">${escapeHTML(nama)}</div>

    <div class="detail-row">
      <strong>Jenis layer:</strong>
      ${escapeHTML(jenis)}
    </div>
  `;

  // Tampilkan remark sebagai keterangan utama bangunan.
  if (jenis === "Bangunan") {
    html += `
      <div class="detail-row">
        <strong>Keterangan:</strong>
        ${remark ? escapeHTML(remark) : "Tidak tersedia"}
      </div>
    `;
  }

  // Tampilkan seluruh atribut GeoJSON.
  for (const [key, value] of Object.entries(properties)) {
    if (
      value === null ||
      value === undefined ||
      String(value).trim() === ""
    ) {
      continue;
    }

    // Remark bangunan sudah ditampilkan sebagai keterangan utama.
    if (
      jenis === "Bangunan" &&
      key.toLowerCase().trim() === "remark"
    ) {
      continue;
    }

    html += `
      <div class="detail-row">
        <strong>${escapeHTML(key)}:</strong>
        ${escapeHTML(value)}
      </div>
    `;
  }

  // Koordinat objek.
  if (layer.getBounds && layer.getBounds().isValid()) {
    const center = layer.getBounds().getCenter();

    html += `
      <div class="detail-row">
        <strong>Latitude:</strong> ${center.lat.toFixed(6)}
      </div>

      <div class="detail-row">
        <strong>Longitude:</strong> ${center.lng.toFixed(6)}
      </div>
    `;
  } else if (layer.getLatLng) {
    const koordinat = layer.getLatLng();

    html += `
      <div class="detail-row">
        <strong>Latitude:</strong> ${koordinat.lat.toFixed(6)}
      </div>

      <div class="detail-row">
        <strong>Longitude:</strong> ${koordinat.lng.toFixed(6)}
      </div>
    `;
  }

  hasilDetail.innerHTML = html;
}


// 12. FUNGSI STYLE GEOJSON
function styleGeoJSON(jenis) {
  const warna = warnaLayer[jenis];

  const pengaturan = {
    color: warna,
    weight: 1.5,
    opacity: 0.95,
    fillColor: warna,
    fillOpacity: 0.12
  };

  if (jenis === "kabupaten") {
    pengaturan.weight = 3;
    pengaturan.fillOpacity = 0.03;
  }

  if (jenis === "kecamatan") {
    pengaturan.weight = 2;
    pengaturan.fillOpacity = 0.04;
    pengaturan.dashArray = "6, 4";
  }

  if (jenis === "desa") {
    pengaturan.weight = 1;
    pengaturan.fillOpacity = 0.02;
    pengaturan.dashArray = "3, 3";
  }

  if (jenis === "jalan") {
    pengaturan.weight = 2;
    pengaturan.opacity = 0.9;
  }

  if (jenis === "pantai") {
    pengaturan.weight = 2.5;
    pengaturan.dashArray = "5, 4";
    pengaturan.fillOpacity = 0;
  }

  if (jenis === "permukiman") {
    pengaturan.weight = 1;
    pengaturan.fillOpacity = 0.45;
  }

  if (jenis === "bangunan") {
    pengaturan.weight = 1;
    pengaturan.fillOpacity = 0.55;
  }

  if (jenis === "pemerintahan") {
    pengaturan.weight = 2;
    pengaturan.fillOpacity = 0.4;
  }

  return pengaturan;
}


// 13. MEMBUAT IKON TITIK GEOJSON
function buatIkonGeoJSON(jenis) {
  const konfigurasi = konfigurasiData[jenis];

  const warna = warnaLayer[jenis];
  const ikon = konfigurasi.ikon;

  return L.divIcon({
    className: "geojson-custom-icon",

    html: `
      <div style="
        width: 30px;
        height: 30px;
        display: flex;
        align-items: center;
        justify-content: center;
        background: ${warna};
        color: #ffffff;
        border: 2px solid #ffffff;
        border-radius: 50%;
        box-shadow: 0 2px 6px rgba(0,0,0,0.45);
        font-size: 14px;
      ">
        <i class="fa-solid ${ikon}"></i>
      </div>
    `,

    iconSize: [30, 30],
    iconAnchor: [15, 15],
    popupAnchor: [0, -15]
  });
}


// 14. FUNGSI MEMBUAT GEOJSON LAYER
function buatGeoJSON(data, jenis) {
  return L.geoJSON(data, {
    pane: konfigurasiData[jenis].pane,

    style: function () {
      return styleGeoJSON(jenis);
    },

    // Simbol untuk seluruh objek bertipe titik.
    pointToLayer: function (feature, latlng) {
      return L.marker(latlng, {
        icon: buatIkonGeoJSON(jenis),
        pane: konfigurasiData[jenis].pane
      });
    },

    onEachFeature: function (feature, layer) {
      const properties = feature.properties || {};

      const nama = jenis === "bangunan"
        ? "Bangunan"
        : ambilNama(properties);

      const remark = ambilRemark(properties);

      let isiPopup = `
        <strong>${escapeHTML(nama)}</strong>
        <br>
        ${escapeHTML(konfigurasiData[jenis].nama)}
      `;

      if (jenis === "bangunan") {
        isiPopup += `
          <br>
          <strong>Keterangan:</strong>
          ${remark ? escapeHTML(remark) : "Tidak tersedia"}
        `;
      }

      isiPopup += `
        <br><br>
        Klik objek untuk melihat detail.
      `;

      layer.bindPopup(isiPopup);

      layer.on("click", function () {
        tampilkanDetail(
          properties,
          layer,
          konfigurasiData[jenis].nama
        );
      });

      // Efek hover hanya diterapkan pada geometri yang mendukung setStyle.
      layer.on("mouseover", function () {
        if (layer.setStyle) {
          layer.setStyle({
            weight: 3,
            color: "#ffffff",
            fillOpacity: 0.3
          });
        }
      });

      layer.on("mouseout", function () {
        if (layer.setStyle) {
          layer.setStyle(styleGeoJSON(jenis));
        }
      });
    }
  });
}


// 15. FUNGSI MEMBACA FILE GEOJSON
async function bacaGeoJSON(namaFile) {
  const response = await fetch(
    "./" + namaFile,
    {
      cache: "no-cache"
    }
  );

  if (!response.ok) {
    throw new Error(
      `${namaFile}: HTTP ${response.status}`
    );
  }

  const teks = await response.text();

  let data;

  try {
    data = JSON.parse(teks);
  } catch (error) {
    throw new Error(
      `${namaFile}: isi file bukan JSON yang valid.`
    );
  }

  const tipeGeoJSON = [
    "FeatureCollection",
    "Feature",
    "GeometryCollection"
  ];

  if (!data || !tipeGeoJSON.includes(data.type)) {
    throw new Error(
      `${namaFile}: struktur GeoJSON tidak valid.`
    );
  }

  return data;
}


// 16. MEMERIKSA BOUNDS LAYER
function boundsValid(layer) {
  if (!layer || typeof layer.getBounds !== "function") {
    return false;
  }

  const bounds = layer.getBounds();

  return bounds && bounds.isValid();
}


// 17. MEMUAT SETIAP LAYER
async function muatLayer(jenis) {
  const konfigurasi = konfigurasiData[jenis];

  try {
    const data = await bacaGeoJSON(konfigurasi.file);

    const layer = buatGeoJSON(data, jenis);

    layerData[jenis] = layer;

    const checkbox = document.querySelector(
      `input[data-layer="${jenis}"]`
    );

    if (checkbox && checkbox.checked) {
      layer.addTo(map);
    }

    console.log(
      `${konfigurasi.nama} berhasil dibaca:`,
      konfigurasi.file,
      `${layer.getLayers().length} objek`
    );

    return true;

  } catch (error) {
    console.error(
      `Gagal memuat ${konfigurasi.nama}:`,
      error.message
    );

    return false;
  }
}


// 18. MEMUAT SEMUA DATA GEOJSON
async function muatSemuaData() {
  const jenisLayer = Object.keys(konfigurasiData);

  const hasil = await Promise.all(
    jenisLayer.map(jenis => muatLayer(jenis))
  );

  const berhasil = hasil.filter(Boolean).length;

  console.log(
    `Pemuatan layer selesai: ${berhasil} dari ${hasil.length} layer.`
  );

  // Prioritaskan batas kabupaten sebagai tampilan awal.
  if (
    layerData.kabupaten &&
    boundsValid(layerData.kabupaten)
  ) {
    map.fitBounds(
      layerData.kabupaten.getBounds(),
      {
        padding: [20, 20],
        maxZoom: 11
      }
    );

    return;
  }

  // Jika batas kabupaten gagal, gunakan gabungan bounds layer lain.
  const boundsGabungan = L.latLngBounds([]);

  Object.values(layerData).forEach(layer => {
    if (boundsValid(layer)) {
      boundsGabungan.extend(layer.getBounds());
    }
  });

  if (boundsGabungan.isValid()) {
    map.fitBounds(
      boundsGabungan,
      {
        padding: [20, 20],
        maxZoom: 11
      }
    );
  }
}


// 19. FILTER CHECKBOX LAYER
document.querySelectorAll("input[data-layer]").forEach(checkbox => {
  checkbox.addEventListener("change", function () {
    const jenis = this.dataset.layer;

    if (jenis === "pariwisata") {
      if (this.checked) {
        tampilkanWisata();
      } else {
        map.removeLayer(layerPariwisata);
      }

      return;
    }

    const layer = layerData[jenis];

    if (!layer) {
      if (this.checked) {
        console.warn(`Layer ${jenis} belum tersedia.`);
      }

      return;
    }

    if (this.checked) {
      layer.addTo(map);
    } else {
      map.removeLayer(layer);
    }
  });
});


// 20. DATA PARIWISATA WAKATOBI
const dataWisata = [
  {
    nama: "Sombu Dive",
    kategori: "wisata-bahari",
    lat: -5.295736,
    lng: 123.544769,
    ikon: "fa-water",
    warna: "#00a8cc"
  },
  {
    nama: "Goa Air Kontamale",
    kategori: "wisata-alam",
    lat: -5.3100,
    lng: 123.5700,
    ikon: "fa-mountain",
    warna: "#27ae60"
  },
  {
    nama: "Puncak Toliamba",
    kategori: "wisata-alam",
    lat: -5.295736,
    lng: 123.544769,
    ikon: "fa-mountain-sun",
    warna: "#27ae60"
  },
  {
    nama: "Pantai Cemara",
    kategori: "wisata-pantai",
    lat: -5.255556,
    lng: 123.527083,
    ikon: "fa-umbrella-beach",
    warna: "#f39c12"
  },
  {
    nama: "Pantai Waha",
    kategori: "wisata-pantai",
    lat: -5.263210,
    lng: 123.548120,
    ikon: "fa-umbrella-beach",
    warna: "#f39c12"
  },
  {
    nama: "Pantai Moli Sahatu",
    kategori: "wisata-pantai",
    lat: -5.2500,
    lng: 123.5700,
    ikon: "fa-umbrella-beach",
    warna: "#f39c12"
  },
  {
    nama: "Desa Wisata Liya Togo",
    kategori: "wisata-budaya",
    lat: -5.373700,
    lng: 123.623200,
    ikon: "fa-house",
    warna: "#e84393"
  },
  {
    nama: "Kampung Bajo Mola",
    kategori: "wisata-budaya",
    lat: -5.344500,
    lng: 123.539200,
    ikon: "fa-house",
    warna: "#e84393"
  },
  {
    nama: "Pantai Sousu",
    kategori: "wisata-pantai",
    lat: -5.286400,
    lng: 123.638400,
    ikon: "fa-umbrella-beach",
    warna: "#f39c12"
  },
  {
    nama: "Benteng Tindoi",
    kategori: "wisata-sejarah",
    lat: -5.2800,
    lng: 123.5900,
    ikon: "fa-landmark",
    warna: "#8e44ad"
  }
];


// 21. LAYER PARIWISATA
const layerPariwisata = L.layerGroup();

let kategoriAktif = "semua";


function buatIkonWisata(item) {
  return L.divIcon({
    className: "",

    html: `
      <div class="custom-marker" style="background:${item.warna}">
        <i class="fa-solid ${item.ikon}"></i>
      </div>
    `,

    iconSize: [30, 36],
    iconAnchor: [15, 34],
    popupAnchor: [0, -32]
  });
}


function buatMarkerWisata(item) {
  const marker = L.marker(
    [item.lat, item.lng],
    {
      icon: buatIkonWisata(item),
      pane: "paneWisata"
    }
  );

  marker.bindPopup(`
    <strong>${escapeHTML(item.nama)}</strong>
    <br>
    Kategori:
    ${escapeHTML(item.kategori.replace("wisata-", "Wisata "))}
    <br>
    Latitude: ${item.lat}
    <br>
    Longitude: ${item.lng}
  `);

  marker.on("click", function () {
    if (!hasilDetail) return;

    hasilDetail.innerHTML = `
      <div class="detail-title">
        ${escapeHTML(item.nama)}
      </div>

      <div class="detail-row">
        <strong>Kategori:</strong>
        ${escapeHTML(item.kategori.replace("wisata-", "Wisata "))}
      </div>

      <div class="detail-row">
        <strong>Latitude:</strong> ${item.lat}
      </div>

      <div class="detail-row">
        <strong>Longitude:</strong> ${item.lng}
      </div>
    `;
  });

  return marker;
}


function tampilkanWisata() {
  layerPariwisata.clearLayers();

  const dataTerpilih = dataWisata.filter(item => {
    return (
      kategoriAktif === "semua" ||
      item.kategori === kategoriAktif
    );
  });

  dataTerpilih.forEach(item => {
    layerPariwisata.addLayer(
      buatMarkerWisata(item)
    );
  });

  const checkbox = document.querySelector(
    'input[data-layer="pariwisata"]'
  );

  if (checkbox && checkbox.checked) {
    layerPariwisata.addTo(map);
  } else {
    map.removeLayer(layerPariwisata);
  }
}


// 22. FILTER KATEGORI WISATA
document.querySelectorAll(".chip").forEach(button => {
  button.addEventListener("click", function () {
    document.querySelectorAll(".chip").forEach(chip => {
      chip.classList.remove("active");
    });

    this.classList.add("active");

    kategoriAktif = this.dataset.category;

    tampilkanWisata();
  });
});


// 23. INISIALISASI WISATA DAN DATA
tampilkanWisata();
muatSemuaData();


// 24. SKALA PETA
L.control.scale({
  imperial: false,
  metric: true
}).addTo(map);


// 25. INFORMASI AWAL
console.log("WebGIS Kabupaten Wakatobi berhasil dijalankan.");
console.log("Sumber file GeoJSON: root repository GitHub Pages.");
