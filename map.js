// Initialize map
const map = L.map('map', { zoomSnap: 0.5, zoomDelta: 0.75, wheelPxPerZoomLevel: 120 }).setView([39.8283, -98.5795], 4);

// Dark map
L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', { attribution: '&copy; OpenStreetMap & Carto' }).addTo(map);

// Cluster group
const markers = L.markerClusterGroup({ maxClusterRadius: 25, disableClusteringAtZoom: 8, zoomToBoundsOnClick: true, spiderfyOnMaxZoom: false });
map.addLayer(markers);

// Global data
let locationsData;

// Category
function getCategory(style) {
  const categories = {
    "#icon-1720-0288D1":"national",
    "#icon-1519-0288D1":"baseball",
    "#icon-1520-0288D1":"basketball",
    "#icon-1579-0288D1":"football",
    "#icon-1805-0288D1":"hockey",
    "#icon-1696-0288D1":"soccer",
    "#icon-1707-0288D1":"tennis"
  };
  return categories[style] || "city";
}

// Icons
function iconByCategory(cat) {
  const icons = { city:"🏙", national:"🌲", baseball:"⚾", basketball:"🏀", football:"🏈", hockey:"🏒", soccer:"⚽", tennis:"🎾", airport:"✈" };
  return L.divIcon({ html: icons[cat] || "📍", className:"emoji-marker", iconSize:[26,26] });
}

// Format desc
function formatDescription(desc){
  if(!desc) return "";
  if(typeof desc==="string") return desc;
  if(typeof desc==="object") return desc.value || JSON.stringify(desc);
  return "";
}

// Filters
const checkboxes = document.querySelectorAll(".filter");

// Territories list
const territories = ["Puerto Rico","Guam","American Samoa","U.S. Virgin Islands","Northern Mariana Islands"];

// Load data
Promise.all([
  fetch("locations.geojson").then(r => r.json()),
  fetch("us-states.geojson").then(r => r.json()),
  fetch("us-territories.geojson").then(r => r.json()),
  fetch("countries.geojson").then(r => r.json())
]).then(([locations, states, territoryGeo, countries]) => {

  locationsData = locations;

  const visitedStates = new Set();
  const visitedTerritories = new Set();
  const visitedCountries = new Set();

  let mlb=0, nfl=0, nba=0, nhl=0, parks=0, cities=0, sports=0;

  locations.features.forEach(f => {

    const [lng, lat] = f.geometry.coordinates;
    const cat = getCategory(f.properties.styleUrl);

    if(cat==="national") parks++;
    else if(cat==="city") cities++;
    else sports++;

    if(cat==="baseball") mlb++;
    if(cat==="football") nfl++;
    if(cat==="basketball") nba++;
    if(cat==="hockey") nhl++;

    // Add marker (UNCHANGED)
    const m = L.marker([lat, lng], { icon: iconByCategory(cat) });
    m.bindPopup(`<b>${f.properties.name}</b><br>${formatDescription(f.properties.description)}`);
    markers.addLayer(m);

    const point = turf.point([lng, lat]);

    // Detect states
    states.features.forEach(state => {
      const name = state.properties.NAME;
      if(!territories.includes(name) && turf.booleanPointInPolygon(point, state)){
        visitedStates.add(name);
      }
    });

    // Detect territories
    territoryGeo.features.forEach(t => {
      if(turf.booleanPointInPolygon(point, t)){
        visitedTerritories.add(t.properties.name);
      }
    });

    // Detect countries
    countries.features.forEach(c => {
      const cname = c.properties.ADMIN || c.properties.name;
      if(turf.booleanPointInPolygon(point, c)){
        visitedCountries.add(cname);
      }
    });

  });

  // Draw states layer
  L.geoJSON(states, {
    style: f => visitedStates.has(f.properties.NAME)
      ? { fillColor:"#4da3ff", fillOpacity:0.55, color:"#4da3ff", weight:1 }
      : { fillColor:"#444", fillOpacity:0.1, color:"#555", weight:1 }
  }).addTo(map);

  // Draw territories layer (gold)
  L.geoJSON(territoryGeo, {
    style: f => visitedTerritories.has(f.properties.name)
      ? { fillColor:"#f5b942", fillOpacity:0.55, color:"#f5b942", weight:1 }
      : { fillColor:"#444", fillOpacity:0.05, color:"#555", weight:1 }
  }).addTo(map);

  // Draw countries layer (green except USA)
  L.geoJSON(countries, {
    style: f => {
      const cname = f.properties.ADMIN || f.properties.name;
      if(cname === "United States of America") return { fillOpacity:0, color:"#555", weight:1 };

      return visitedCountries.has(cname)
        ? { fillColor:"#3fbf7f", fillOpacity:0.45, color:"#3fbf7f", weight:1 }
        : { fillColor:"#444", fillOpacity:0.03, color:"#555", weight:1 };
    }
  }).addTo(map);

  // Progress bars (UNCHANGED)
  document.getElementById("parksVisited").innerText = parks;
  document.getElementById("citiesVisited").innerText = cities;
  document.getElementById("sportsVisited").innerText = sports;
  document.getElementById("statesVisited").innerText = visitedStates.size;
  document.getElementById("statesCount").innerText = visitedStates.size;
  document.getElementById("statesBar").style.width = (visitedStates.size/50*100) + "%";

  document.getElementById("mlbCount").innerText = mlb;
  document.getElementById("mlbBar").style.width = (mlb/30*100)+"%";

  document.getElementById("nflCount").innerText = nfl;
  document.getElementById("nflBar").style.width = (nfl/32*100)+"%";

  document.getElementById("nbaCount").innerText = nba;
  document.getElementById("nbaBar").style.width = (nba/30*100)+"%";

  document.getElementById("nhlCount").innerText = nhl;
  document.getElementById("nhlBar").style.width = (nhl/32*100)+"%";

});

// Filter behavior (UNCHANGED)
checkboxes.forEach(cb => {
  cb.addEventListener("change", () => {
    markers.clearLayers();
    const active = Array.from(checkboxes).filter(c => c.checked).map(c => c.value);
    locationsData.features.forEach(f => {
      const [lng, lat] = f.geometry.coordinates;
      const cat = getCategory(f.properties.styleUrl);
      if(!active.includes(cat) && !(cat!=="city" && cat!=="national" && active.includes("sports"))) return;
      const m = L.marker([lat, lng], { icon: iconByCategory(cat) });
      m.bindPopup(`<b>${f.properties.name}</b><br>${formatDescription(f.properties.description)}`);
      markers.addLayer(m);
    });
  });
});
