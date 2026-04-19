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
// FORCE AIRPORT FILTER OFF ON LOAD
// =========================
document.querySelectorAll(".filter").forEach(cb => {
  if (cb.value === "airport") cb.checked = false;
});

// =========================
// CLUSTERS
// =========================
const markers = L.markerClusterGroup({
  maxClusterRadius: 35,
  disableClusteringAtZoom: 9
});
map.addLayer(markers);

// =========================
// GLOBALS
// =========================
let locationsData = [];
let flightsData = [];
let cityBuckets = [];

let statesLayer;
let countriesLayer;

let flightLayer = L.layerGroup().addTo(map);
let animatedLines = []; // 🔥 store for global animation

const checkboxes = document.querySelectorAll(".filter");

// =========================
// AIRPORT COORDS
// =========================
const airports = {
  EWR: [-74.1745, 40.6895],
  JFK: [-73.7781, 40.6413],
  LGA: [-73.8742, 40.7766],
  LAS: [-115.1522, 36.0801],
  LAX: [-118.4085, 33.9416],
  CMH: [-82.8872, 39.9999],
  OAK: [-122.2196, 37.7190],
  DFW: [-97.0391, 32.8922],
  DTW: [-83.3534, 42.2124],
  SJU: [-65.8742, 18.9992],
  CLE: [-81.8547, 41.4094],
  TPA: [-82.5303, 27.9769],
  MCO: [-81.3105, 28.4244]
};

// =========================
// ARC FUNCTION
// =========================
function createGreatCircle(from, to) {
  return turf.greatCircle(
    turf.point(from),
    turf.point(to),
    { npoints: 60 } // 🔥 reduced for performance
  );
}

// =========================
// GLOBAL ANIMATION LOOP (ONE ONLY)
// =========================
let dashOffset = 0;

function animateFlights() {
  dashOffset -= 1;

  animatedLines.forEach(line => {
    line.setStyle({ dashOffset });
  });

  requestAnimationFrame(animateFlights);
}

animateFlights();

// =========================
// DRAW FLIGHTS
// =========================
function drawFlights() {
  flightLayer.clearLayers();
  animatedLines = [];

  const active = Array.from(checkboxes)
    .filter(c => c.checked)
    .map(c => c.value);

  if (!active.includes("airport")) return;

  flightsData.forEach(f => {
    const from = airports[f.from];
    const to = airports[f.to];
    if (!from || !to) return;

    const line = createGreatCircle(from, to);
    const coords = line.geometry.coordinates.map(c => [c[1], c[0]]);

    // base line
    L.polyline(coords, {
      color: "#6f5cff",
      weight: 2,
      opacity: 0.25
    }).addTo(flightLayer);

    // animated line (tracked globally)
    const animated = L.polyline(coords, {
      color: "#6f5cff",
      weight: 2.5,
      opacity: 0.85,
      dashArray: "8,16",
      lineCap: "round"
    }).addTo(flightLayer);

    animatedLines.push(animated);

    // direction arrow (cheap + fast)
    const last = coords[coords.length - 1];
    const prev = coords[coords.length - 2];

    const angle = Math.atan2(
      last[0] - prev[0],
      last[1] - prev[1]
    ) * (180 / Math.PI);

    L.marker(last, {
      icon: L.divIcon({
        className: "flight-arrow",
        html: `<div style="
          transform: rotate(${angle}deg);
          font-size: 12px;
          color: #6f5cff;
        ">➤</div>`,
        iconSize: [12, 12]
      })
    }).addTo(flightLayer);
  });
}

// =========================
// MARKERS
// =========================
function createMarker(loc, lat, lng) {
  return L.marker([lat, lng]);
}

function renderMarkers() {
  markers.clearLayers();

  const active = Array.from(checkboxes)
    .filter(c => c.checked)
    .map(c => c.value);

  locationsData.forEach(loc => {
    const cat = loc.category || "misc";

    if (!active.includes("sports") && loc.league?.length) return;
    if (!active.includes("national") && cat === "national") return;
    if (!active.includes("airport") && cat === "airport") return;
    if (!active.includes("city") && cat === "city") return;

    const m = createMarker(loc, loc.lat, loc.lng);
    markers.addLayer(m);
  });

  drawFlights();
}

// =========================
// STATS (UNCHANGED)
// =========================
function updateStats(locations, states, countries) {
  const visitedStates = new Set();

  locations.forEach(loc => {
    const pt = turf.point([loc.lng, loc.lat]);

    states.features.forEach(s => {
      if (turf.booleanPointInPolygon(pt, s)) {
        visitedStates.add(s.properties.NAME);
      }
    });
  });

  document.getElementById("statesVisited").innerText = visitedStates.size;
}

// =========================
// LOAD
// =========================
Promise.all([
  fetch("locations_clean.json").then(r => r.json()),
  fetch("us-states.geojson").then(r => r.json()),
  fetch("countries.geojson").then(r => r.json())
]).then(([data, states, countries]) => {

  locationsData = data.locations;
  flightsData = data.flights || [];

  updateStats(locationsData, states, countries);
  renderMarkers();
});

// =========================
// FILTERS
// =========================
checkboxes.forEach(cb => {
  cb.addEventListener("change", renderMarkers);
});

// =========================
// PANEL TOGGLE (UNCHANGED)
// =========================
const toggleBtn = document.getElementById("panel-toggle");
const panel = document.getElementById("control-panel");
const wrapper = document.getElementById("control-panel-wrapper");

toggleBtn.addEventListener("click", () => {
  const collapsed = wrapper.classList.toggle("collapsed");

  if (collapsed) {
    document.body.appendChild(toggleBtn);
    toggleBtn.style.position = "fixed";
    toggleBtn.style.top = "130px";
    toggleBtn.style.left = "10px";
  } else {
    panel.appendChild(toggleBtn);
    toggleBtn.style.position = "absolute";
    toggleBtn.style.top = "10px";
    toggleBtn.style.right = "10px";
  }
});
