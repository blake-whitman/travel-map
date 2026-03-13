// Initialize map
const map = L.map('map', { zoomSnap: 0.5, zoomDelta: 0.75, wheelPxPerZoomLevel: 120 })
  .setView([39.8283, -98.5795], 4);

// Dark map tiles
L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
  attribution: '&copy; OpenStreetMap & Carto'
}).addTo(map);

// Marker cluster
const markers = L.markerClusterGroup({ maxClusterRadius: 25, disableClusteringAtZoom: 8 });
map.addLayer(markers);

// Global dataset reference
let locationsData;

// Category helper
function getCategory(style){
  const categories = {
    "#icon-1720-0288D1":"national", "#icon-1519-0288D1":"baseball", "#icon-1520-0288D1":"basketball",
    "#icon-1579-0288D1":"football", "#icon-1805-0288D1":"hockey",
    "#icon-1696-0288D1":"soccer", "#icon-1707-0288D1":"tennis"
  };
  return categories[style] || "city";
}

// Icons
function iconByCategory(cat){
  const icons={ city:"🏙", national:"🌲", baseball:"⚾", basketball:"🏀", football:"🏈", hockey:"🏒", soccer:"⚽", tennis:"🎾", airport:"✈"};
  return L.divIcon({ html: icons[cat]||"📍", className:"emoji-marker", iconSize:[26,26] });
}

// Description formatting
function formatDescription(desc){
  if(!desc) return "";
  if(typeof desc==="string") return desc;
  if(typeof desc==="object") return desc.value || JSON.stringify(desc);
  return "";
}

// Toggle panel
const panel = document.getElementById("control-panel");
document.getElementById("togglePanel").addEventListener("click",()=>panel.classList.toggle("collapsed"));

// Load GeoJSON
Promise.all([
  fetch("locations.geojson").then(r=>r.json()),
  fetch("us-states.geojson").then(r=>r.json())
]).then(([locations, states]) => {
  locationsData = locations;
  const visitedStates = new Set();
  let mlb=0,nfl=0,nba=0,nhl=0,parks=0,cities=0,sports=0;

  locations.features.forEach(f=>{
    const [lng,lat] = f.geometry.coordinates;
    const cat = getCategory(f.properties.styleUrl);

    if(cat==="national") parks++;
    else if(cat==="city") cities++;
    else sports++;

    if(cat==="baseball") mlb++;
    if(cat==="football") nfl++;
    if(cat==="basketball") nba++;
    if(cat==="hockey") nhl++;

    const marker = L.marker([lat,lng],{icon:iconByCategory(cat)});
    marker.bindPopup(`<b>${f.properties.name}</b><br>${formatDescription(f.properties.description)}`);
    markers.addLayer(marker);

    const point = turf.point([lng,lat]);
    states.features.forEach(s=>{
      if(turf.booleanPointInPolygon(point,s)) visitedStates.add(s.properties.NAME);
    });
  });

  // Draw states
  L.geoJSON(states,{style:f=>{
    return visitedStates.has(f.properties.NAME)?
      {fillColor:"#4da3ff",fillOpacity:0.5,color:"#4da3ff",weight:1}:
      {fillColor:"#444",fillOpacity:0.1,color:"#555",weight:1};
  }}).addTo(map);

  // Update stats
  document.getElementById("statesVisited").innerText = visitedStates.size;
  document.getElementById("citiesVisited").innerText = cities;
  document.getElementById("parksVisited").innerText = parks;
  document.getElementById("sportsVisited").innerText = sports;

  // Progress bars
  document.getElementById("statesBar").style.width = (visitedStates.size/50*100)+"%";
  document.getElementById("statesCount").innerText = visitedStates.size;

  document.getElementById("mlbBar").style.width = (mlb/30*100)+"%";
  document.getElementById("mlbCount").innerText = mlb;

  document.getElementById("nflBar").style.width = (nfl/32*100)+"%";
  document.getElementById("nflCount").innerText = nfl;

  document.getElementById("nbaBar").style.width = (nba/30*100)+"%";
  document.getElementById("nbaCount").innerText = nba;

  document.getElementById("nhlBar").style.width = (nhl/32*100)+"%";
  document.getElementById("nhlCount").innerText = nhl;
});

// Filters
document.querySelectorAll(".filter").forEach(cb=>{
  cb.addEventListener("change",()=>{
    markers.clearLayers();
    const active = Array.from(document.querySelectorAll(".filter"))
      .filter(c=>c.checked)
      .map(c=>c.value);

    locationsData.features.forEach(f=>{
      const [lng,lat] = f.geometry.coordinates;
      const cat = getCategory(f.properties.styleUrl);
      if(!active.includes(cat) && !(cat!=="city" && cat!=="national" && active.includes("sports"))) return;

      const marker = L.marker([lat,lat],{icon:iconByCategory(cat)});
      marker.bindPopup(`<b>${f.properties.name}</b><br>${formatDescription(f.properties.description)}`);
      markers.addLayer(marker);
    });
  });
});
