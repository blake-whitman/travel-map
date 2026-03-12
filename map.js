<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Blake's Travel Map</title>
<link rel="stylesheet" href="https://unpkg.com/leaflet/dist/leaflet.css"/>
<style>
  body, html { margin:0; padding:0; height:100%; font-family:sans-serif; }
  #map { height: 100%; width: 100%; }
  .filter-panel {
    position: absolute; top: 10px; left: 10px; z-index: 1000;
    background: rgba(255,255,255,0.9); padding: 10px; border-radius: 8px;
  }
  .filter-panel label { display: block; margin-bottom: 5px; }
  .leaflet-popup-content img { display: block; margin: 5px 0; max-width: 150px; }
</style>
</head>
<body>

<div class="filter-panel">
  <label><input type="checkbox" value="national" checked> National Parks</label>
  <label><input type="checkbox" value="sports" checked> Sports</label>
  <label><input type="checkbox" value="stadium" checked> Stadiums</label>
  <label><input type="checkbox" value="city" checked> City Venues</label>
</div>

<div id="map"></div>

<script src="https://unpkg.com/leaflet/dist/leaflet.js"></script>

<script>
// --- Load your GeoJSON data ---
const geojsonData = {/* PASTE YOUR GEOJSON HERE */};

// --- Map initialization ---
const map = L.map('map').setView([40.7, -74], 4);

// OpenStreetMap base layer
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  attribution: '&copy; OpenStreetMap contributors'
}).addTo(map);

// --- Dynamic category mapping ---
function getCategoryFromFeature(feature) {
  const icon = feature.properties.icon || "";
  if (icon.includes("icon-1")) return "national";
  if (icon.includes("icon-2")) return "sports";
  if (icon.includes("icon-3")) return "city";
  if (icon.includes("icon-4")) return "stadium";
  return "other";
}

// --- Dynamic image for popup ---
function getFeatureImage(feature) {
  if (feature.properties.gx_media_links) {
    return feature.properties.gx_media_links.split(" ")[0];
  }
  return feature.properties.icon || "";
}

// --- Create markers ---
let markers = [];
geojsonData.features.forEach(feature => {
  const category = getCategoryFromFeature(feature);
  const iconUrl = feature.properties.icon || "";

  const leafletIcon = L.icon({
    iconUrl: iconUrl,
    iconSize: [30, 30],
    iconAnchor: [15, 30],
    popupAnchor: [0, -28]
  });

  const marker = L.marker(
    [feature.geometry.coordinates[1], feature.geometry.coordinates[0]],
    { icon: leafletIcon }
  );

  const img = getFeatureImage(feature);
  const description = feature.properties.description?.value || feature.properties.description || "";
  marker.bindPopup(`<b>${feature.properties.name}</b><br><img src="${img}" width="120"><br>${description}`);
  marker.featureCategory = category; // attach category for filtering
  marker.addTo(map);

  markers.push(marker);
});

// --- Filter logic ---
const checkboxes = document.querySelectorAll('.filter-panel input[type=checkbox]');
checkboxes.forEach(cb => cb.addEventListener('change', updateFilters));

function updateFilters() {
  const checked = Array.from(checkboxes).filter(cb => cb.checked).map(cb => cb.value);
  markers.forEach(marker => {
    if (checked.includes(marker.featureCategory)) {
      marker.addTo(map);
    } else {
      map.removeLayer(marker);
    }
  });
}
</script>

</body>
</html>
