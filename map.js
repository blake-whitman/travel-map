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

const markers = L.markerClusterGroup({
  maxClusterRadius: 25,
  disableClusteringAtZoom: 8,
  zoomToBoundsOnClick: true,
  spiderfyOnMaxZoom: true
});
map.addLayer(markers);

// =========================
// GLOBAL DATA
// =========================
let locationsData;
let cities = new Map();
let geoCache = JSON.parse(localStorage.getItem("geoCache") || "{}");

const checkboxes = document.querySelectorAll(".filter");
const cityFilter = document.getElementById("cityFilter");
const yearSlider = document.getElementById("yearSlider");
const yearLabel = document.getElementById("yearLabel");

let selectedYear = parseInt(yearSlider.value);

// =========================
// REVERSE GEOCODING (CACHED)
// =========================
async function getCityCached(lat, lng) {
  const key = `${lat.toFixed(3)},${lng.toFixed(3)}`;

  if (geoCache[key]) return geoCache[key];

  const res = await fetch(
    `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`
  );
  const data = await res.json();

  const addr = data.address || {};

  const city =
    addr.city ||
    addr.town ||
    addr.village ||
    addr.hamlet ||
    addr.county ||
    "Unknown";

  const state = addr.state || "";
  const country = addr.country || "";

  const result = `${city}, ${state}, ${country}`;

  geoCache[key] = result;
  localStorage.setItem("geoCache", JSON.stringify(geoCache));

  return result;
}

// =========================
// ICONS
// =========================
function iconByCategory(loc) {
  if (loc.league?.includes("nba")) return "🏀";
  if (loc.league?.includes("mlb")) return "⚾";
  if (loc.league?.includes("nfl")) return "🏈";
  if (loc.league?.includes("nhl")) return "🏒";
  if (loc.league?.includes("mls")) return "⚽";
  if (loc.league?.includes("atp")) return "🎾";

  if (loc.category === "disney") return "🏰";
  if (loc.category === "universal") return "🎢";
  if (loc.category === "national") return "🌲";
  if (loc.category === "airport") return "✈";
  if (loc.category === "zoo") return "🦁";

  return "📍";
}

// =========================
// CREATE MARKER
// =========================
function createMarker(loc) {
  return L.marker([loc.lat, loc.lng], {
    icon: L.divIcon({
      html: iconByCategory(loc),
      className: "emoji-marker",
      iconSize: [26, 26]
    })
  });
}

// =========================
// LOAD DATA
// =========================
Promise.all([
  fetch("locations_clean.json").then(r => r.json()),
  fetch("us-states.geojson").then(r => r.json()),
  fetch("countries.geojson").then(r => r.json())
]).then(async ([locations, states, countries]) => {

  locationsData = locations;

  const visitedStates = new Set();
  const visitedCountries = new Set();

  // =========================
  // BUILD CITY MAP
  // =========================
  for (const loc of locationsData) {
    const cityName = await getCityCached(loc.lat, loc.lng);
    loc.city = cityName;

    if (!cities.has(cityName)) {
      cities.set(cityName, {
        lat: loc.lat,
        lng: loc.lng,
        count: 1
      });
    } else {
      cities.get(cityName).count++;
    }
  }

  // Populate dropdown
  cities.forEach((val, key) => {
    const opt = document.createElement("option");
    opt.value = key;
    opt.textContent = `${key} (${val.count})`;
    cityFilter.appendChild(opt);
  });

  // =========================
  // PROCESS LOCATIONS
  // =========================
  locationsData.forEach(loc => {

    const point = turf.point([loc.lng, loc.lat]); // FIXED ORDER

    states.features.forEach(state => {
      if (turf.booleanPointInPolygon(point, state)) {
        visitedStates.add(state.properties.NAME);
      }
    });

    countries.features.forEach(c => {
      if (turf.booleanPointInPolygon(point, c)) {
        visitedCountries.add(c.properties.ADMIN || c.properties.name);
      }
    });
  });

  // =========================
  // DRAW STATES WITH HOVER
  // =========================
  L.geoJSON(states, {
    style: f => visitedStates.has(f.properties.NAME)
      ? { fillColor:"#4da3ff", fillOpacity:0.5, color:"#4da3ff", weight:1 }
      : { fillColor:"#444", fillOpacity:0.1, color:"#555", weight:1 },

    onEachFeature: (feature, layer) => {
      layer.on({
        mouseover: e => e.target.setStyle({ weight: 3 }),
        mouseout: e => e.target.setStyle({ weight: 1 })
      });
    }
  }).addTo(map);

  // =========================
  // INITIAL RENDER
  // =========================
  renderMarkers();
  updateStats(visitedStates, visitedCountries);
});

// =========================
// RENDER MARKERS
// =========================
function renderMarkers() {
  markers.clearLayers();

  const active = Array.from(checkboxes)
    .filter(c => c.checked)
    .map(c => c.value);

  const selectedCity = cityFilter.value;

  locationsData.forEach(loc => {

    // Year filter
    if (loc.visitedDate) {
      const year = new Date(loc.visitedDate).getFullYear();
      if (year > selectedYear) return;
    }

    // City filter
    if (selectedCity !== "all" && loc.city !== selectedCity) return;

    const cat = loc.category || "misc";

    let show = false;

    if (active.includes(cat)) show = true;
    else if (loc.league?.length && active.includes("sports")) show = true;

    if (!show) return;

    const m = createMarker(loc);

    const eventsHTML = (loc.events || [])
      .map(e => `<div>${e.date} - ${e.description}</div>`)
      .join("");

    const imagesHTML = (loc.images || [])
      .map(img => `<img src="${img}" style="width:150px;border-radius:8px;margin-top:6px;">`)
      .join("");

    m.bindPopup(`<b>${loc.name}</b><br>${loc.city}<br>${eventsHTML}${imagesHTML}`);

    markers.addLayer(m);
  });

  // =========================
  // CITY LAYER (BIG MARKERS)
  // =========================
  cities.forEach((city, name) => {

    if (cityFilter.value !== "all" && cityFilter.value !== name) return;

    L.circleMarker([city.lat, city.lng], {
      radius: 6 + city.count,
      color: "#4da3ff",
      fillOpacity: 0.6
    })
    .bindPopup(`${name}<br>${city.count} visits`)
    .addTo(map);
  });
}

// =========================
// UPDATE STATS
// =========================
function updateStats(states, countries) {
  document.getElementById("citiesVisited").innerText = cities.size;
  document.getElementById("statesVisited").innerText = states.size;
  document.getElementById("countriesVisited").innerText = countries.size;
}

// =========================
// FILTER EVENTS
// =========================
checkboxes.forEach(cb => cb.addEventListener("change", renderMarkers));

cityFilter.addEventListener("change", renderMarkers);

yearSlider.addEventListener("input", () => {
  selectedYear = parseInt(yearSlider.value);
  yearLabel.innerText = `Up to: ${selectedYear}`;
  renderMarkers();
});

// =========================
// PANEL TOGGLE
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
