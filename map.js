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
  maxClusterRadius: 25,
  disableClusteringAtZoom: 8,
  zoomToBoundsOnClick: true,
  spiderfyOnMaxZoom: false
});
map.addLayer(markers);

// =========================
// GLOBAL DATA
// =========================
let locationsData;

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
// ICONS (NEW CATEGORY SYSTEM)
// =========================
function iconByCategory(cat) {
  const icons = {
    city: "🏙",
    national: "🌲",

    mlb: "⚾",
    nfl: "🏈",
    nba: "🏀",
    nhl: "🏒",
    mls: "⚽",
    tennis: "🎾",

    milb: "⚾",
    ncaa_football: "🏈",
    ncaa_basketball: "🏀",

    airport: "✈",
    misc: "📍"
  };

  return L.divIcon({
    html: icons[cat] || "📍",
    className: "emoji-marker",
    iconSize: [26, 26]
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
  let parks=0, cities=0, sports=0;
  let disney = 0, universal = 0, zoo=0;

  // Split countries
  const territoriesGeo = [];
  const otherCountriesGeo = [];

  countries.features.forEach(c => {
    const name = c.properties.ADMIN || c.properties.name;

    if (territories.includes(name)) {
      territoriesGeo.push(c);
    } else {
      otherCountriesGeo.push(c);
    }
  });

  // =========================
  // PROCESS LOCATIONS (NEW JSON)
  // =========================
  locations.forEach(loc => {
    const lat = loc.lat;
    const lng = loc.lng;
    const cat = loc.category || "misc";

    // Count by category
    if(cat==="national") parks++;
    else if(cat==="city") cities++;
    else sports++;

    if(cat==="mlb") mlb++;
    if(cat==="nfl") nfl++;
    if(cat==="nba") nba++;
    if(cat==="nhl") nhl++;
    if(cat==="mls") mls++;
    if(cat==="tennis") atp++;
    if (cat === "disney") disney++;
    if (cat === "universal") universal++;
    if (cat === "zoo") zoo++;

    // Render events
    const eventsHTML = (loc.events || []).map(e =>
      `<div>${e.date} - ${e.description}</div>`
    ).join("");

    // Render images
    const imagesHTML = (loc.images || []).map(img =>
      `<img src="${img}" style="width:150px;border-radius:8px;margin-top:6px;">`
    ).join("");

    // Create marker
    const m = L.marker([lat, lng], { icon: iconByCategory(cat) });

    m.bindPopup(`
      <b>${loc.name}</b><br>
      ${eventsHTML}
      ${imagesHTML}
    `);

    markers.addLayer(m);

    const point = turf.point([lng, lat]);

    // STATES
    states.features.forEach(state => {
      if(!territories.includes(state.properties.NAME) &&
         turf.booleanPointInPolygon(point, state)) {
        visitedStates.add(state.properties.NAME);
      }
    });

    // TERRITORIES
    for (let t of territoriesGeo) {
      if (turf.booleanPointInPolygon(point, t)) {
        const name = t.properties.ADMIN || t.properties.name;
        visitedTerritories.add(name);
        break;
      }
    }

    // COUNTRIES
    for (let c of otherCountriesGeo) {
      if (turf.booleanPointInPolygon(point, c)) {
        const name = c.properties.ADMIN || c.properties.name;
        visitedCountries.add(name);
        break;
      }
    }
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

      if(cname === "United States of America") {
        return { fillOpacity: 0, stroke:false };
      } 
      else if(territories.includes(cname)) {
        return { fillColor:"#ff8c42", fillOpacity:0.5, color:"#ff8c42", weight:1 };
      } 
      else if(visitedCountries.has(cname)) {
        return { fillColor:"#3fbf7f", fillOpacity:0.45, color:"#3fbf7f", weight:1 };
      } 
      else {
        return { fillColor:"#444", fillOpacity:0.03, color:"#555", weight:1 };
      }
    }
  }).addTo(map);

  // =========================
  // UPDATE UI
  // =========================
  document.getElementById("citiesVisited").innerText = cities;
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
// FILTERS (UPDATED FOR CLEAN JSON)
// =========================
checkboxes.forEach(cb => {
  cb.addEventListener("change", () => {
    markers.clearLayers();

    const active = Array.from(checkboxes)
      .filter(c => c.checked)
      .map(c => c.value);

    locationsData.forEach(loc => {
      const lat = loc.lat;
      const lng = loc.lng;
      const cat = loc.category || "misc";

      // Filter logic
      if(!active.includes(cat) &&
         !(cat !== "city" && cat !== "national" && active.includes("sports")))
        return;

      const eventsHTML = (loc.events || []).map(e =>
        `<div>${e.date} - ${e.description}</div>`
      ).join("");

      const imagesHTML = (loc.images || []).map(img =>
        `<img src="${img}" style="width:150px;border-radius:8px;margin-top:6px;">`
      ).join("");

      const m = L.marker([lat, lng], { icon: iconByCategory(cat) });
      m.bindPopup(`
        <b>${loc.name}</b><br>
        ${eventsHTML}
        ${imagesHTML}
      `);

      markers.addLayer(m);
    });
  });
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
