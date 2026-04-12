// =========================
// INITIALIZE MAP
// =========================
const map = L.map('map', {
  zoomSnap: 0.5,
  zoomDelta: 0.75,
  wheelPxPerZoomLevel: 120
}).setView([39.8283, -98.5795], 4);

L.tileLayer(
  'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
  { attribution: '&copy; OpenStreetMap & Carto' }
).addTo(map);

// =========================
// CLUSTERS
// =========================
const markers = L.markerClusterGroup({
  maxClusterRadius: 35,
  disableClusteringAtZoom: 9,
  iconCreateFunction: function(cluster) {
    const count = cluster.getChildCount();

    let sizeClass = "small";
    let sizePx = 38;

    if (count > 25) { sizeClass = "medium"; sizePx = 48; }
    if (count > 75) { sizeClass = "large"; sizePx = 58; }

    return L.divIcon({
      html: `<div class="cluster-marker ${sizeClass}"><span>${count}</span></div>`,
      className: "custom-cluster",
      iconSize: L.point(sizePx, sizePx)
    });
  }
});
map.addLayer(markers);

// =========================
// GLOBALS
// =========================
let locationsData = [];
let flightsData = [];
let cityBuckets = [];
let flightLayer = L.layerGroup().addTo(map);

const checkboxes = document.querySelectorAll(".filter");

// =========================
// AIRPORT COORDS
// =========================
const airports = {
  EWR: [-74.1745, 40.6895],
  JFK: [-73.7781, 40.6413],
  LGA: [-73.8740, 40.7769],
  LAS: [-115.1522, 36.0801],
  LAX: [-118.4085, 33.9416]
};

// =========================
// CURVED ARC FUNCTION
// =========================
function createArc(from, to) {
  const latlngs = [];

  const offsetX = to[0] - from[0];
  const offsetY = to[1] - from[1];

  const r = Math.sqrt(offsetX * offsetX + offsetY * offsetY);
  const theta = Math.atan2(offsetY, offsetX);

  const thetaOffset = Math.PI / 10;

  const r2 = (r / 2) / Math.cos(thetaOffset);
  const theta2 = theta + thetaOffset;

  const midpoint = [
    from[0] + r2 * Math.cos(theta2),
    from[1] + r2 * Math.sin(theta2)
  ];

  const steps = 40;

  for (let i = 0; i <= steps; i++) {
    const t = i / steps;

    const lat =
      (1 - t) * (1 - t) * from[1] +
      2 * (1 - t) * t * midpoint[1] +
      t * t * to[1];

    const lng =
      (1 - t) * (1 - t) * from[0] +
      2 * (1 - t) * t * midpoint[0] +
      t * t * to[0];

    latlngs.push([lat, lng]);
  }

  return latlngs;
}

// =========================
// DRAW FLIGHTS
// =========================
function drawFlights() {
  flightLayer.clearLayers();

  const active = Array.from(checkboxes)
    .filter(c => c.checked)
    .map(c => c.value);

  if (!active.includes("airport")) return;

  flightsData.forEach(f => {
    const from = airports[f.from];
    const to = airports[f.to];
    if (!from || !to) return;

    const arc = createArc(from, to);

    L.polyline(arc, {
      color: "#6f5cff",
      weight: 2.5,
      dashArray: "4, 8",
      opacity: 0.8
    }).addTo(flightLayer);
  });
}

// =========================
// MARKER STYLE
// =========================
function getStyle(loc) {
  if (loc.league?.includes("nba")) return { bg:"#ff9f43", emoji:"🏀" };
  if (loc.league?.includes("mlb")) return { bg:"#ff4d4d", emoji:"⚾" };
  if (loc.league?.includes("nfl")) return { bg:"#4da3ff", emoji:"🏈" };
  if (loc.league?.includes("nhl")) return { bg:"#9b59b6", emoji:"🏒" };
  if (loc.league?.includes("mls")) return { bg:"#27ae60", emoji:"⚽" };

  if (loc.category === "airport") return { bg:"#3498db", emoji:"✈" };
  if (loc.category === "national") return { bg:"#2ecc71", emoji:"🌲" };
  if (loc.category === "city") return { bg:"#666", emoji:"🏙" };

  return { bg:"#555", emoji:"📍" };
}

function createMarker(loc, lat, lng) {
  const style = getStyle(loc);

  return L.marker([lat, lng], {
    icon: L.divIcon({
      html: `<div class="marker-pin" style="background:${style.bg}">${style.emoji}</div>`,
      className: "emoji-marker",
      iconSize: [34,34]
    })
  });
}

// =========================
// RENDER FUNCTION (🔥 KEY FIX)
// =========================
function renderMarkers() {
  markers.clearLayers();

  const active = Array.from(checkboxes)
    .filter(c => c.checked)
    .map(c => c.value);

  locationsData.forEach(loc => {
    const cat = loc.category || "misc";

    // HARD FILTERS
    if (!active.includes("sports") && loc.league?.length) return;
    if (!active.includes("national") && cat === "national") return;
    if (!active.includes("airport") && cat === "airport") return;
    if (!active.includes("city") && cat === "city") return;

    // MULTI-LEAGUE FIX
    if (loc.league && loc.league.length > 0) {
      loc.league.forEach((league, i) => {
        const offset = 0.0008 * i;

        const fakeLoc = {
          ...loc,
          league: [league]
        };

        const m = createMarker(fakeLoc, loc.lat + offset, loc.lng + offset);

        const eventsHTML = (loc.events || [])
          .map(e => `<div>${e.date} - ${e.description}</div>`).join("");

        m.bindPopup(`<b>${loc.name}</b><br>${eventsHTML}`);

        markers.addLayer(m);
      });
    } else {
      const m = createMarker(loc, loc.lat, loc.lng);

      const eventsHTML = (loc.events || [])
        .map(e => `<div>${e.date} - ${e.description}</div>`).join("");

      m.bindPopup(`<b>${loc.name}</b><br>${eventsHTML}`);

      markers.addLayer(m);
    }
  });

  drawFlights(); // 🔥 tie flights to filters
}

// =========================
// LOAD DATA
// =========================
Promise.all([
  fetch("locations_clean.json").then(r => r.json()),
  fetch("us-states.geojson").then(r => r.json()),
  fetch("countries.geojson").then(r => r.json())
]).then(([data, states, countries]) => {

  locationsData = data.locations;
  flightsData = data.flights || [];

  // build city buckets
  locationsData.forEach(loc => {
    const point = [loc.lng, loc.lat];
    const exists = cityBuckets.some(b =>
      turf.distance(turf.point(b), turf.point(point), { units:'kilometers' }) < 10
    );
    if (!exists) cityBuckets.push(point);
  });

  renderMarkers(); // 🔥 initial render
});

// =========================
// FILTER LISTENERS
// =========================
checkboxes.forEach(cb => {
  cb.addEventListener("change", renderMarkers);
});

// =========================
// PANEL TOGGLE (STABLE)
// =========================
document.getElementById("panel-toggle")
  .addEventListener("click", () => {
    document
      .getElementById("control-panel-wrapper")
      .classList.toggle("collapsed");
  });
