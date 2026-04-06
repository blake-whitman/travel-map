// =========================
// INITIALIZE MAP
// =========================
const map = L.map('map', {
  zoomSnap: 0.5,
  zoomDelta: 0.75,
  wheelPxPerZoomLevel: 120
}).setView([39.8283, -98.5795], 4);

// Dark basemap
L.tileLayer(
  'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
  { attribution: '&copy; OpenStreetMap & Carto' }
).addTo(map);

// Marker cluster
const markers = L.markerClusterGroup({
  maxClusterRadius: 35,
  disableClusteringAtZoom: 9,
  zoomToBoundsOnClick: true,
  spiderfyOnMaxZoom: true,

  iconCreateFunction: function(cluster) {
    const count = cluster.getChildCount();

    let size = "small";
    if (count > 25) size = "medium";
    if (count > 75) size = "large";

    return L.divIcon({
      html: `<div class="cluster-marker ${size}">
               <span>${count}</span>
             </div>`,
      className: "custom-cluster",
      iconSize: L.point(40, 40)
    });
  }
});

// =========================
// GLOBAL DATA
// =========================
let locationsData;
let cityBuckets = [];

// Filters
const checkboxes = document.querySelectorAll(".filter");

// US territories
const territories = [
  "Puerto Rico",
  "Guam",
  "American Samoa",
  "Northern Mariana Islands",
  "U.S. Virgin Islands"
];

// =========================
// ICONS
// =========================
function iconByCategory(loc) {
  if (loc.league?.includes("nba") || loc.league?.includes("ncaa_basketball")) return "🏀";
  if (loc.league?.includes("mlb")) return "⚾";
  if (loc.league?.includes("nfl") || loc.league?.includes("ncaa_football")) return "🏈";
  if (loc.league?.includes("nhl") || loc.league?.includes("ncaa_hockey")) return "🏒";
  if (loc.league?.includes("mls")) return "⚽";
  if (loc.league?.includes("atp")) return "🎾";

  if (loc.category === "disney") return "🏰";
  if (loc.category === "universal") return "🎢";
  if (loc.category === "city") return "🏙";
  if (loc.category === "national") return "🌲";
  if (loc.category === "airport") return "✈";
  if (loc.category === "zoo") return "🦁";

  return "📍";
}

function getMarkerStyle(loc) {
  // SPORTS (most important distinction)
  if (loc.league?.includes("nba") || loc.league?.includes("ncaa_basketball")) return { bg: "#ff9f43", emoji: "🏀" };
  if (loc.league?.includes("mlb")) return { bg: "#ff4d4d", emoji: "⚾" };
  if (loc.league?.includes("nfl") || loc.league?.includes("ncaa_football")) return { bg: "#4da3ff", emoji: "🏈" };
  if (loc.league?.includes("nhl") || loc.league?.includes("ncaa_hockey")) return { bg: "#9b59b6", emoji: "🏒" };
  if (loc.league?.includes("mls")) return { bg: "#27ae60", emoji: "⚽" };
  if (loc.league?.includes("atp")) return { bg: "#f1c40f", emoji: "🎾" };

  // TRAVEL
  if (loc.category === "national") return { bg: "#2ecc71", emoji: "🌲" };
  if (loc.category === "airport") return { bg: "#3498db", emoji: "✈" };
  if (loc.category === "zoo") return { bg: "#e67e22", emoji: "🦁" };
  if (loc.category === "disney") return { bg: "#ff66cc", emoji: "🏰" };
  if (loc.category === "universal") return { bg: "#9b59b6", emoji: "🎢" };

  // CITY DEFAULT
  if (loc.category === "city") return { bg: "#666", emoji: "🏙" };

  return { bg: "#555", emoji: "📍" };
}

function createMarker(loc) {
  let style = getMarkerStyle(loc);

  // Override for city: if it's in a city bucket but not a league/theme park
  const isCity = cityBuckets.some(bucket => {
    return turf.distance(turf.point(bucket), turf.point([loc.lng, loc.lat]), { units: 'kilometers' }) < 10;
  });
  if (isCity && !loc.league?.length && loc.category !== "national" && loc.category !== "disney" && loc.category !== "zoo" && loc.category !== "universal") {
    style = { bg: "#666", emoji: "🏙" };
  }

  return L.marker([loc.lat, loc.lng], {
    icon: L.divIcon({
      html: `
  <div class="marker-pin" style="background:${style.bg || "#555"}">
    ${style.emoji || "📍"}
  </div>
`,
      className: "emoji-marker",
      iconSize: [34, 34]
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
]).then(([locations, states, countries]) => {
  locationsData = locations;

  const visitedStates = new Set();
  const visitedCountries = new Set();
  const visitedTerritories = new Set();

  let mlb=0, nfl=0, nba=0, nhl=0, mls=0, atp=0;
  let parks=0, sports=0;
  let disney = 0, universal = 0, zoo=0;

  const territoriesGeo = [];
  const otherCountriesGeo = [];

  countries.features.forEach(c => {
    const name = c.properties.ADMIN || c.properties.name;
    if (territories.includes(name)) territoriesGeo.push(c);
    else otherCountriesGeo.push(c);
  });

  // =========================
  // PROCESS LOCATIONS
  // =========================
  locations.forEach(loc => {
    const lat = loc.lat;
    const lng = loc.lng;
    const cat = loc.category || "misc";

    // City cluster (unique cities)
    const cityPoint = [lng, lat];
    const exists = cityBuckets.some(bucket => {
      const dist = turf.distance(turf.point(bucket), turf.point(cityPoint), { units: 'kilometers' });
      return dist < 10;
    });
    if (!exists) cityBuckets.push(cityPoint);

    // Counts
    if (cat === "national") parks++;
    else if (cat === "disney") disney++;
    else if (cat === "universal") universal++;
    else if (cat === "zoo") zoo++;
    else if (loc.league && loc.league.length) sports++;

    if (loc.league?.includes("nba")) nba++;
    if (loc.league?.includes("nhl")) nhl++;
    if (loc.league?.includes("mlb")) mlb++;
    if (loc.league?.includes("nfl")) nfl++;
    if (loc.league?.includes("mls")) mls++;
    if (loc.league?.includes("atp")) atp++;

    // Marker
    const m = createMarker(loc);

    const eventsHTML = (loc.events || []).map(e => `<div>${e.date} - ${e.description}</div>`).join("");
    const imagesHTML = (loc.images || []).map(img => `<img src="${img}" style="width:150px;border-radius:8px;margin-top:6px;">`).join("");

    m.bindPopup(`<b>${loc.name}</b><br>${eventsHTML}${imagesHTML}`);
    markers.addLayer(m);

    // Turf point for polygons
    const turfPoint = turf.point([lng, lat]);

    states.features.forEach(state => {
      if (!territories.includes(state.properties.NAME) && turf.booleanPointInPolygon(turfPoint, state)) {
        visitedStates.add(state.properties.NAME);
      }
    });

    territoriesGeo.forEach(t => {
      if (turf.booleanPointInPolygon(turfPoint, t)) {
        visitedTerritories.add(t.properties.ADMIN || t.properties.name);
      }
    });

    otherCountriesGeo.forEach(c => {
      if (turf.booleanPointInPolygon(turfPoint, c)) {
        visitedCountries.add(c.properties.ADMIN || c.properties.name);
      }
    });
  });

  // =========================
  // DRAW STATES
  // =========================
  L.geoJSON(states, {
    style: f => visitedStates.has(f.properties.NAME)
      ? { fillColor:"#4da3ff", fillOpacity:0.5, color:"#4da3ff", weight:1 }
      : { fillColor:"#444", fillOpacity:0.1, color:"#555", weight:1 }
  }).addTo(map);

  // =========================
  // DRAW COUNTRIES
  // =========================
  L.geoJSON(countries, {
    style: f => {
      const cname = f.properties.ADMIN || f.properties.name;
      if(cname === "United States of America") return { fillOpacity:0, stroke:false };
      else if(territories.includes(cname)) return { fillColor:"#ff8c42", fillOpacity:0.5, color:"#ff8c42", weight:1 };
      else if(visitedCountries.has(cname)) return { fillColor:"#3fbf7f", fillOpacity:0.45, color:"#3fbf7f", weight:1 };
      else return { fillColor:"#444", fillOpacity:0.03, color:"#555", weight:1 };
    }
  }).addTo(map);

  // =========================
  // UPDATE UI
  // =========================
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
});

// =========================
// FILTERS
// =========================
checkboxes.forEach(cb => {
  cb.addEventListener("change", () => {
    markers.clearLayers();

    const active = Array.from(checkboxes)
      .filter(c => c.checked)
      .map(c => c.value);

    locationsData.forEach(loc => {
      const cat = loc.category || "misc";

      let show = false;

      // Normal category match
      if (active.includes(cat)) show = true;

      // Sports filter
      else if (cat !== "city" && cat !== "national" && loc.league?.length && active.includes("sports")) {
        show = true;
      }

      // City filter (special handling)
      else if (active.includes("city")) {
        // Check if this location belongs to any city bucket
        const lat = loc.lat;
        const lng = loc.lng;
        const isCity = cityBuckets.some(bucket => {
          const dist = turf.distance(turf.point(bucket), turf.point([lng, lat]), { units: 'kilometers' });
          return dist < 10;
        });
        if (isCity) show = true;
      }

      if (!show) return;

      const m = createMarker(loc);

      const eventsHTML = (loc.events || []).map(e => `<div>${e.date} - ${e.description}</div>`).join("");
      const imagesHTML = (loc.images || []).map(img => `<img src="${img}" style="width:150px;border-radius:8px;margin-top:6px;">`).join("");

      m.bindPopup(`<b>${loc.name}</b><br>${eventsHTML}${imagesHTML}`);
      markers.addLayer(m);
    });
  });
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
