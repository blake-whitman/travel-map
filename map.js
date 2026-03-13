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

// Marker cluster group
const markers = L.markerClusterGroup({
  maxClusterRadius: 25,
  disableClusteringAtZoom: 8,
  zoomToBoundsOnClick: true,
  spiderfyOnMaxZoom: false
});

map.addLayer(markers);

// Global dataset reference
let locationsData;

// Category detection
function getCategory(style){

  if(!style) return "city";

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

// Icons
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

  return L.divIcon({
    html:icons[cat] || "📍",
    className:"emoji-marker",
    iconSize:[26,26]
  });

}

// Description formatting
function formatDescription(desc){

  if(!desc) return "";

  if(typeof desc === "string") return desc;

  if(typeof desc === "object"){
    if(desc.value) return desc.value;
    return JSON.stringify(desc);
  }

  return "";

}

// Filters
const checkboxes = document.querySelectorAll(".filter");

// Load GeoJSON data
Promise.all([
  fetch("locations.geojson").then(r => r.json()),
  fetch("us-states.geojson").then(r => r.json())
]).then(([locations, states]) => {

  locationsData = locations;

  const visitedStates = new Set();

  let parks = 0;
  let cities = 0;
  let sports = 0;

  locations.features.forEach(feature => {

    const coords = feature.geometry.coordinates;
    const lng = coords[0];
    const lat = coords[1];

    const props = feature.properties;

    const category = getCategory(props.styleUrl);

    // Count stats
    if(category === "national") parks++;
    else if(category === "city") cities++;
    else sports++;

    const marker = L.marker(
      [lat,lng],
      {icon:iconByCategory(category)}
    );

    const popup = `
      <b>${props.name}</b><br>
      ${formatDescription(props.description)}
    `;

    marker.bindPopup(popup);
    markers.addLayer(marker);

    // Turf state detection
    const point = turf.point([lng,lat]);

    states.features.forEach(state => {
      if(turf.booleanPointInPolygon(point,state)){
        visitedStates.add(state.properties.NAME);
      }
    });

  });

  // Draw state shading
  L.geoJSON(states,{
    style:function(feature){

      const name = feature.properties.NAME;

      if(visitedStates.has(name)){
        return{
          fillColor:"#4da3ff",
          fillOpacity:0.5,
          color:"#4da3ff",
          weight:1
        };
      }

      return{
        fillColor:"#444",
        fillOpacity:0.1,
        color:"#555",
        weight:1
      };

    }
  }).addTo(map);

  // Update stats
  document.getElementById("parksVisited").innerText = parks;
  document.getElementById("citiesVisited").innerText = cities;
  document.getElementById("sportsVisited").innerText = sports;

  const percent = Math.round((visitedStates.size/50)*100);

  document.getElementById("statesVisited").innerText = visitedStates.size;
  document.getElementById("statesPercent").innerText = percent + "% of USA";

});

// Filter behavior
checkboxes.forEach(cb => {

  cb.addEventListener("change", () => {

    markers.clearLayers();

    const active = Array.from(checkboxes)
      .filter(c=>c.checked)
      .map(c=>c.value);

    locationsData.features.forEach(feature => {

      const coords = feature.geometry.coordinates;
      const lng = coords[0];
      const lat = coords[1];

      const props = feature.properties;

      const category = getCategory(props.styleUrl);

      if(!active.includes(category) && !(category !== "city" && category !== "national" && active.includes("sports")))
        return;

      const marker = L.marker(
        [lat,lng],
        {icon:iconByCategory(category)}
      );

      const popup = `
        <b>${props.name}</b><br>
        ${formatDescription(props.description)}
      `;

      marker.bindPopup(popup);
      markers.addLayer(marker);

    });

  });

});
