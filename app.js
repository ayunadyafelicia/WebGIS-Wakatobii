
// =====================================================
// WEBGIS KABUPATEN WAKATOBI
// Leaflet + GitHub Auto GeoJSON Loader
// =====================================================


// =====================================================
// 1. PETA
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
// 3. KONFIGURASI GITHUB
// =====================================================

const GITHUB_USER = "ayunadyafelicia";
const GITHUB_REPO = "WebGIS-Wakatobi";
const GITHUB_BRANCH = "main";

const GITHUB_API =
  `https://api.github.com/repos/${GITHUB_USER}/${GITHUB_REPO}/git/trees/${GITHUB_BRANCH}?recursive=1`;

const GITHUB_RAW =
  `https://raw.githubusercontent.com/${GITHUB_USER}/${GITHUB_REPO}/${GITHUB_BRANCH}/`;


// =====================================================
// 4. VARIABEL LAYER
// =====================================================

const semuaLayer = {};
const semuaFile = [];

const warnaLayer = [
  "#e53935",
  "#fb8c00",
  "#fdd835",
  "#8e24aa",
  "#00897b",
  "#3949ab",
  "#d81b60",
  "#6d4c41",
  "#039be5",
  "#7cb342",
  "#5e35b1",
  "#f4511e",
  "#546e7a",
  "#c0ca33",
  "#ec407a"
];

let indeksWarna = 0;


// =====================================================
// 5. FUNGSI ESCAPE HTML
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


// =====================================================
// 6. INFORMASI OBJEK
// =====================================================

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

  layer.on("click", function() {

    const hasil = document.getElementById("hasil");

    if (hasil) {
      hasil.innerHTML = isi;
    }

  });

}


// =====================================================
// 7. STYLE DATA SPASIAL
// =====================================================

function buatStyle(warna) {

  return {
    color: warna,
    weight: 2,
    opacity: 0.9,
    fillColor: warna,
    fillOpacity: 0.22
  };

}


function buatMarker(latlng, warna) {

  return L.circleMarker(latlng, {

    radius: 6,
    color: "#ffffff",
    weight: 1.5,
    fillColor: warna,
    fillOpacity: 0.95

  });

}


// =====================================================
// 8. MEMBUAT NAMA LAYER DARI NAMA FILE
// =====================================================

function namaLayerDariFile(path) {

  let nama = path.split("/").pop();

  nama = nama.replace(
    /\.(geojsons|geojson|json)$/i,
    ""
  );

  nama = nama.replace(/[_-]/g, " ");

  return nama.replace(/\b\w/g, huruf =>
    huruf.toUpperCase()
  );

}


// =====================================================
// 9. MENGHUBUNGKAN CHECKBOX HTML LAMA
// =====================================================

const hubunganCheckbox = {

  kabupaten: [
    "administrasi_kabkota"
  ],

  kecamatan: [
    "administrasikecamatan"
  ],

  desa: [
    "bataskelurahandesa"
  ],

  jalan: [
    "jalan"
  ],

  permukiman: [
    "permukiman"
  ],

  bangunan: [
    "bangunan"
  ],

  pemerintahan: [
    "pemerintahan"
  ],

  pantai: [
    "garispantai"
  ]

};


function namaDasar(path) {

  return path.split("/").pop()
    .replace(/\.(geojsons|geojson|json)$/i, "")
    .toLowerCase();

}


function aturCheckboxLama(namaFile, layer) {

  Object.entries(hubunganCheckbox).forEach(
    ([namaCheckbox, daftarNama]) => {

      if (!daftarNama.includes(namaFile)) return;

      const checkbox = document.querySelector(
        `input[data-layer="${namaCheckbox}"]`
      );

      if (!checkbox) return;

      checkbox.checked = true;

      checkbox.onchange = function() {

        if (this.checked) {
          layer.addTo(map);
        } else {
          map.removeLayer(layer);
        }

      };

    }
  );

}


// =====================================================
// 10. FILTER DATA GEOJSON TAMBAHAN
// HTML TIDAK PERLU DIUBAH
// =====================================================

function buatFilterTambahan() {

  let bagian = document.getElementById(
    "filter-geojson-otomatis"
  );

  if (bagian) return bagian;

  bagian = document.createElement("div");

  bagian.id = "filter-geojson-otomatis";
  bagian.className = "filter-section";

  bagian.innerHTML = `
    <hr>
    <b class="filter-subtitle">
      Data Spasial Lainnya
    </b>
    <div id="daftar-geojson"></div>
  `;

  const panel = document.getElementById("panel");

  const detail = panel.querySelector("h4");

  if (detail) {
    panel.insertBefore(bagian, detail);
  } else {
    panel.appendChild(bagian);
  }

  return bagian;

}


function buatCheckboxOtomatis(nama, path, layer, warna) {

  const bagian = buatFilterTambahan();

  const daftar = bagian.querySelector(
    "#daftar-geojson"
  );

  const label = document.createElement("label");

  label.className = "filter-check";

  label.innerHTML = `
    <input type="checkbox" checked>
    <span style="
      width:12px;
      height:12px;
      background:${warna};
      display:inline-block;
      border-radius:3px;
      flex-shrink:0;
    "></span>
    <span>${escapeHTML(nama)}</span>
  `;

  const checkbox = label.querySelector("input");

  checkbox.addEventListener("change", function() {

    if (this.checked) {
      layer.addTo(map);
    } else {
      map.removeLayer(layer);
    }

  });

  daftar.appendChild(label);

}


// =====================================================
// 11. LEGENDA DATA GEOJSON
// =====================================================

function tambahLegendaGeoJSON(nama, warna) {

  const container = document.getElementById(
    "isi-legenda-otomatis"
  );

  if (!container) {

    const legendaPeta = document.querySelector(
      ".legenda-peta"
    );

    if (!legendaPeta) return;

    const pemisah = document.createElement("hr");

    const judul = document.createElement("b");

    judul.textContent = "DATA GEOJSON";

    const isi = document.createElement("div");

    isi.id = "isi-legenda-otomatis";

    legendaPeta.appendChild(pemisah);
    legendaPeta.appendChild(judul);
    legendaPeta.appendChild(isi);

    tambahItemLegenda(isi, nama, warna);

    return;

  }

  tambahItemLegenda(container, nama, warna);

}


function tambahItemLegenda(container, nama, warna) {

  const item = document.createElement("div");

  item.className = "legend-item";

  item.innerHTML = `
    <span style="
      width:18px;
      height:13px;
      display:inline-block;
      background:${warna};
      border:1px solid #555;
      border-radius:3px;
      flex-shrink:0;
    "></span>
    <span>${escapeHTML(nama)}</span>
  `;

  container.appendChild(item);

}


// =====================================================
// 12. MEMBACA SATU FILE GEOJSON
// =====================================================

async function muatSatuGeoJSON(file) {

  const nama = namaLayerDariFile(file.path);

  const namaFile = namaDasar(file.path);

  const warna =
    warnaLayer[indeksWarna % warnaLayer.length];

  indeksWarna++;

  try {

    const url = GITHUB_RAW +
      file.path.split("/")
        .map(encodeURIComponent)
        .join("/");

    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const data = await response.json();

    if (
      !data ||
      ![
        "FeatureCollection",
        "Feature",
        "GeometryCollection"
      ].includes(data.type)
    ) {
      throw new Error("Format GeoJSON tidak valid");
    }

    const layer = L.geoJSON(data, {

      style: function() {
        return buatStyle(warna);
      },

      pointToLayer: function(feature, latlng) {
        return buatMarker(latlng, warna);
      },

      onEachFeature: tampilkanInformasi

    });

    if (layer.getLayers().length === 0) {
      throw new Error("Tidak terdapat fitur spasial");
    }

    // Menyimpan layer

    semuaLayer[namaFile] = layer;

    semuaFile.push({
      nama: nama,
      file: file.path,
      warna: warna,
      jumlah: layer.getLayers().length
    });

    // Menampilkan layer di peta

    layer.addTo(map);

    // Mengaktifkan checkbox HTML yang sudah ada

    const termasukCheckboxLama =
      Object.values(hubunganCheckbox)
        .some(daftar => daftar.includes(namaFile));

    if (termasukCheckboxLama) {

      aturCheckboxLama(namaFile, layer);

    } else {

      buatCheckboxOtomatis(
        nama,
        file.path,
        layer,
        warna
      );

    }

    // Menambahkan legenda

    tambahLegendaGeoJSON(nama, warna);

    console.log(
      `BERHASIL: ${file.path} | ${layer.getLayers().length} fitur`
    );

    return layer;

  } catch (error) {

    console.error(
      `GAGAL: ${file.path}`,
      error
    );

    return null;

  }

}


// =====================================================
// 13. MEMBACA SELURUH REPOSITORY GITHUB
// =====================================================

async function bacaSemuaGeoJSON() {

  console.log("Memulai pembacaan seluruh data...");

  const container = buatFilterTambahan();

  const daftar = container.querySelector(
    "#daftar-geojson"
  );

  daftar.innerHTML = `
    <p style="font-size:12px;color:#687782">
      Membaca data dari GitHub...
    </p>
  `;

  try {

    const response = await fetch(GITHUB_API);

    if (!response.ok) {
      throw new Error(
        `GitHub API gagal: HTTP ${response.status}`
      );
    }

    const repository = await response.json();

    if (repository.truncated) {
      throw new Error(
        "Daftar file repository terpotong oleh GitHub API."
      );
    }

    // Mencari semua file GeoJSON di seluruh folder

    const daftarFile = repository.tree.filter(file =>

      file.type === "blob" &&
      /\.(geojson|geojsons)$/i.test(file.path)

    );

    console.log(
      "Jumlah file GeoJSON ditemukan:",
      daftarFile.length
    );

    if (daftarFile.length === 0) {

      daftar.innerHTML = `
        <p style="color:red;font-size:12px">
          Tidak ditemukan file GeoJSON.
        </p>
      `;

      return;

    }

    daftar.innerHTML = "";

    // Membaca seluruh file

    for (const file of daftarFile) {

      await muatSatuGeoJSON(file);

    }

    // Menghitung seluruh batas data

    const boundsGabungan = L.latLngBounds([]);

    let adaBounds = false;

    Object.values(semuaLayer).forEach(layer => {

      const bounds = layer.getBounds();

      if (bounds.isValid()) {

        boundsGabungan.extend(bounds);

        adaBounds = true;

      }

    });

    if (adaBounds) {

      map.fitBounds(boundsGabungan, {
        padding: [30, 30],
        maxZoom: 12
      });

    }

    // Informasi jumlah data

    const informasi = document.createElement("p");

    informasi.style.cssText = `
      font-size:11px;
      color:#687782;
      margin-top:12px;
      border-top:1px solid #ddd;
      padding-top:8px;
    `;

    informasi.textContent =
      `${semuaFile.length} file berhasil dimuat dari ${daftarFile.length} file GeoJSON.`;

    daftar.appendChild(informasi);

    console.log("====================================");
    console.log("PEMBACAAN DATA SELESAI");
    console.log("File ditemukan:", daftarFile.length);
    console.log("File berhasil:", semuaFile.length);
    console.log("File gagal:", daftarFile.length - semuaFile.length);
    console.log("====================================");

  } catch (error) {

    console.error("KESALAHAN REPOSITORY:", error);

    daftar.innerHTML = `
      <p style="color:red;font-size:12px">
        Gagal membaca repository: ${escapeHTML(error.message)}
      </p>
    `;

  }

}


// =====================================================
// 14. DATA PARIWISATA
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

  const namaIkon =
    ikon[jenis] || "fa-location-dot";

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


// =====================================================
// 15. MENAMPILKAN PARIWISATA
// =====================================================

const layerPariwisata = L.layerGroup().addTo(map);

const markerWisata = [];

dataWisata.forEach(item => {

  const marker = L.marker(
    [item.lat, item.lon],
    {
      icon: buatIkon(item.ikon, item.warna)
    }
  );

  const isi = `
    <h3>${escapeHTML(item.nama)}</h3>
    <p><b>Jenis:</b> ${escapeHTML(item.jenis)}</p>
    <p><b>Koordinat:</b> ${item.lat}, ${item.lon}</p>
  `;

  marker.bindPopup(isi);

  marker.on("click", function() {

    const hasil = document.getElementById("hasil");

    if (hasil) {
      hasil.innerHTML = isi;
    }

  });

  const kategori =
    item.jenis.toLowerCase().replaceAll(" ", "-");

  marker.options.kategoriFilter = kategori;

  markerWisata.push({
    marker,
    kategori
  });

  layerPariwisata.addLayer(marker);

});


// =====================================================
// 16. FILTER KATEGORI PARIWISATA
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

  markerWisata.forEach(({marker, kategori}) => {

    const tampil =
      filterAktif.has(kategori);

    if (tampil && !layerPariwisata.hasLayer(marker)) {

      layerPariwisata.addLayer(marker);

    }

    if (!tampil && layerPariwisata.hasLayer(marker)) {

      layerPariwisata.removeLayer(marker);

    }

  });

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
// 17. FILTER TAMPILAN PARIWISATA
// =====================================================

const checkboxWisata = document.querySelector(
  'input[data-layer="pariwisata"]'
);

if (checkboxWisata) {

  checkboxWisata.addEventListener("change", function() {

    if (this.checked) {
      layerPariwisata.addTo(map);
    } else {
      map.removeLayer(layerPariwisata);
    }

  });

}


// =====================================================
// 18. MEMULAI WEBGIS
// =====================================================

async function mulaiPeta() {

  // Mempertahankan tampilan wisata

  layerPariwisata.addTo(map);

  // Memuat seluruh GeoJSON dari GitHub

  await bacaSemuaGeoJSON();

  // Memperbarui ukuran peta

  map.invalidateSize();

  console.log("WebGIS Kabupaten Wakatobi siap.");

}

mulaiPeta();
