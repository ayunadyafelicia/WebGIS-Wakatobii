
/* AUTO ZOOM KECAMATAN */
function zoomToKecamatan(namaKecamatan) {
  let targetBounds = null;

  map.eachLayer(function (layer) {
    if (!layer.feature || !layer.feature.properties) return;

    const props = layer.feature.properties;

    const nama =
      props.NAM_KEC ||
      props.NAMA_KEC ||
      props.KECAMATAN ||
      props.namakec ||
      props.name ||
      props.NAME_2 ||
      "";

    if (
      nama.toString().toLowerCase().trim() ===
      namaKecamatan.toLowerCase().trim()
    ) {
      if (layer.getBounds) {
        targetBounds = layer.getBounds();
      }
    }
  });

  if (targetBounds && targetBounds.isValid()) {
    map.flyToBounds(targetBounds, {
      padding: [30, 30],
      maxZoom: 15,
      duration: 1.2
    });
  } else {
    console.warn("Batas kecamatan tidak ditemukan:", namaKecamatan);
  }
}
