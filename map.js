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

L.polylineDecorator = L.polylineDecorator || null;

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

let statesLayer;
let countriesLayer;

let flightLayer = L.layerGroup().addTo(map);

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
  SJU: [-65.8742, 18.9992]
};

// =========================
// ARC FUNCTION
// =========================
function createGreatCircle(from, to) {
  return turf.greatCircle(
    turf.point(from),
    turf.point(to),
    { npoints: 80 }
  );
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

    const line = createGreatCircle(from, to);

    const coords = line.geometry.coordinates.map(c => [c[1], c[0]]);

    // =========================
    // BASE LINE
    // =========================
    const base = L.polyline(coords, {
      color: "#6f5cff",
      weight: 2,
      opacity: 0.35
    }).addTo(flightLayer);

    // =========================
    // MOVING DASH LAYER (FLOW EFFECT)
    // =========================
    const animated = L.polyline(coords, {
      color: "#6f5cff",
      weight: 3,
      opacity: 0.9,
      dashArray: "10, 20",
      lineCap: "round"
    }).addTo(flightLayer);

    // animate dash offset
    let offset = 0;

    function animate() {
      offset -= 1.2;
      animated.setStyle({
        dashOffset: offset
      });

      requestAnimationFrame(animate);
    }

    animate();

    // =========================
    // ARROW (SUBTLE END INDICATOR)
    // =========================
    // get last segment direction
  const last = coords[coords.length - 1];
  const prev = coords[coords.length - 2];

  const angle = Math.atan2(
    last[0] - prev[0],
    last[1] - prev[1]
  ) * (180 / Math.PI);

  // create arrow marker
  L.marker(last, {
    icon: L.divIcon({
      className: "flight-arrow",
      html: `<div style="
        transform: rotate(${angle}deg);
        font-size: 14px;
        color: #6f5cff;
      ">➤</div>`,
      iconSize: [14, 14]
    })
  }).addTo(flightLayer);
    });
  }

// =========================
// MARKERS
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

    if (loc.league?.length) {
      loc.league.forEach((league, i) => {
        const offset = 0.0008 * i;

        const fakeLoc = { ...loc, league:[league] };

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

  drawFlights();
}

// =========================
// 🔥 STATS + GEO + BARS (FULL RESTORE)
// =========================
function updateStats(locations, states, countries) {

  const visitedStates = new Set();
  const visitedCountries = new Set();
  const visitedTerritories = new Set();

  let mlb=0, nfl=0, nba=0, nhl=0, mls=0, atp=0;
  let parks=0, sports=0;
  let disney=0, universal=0, zoo=0;

  const territories = [
    "Puerto Rico",
    "Guam",
    "American Samoa",
    "Northern Mariana Islands",
    "U.S. Virgin Islands"
  ];

  const territoriesGeo = [];
  const otherCountriesGeo = [];

  countries.features.forEach(c => {
    const name = c.properties.ADMIN || c.properties.name;
    if (territories.includes(name)) territoriesGeo.push(c);
    else otherCountriesGeo.push(c);
  });

  locations.forEach(loc => {

    const lat = loc.lat;
    const lng = loc.lng;
    const cat = loc.category || "misc";

    if (cat === "national") parks++;
    else if (cat === "disney") disney++;
    else if (cat === "universal") universal++;
    else if (cat === "zoo") zoo++;
    else if (loc.league?.length) sports++;

    if (loc.league?.includes("nba")) nba++;
    if (loc.league?.includes("nhl")) nhl++;
    if (loc.league?.includes("mlb")) mlb++;
    if (loc.league?.includes("nfl")) nfl++;
    if (loc.league?.includes("mls")) mls++;
    if (loc.league?.includes("atp")) atp++;

    const pt = turf.point([lng, lat]);

    states.features.forEach(s => {
      if (!territories.includes(s.properties.NAME) &&
          turf.booleanPointInPolygon(pt, s)) {
        visitedStates.add(s.properties.NAME);
      }
    });

    territoriesGeo.forEach(t => {
      if (turf.booleanPointInPolygon(pt, t)) {
        visitedTerritories.add(t.properties.ADMIN || t.properties.name);
      }
    });

    otherCountriesGeo.forEach(c => {
      if (turf.booleanPointInPolygon(pt, c)) {
        visitedCountries.add(c.properties.ADMIN || c.properties.name);
      }
    });
  });

  if (statesLayer) map.removeLayer(statesLayer);
  if (countriesLayer) map.removeLayer(countriesLayer);

  statesLayer = L.geoJSON(states, {
    style: f => visitedStates.has(f.properties.NAME)
      ? { fillColor:"#4da3ff", fillOpacity:0.5, color:"#4da3ff", weight:1 }
      : { fillColor:"#444", fillOpacity:0.1, color:"#555", weight:1 }
  }).addTo(map);

  countriesLayer = L.geoJSON(countries, {
    style: f => {
      const cname = f.properties.ADMIN || f.properties.name;
      if (cname === "United States of America") return { fillOpacity:0, stroke:false };
      else if (territories.includes(cname)) return { fillColor:"#ff8c42", fillOpacity:0.5, color:"#ff8c42", weight:1 };
      else if (visitedCountries.has(cname)) return { fillColor:"#3fbf7f", fillOpacity:0.45, color:"#3fbf7f", weight:1 };
      else return { fillColor:"#444", fillOpacity:0.03, color:"#555", weight:1 };
    }
  }).addTo(map);

  statesLayer.bringToBack();
  countriesLayer.bringToBack();

  // 🔥 PROGRESS BARS FIXED
  document.getElementById("citiesVisited").innerText = cityBuckets.length;
  document.getElementById("sportsVisited").innerText = sports;
  document.getElementById("statesVisited").innerText = visitedStates.size;
  document.getElementById("countriesVisited").innerText = visitedCountries.size;
  document.getElementById("territoriesVisited").innerText = visitedTerritories.size;

  document.getElementById("parksCount").innerText = parks;
  document.getElementById("parksBar").style.width = (parks/63*100) + "%";

  document.getElementById("disneyCount").innerText = disney;
  document.getElementById("disneyBar").style.width = (disney/12*100) + "%";

  document.getElementById("universalCount").innerText = universal;
  document.getElementById("universalBar").style.width = (universal/7*100) + "%";

  document.getElementById("zooCount").innerText = zoo;
  document.getElementById("zooBar").style.width = (zoo/240*100) + "%";

  document.getElementById("mlbCount").innerText = mlb;
  document.getElementById("mlbBar").style.width = (mlb/30*100)+"%";

  document.getElementById("nflCount").innerText = nfl;
  document.getElementById("nflBar").style.width = (nfl/32*100)+"%";

  document.getElementById("nbaCount").innerText = nba;
  document.getElementById("nbaBar").style.width = (nba/30*100)+"%";

  document.getElementById("nhlCount").innerText = nhl;
  document.getElementById("nhlBar").style.width = (nhl/32*100)+"%";

  document.getElementById("mlsCount").innerText = mls;
  document.getElementById("mlsBar").style.width = (mls/31*100)+"%";

  document.getElementById("atpCount").innerText = atp;
  document.getElementById("atpBar").style.width = (atp/59*100)+"%";
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

  locationsData.forEach(loc => {
    const point = [loc.lng, loc.lat];
    const exists = cityBuckets.some(b =>
      turf.distance(turf.point(b), turf.point(point), { units:'kilometers' }) < 10
    );
    if (!exists) cityBuckets.push(point);
  });

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
// 🔥 FIXED PANEL TOGGLE
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
    toggleBtn.style.right = "auto";
    toggleBtn.style.zIndex = "2000";
  } else {
    panel.appendChild(toggleBtn);
    toggleBtn.style.position = "absolute";
    toggleBtn.style.top = "10px";
    toggleBtn.style.right = "10px";
    toggleBtn.style.left = "auto";
  }
});
