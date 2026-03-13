// Initialize map
const map = L.map('map', {
  zoomSnap: 0.5,
  zoomDelta: 0.75,
  wheelPxPerZoomLevel: 120
}).setView([39.8283, -98.5795], 4);

// Dark map style
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

// Globals
let locationsData;

// Category mapping
function getCategory(style) {
  if (!style) return "city";
  const categories = {
    "#icon-1720-0288D1": "national",
    "#icon-1519-0288D1": "baseball",
    "#icon-1520-0288D1": "basketball",
    "#icon-1579-0288D1": "football",
    "#icon-1805-0288D1": "hockey",
    "#icon-1696-0288D1": "soccer",
    "#icon-1707-0288D1": "tennis"
  };
  return categories[style] || "city";
}

// Emoji icons
function iconByCategory(cat){
  const icons = {
    city:"🏙",
    national:"🌲",
    baseball:"⚾",
    basketball:"🏀",
    football:"🏈",
    hockey:"🏒",
    soccer:"⚽",
    tennis:"🎾",
    airport:"✈"
  };
  return L.divIcon({ html:icons[cat]||"📍", className:"emoji-marker", iconSize:[26,26] });
}

// Description formatting
function formatDescription(desc){
  if(!desc) return "";
  if(typeof desc==="string") return desc;
  if(typeof desc==="object"){ return desc.value||JSON.stringify(desc); }
  return "";
}

// Filters
const checkboxes = document.querySelectorAll(".filter");

// Load GeoJSON
Promise.all([
  fetch("locations.geojson").then(r=>r.json()),
  fetch("us-states.geojson").then(r=>r.json())
]).then(([locations, states]) => {

  locationsData = locations;
  const visitedStates = new Set();
  
  let mlb=0, nfl=0, nba=0, nhl=0, parks=0, cities=0, sports=0;

  locations.features.forEach(feature=>{
    const [lng, lat] = feature.geometry.coordinates;
    const props = feature.properties;
    const category = getCategory(props.styleUrl);

    // Count stats
    if(category==="national") parks++;
    else if(category==="city") cities++;
    else sports++;
    if(category==="baseball") mlb++;
    if(category==="football") nfl++;
    if(category==="basketball") nba++;
    if(category==="hockey") nhl++;

    // Marker
    const marker = L.marker([lat,lng], {icon:iconByCategory(category)});
    marker.bindPopup(`<b>${props.name}</b><br>${formatDescription(props.description)}`);
    markers.addLayer(marker);

    // Turf state detection
    const point = turf.point([lng,lat]);
    states.features.forEach(state=>{
      if(turf.booleanPointInPolygon(point,state)){
        visitedStates.add(state.properties.NAME);
      }
    });
  });

  // Draw states shading
  L.geoJSON(states, {
    style: feature=>{
      const name = feature.properties.NAME;
      return visitedStates.has(name)
        ? { fillColor:"#4da3ff", fillOpacity:0.5, color:"#4da3ff", weight:1 }
        : { fillColor:"#444", fillOpacity:0.1, color:"#555", weight:1 };
    }
  }).addTo(map);

  // Update stats
  document.getElementById("parksVisited").innerText = parks;
  document.getElementById("citiesVisited").innerText = cities;
  document.getElementById("sportsVisited").innerText = sports;
  document.getElementById("statesVisited").innerText = visitedStates.size;

  // Update progress bars
  document.getElementById("statesCount").innerText = visitedStates.size;
  document.getElementById("statesBar").style.width = (visitedStates.size/50*100)+"%";

  document.getElementById("mlbCount").innerText = mlb;
  document.getElementById("mlbBar").style.width = (mlb/30*100)+"%";

  document.getElementById("nflCount").innerText = nfl;
  document.getElementById("nflBar").style.width = (nfl/32*100)+"%";

  document.getElementById("nbaCount").innerText = nba;
  document.getElementById("nbaBar").style.width = (nba/30*100)+"%";

  document.getElementById("nhlCount").innerText = nhl;
  document.getElementById("nhlBar").style.width = (nhl/32*100)+"%";

});

// Filter behavior
checkboxes.forEach(cb=>{
  cb.addEventListener("change", ()=>{
    markers.clearLayers();
    const active = Array.from(checkboxes).filter(c=>c.checked).map(c=>c.value);
    locationsData.features.forEach(feature=>{
      const [lng, lat] = feature.geometry.coordinates;
      const category = getCategory(feature.properties.styleUrl);
      if(!active.includes(category) && !(category!=="city" && category!=="national" && active.includes("sports"))) return;
      const marker = L.marker([lat,lng], {icon:iconByCategory(category)});
      marker.bindPopup(`<b>${feature.properties.name}</b><br>${formatDescription(feature.properties.description)}`);
      markers.addLayer(marker);
    });
  });
});

// Panel toggle
document.getElementById("panel-toggle").addEventListener("click", ()=>{
  document.getElementById("control-panel").classList.toggle("collapsed");
});
