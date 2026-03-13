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

// Cluster group
const markers = L.markerClusterGroup({

  maxClusterRadius: 25,

  disableClusteringAtZoom: 8,

  zoomToBoundsOnClick: true,

  spiderfyOnMaxZoom: false

});

map.addLayer(markers);

// Category detection
function getCategory(style) {

  if (!style) return "other";

  const categories = {

    "#icon-1720-0288D1": "national",   // national parks
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
    city: "🏙",
    national: "🌲",
    baseball: "⚾",
    basketball: "🏀",
    football: "🏈",
    hockey: "🏒",
    soccer: "⚽",
    tennis: "🎾",
    airport: "✈"
  };

  return L.divIcon({
    html: icons[cat] || "📍",
    className: "emoji-marker",
    iconSize: [26,26]
  });

}

// Fix description formatting
function formatDescription(desc){

  if(!desc) return "";

  if(typeof desc === "string") return desc;

  if(typeof desc === "object"){

    if(desc.value) return desc.value;

    return JSON.stringify(desc);

  }

  return "";

}

const checkboxes = document.querySelectorAll(".filter");

async function getStateFromCoords(lat, lng){

  const url = `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`;

  try{

    const res = await fetch(url);
    const data = await res.json();

    return data.address.state;

  }catch{
    return null;
  }

}

// Load data
Promise.all([
  fetch("locations.geojson").then(res => res.json()),
  fetch("us-states.geojson").then(res => res.json())
]).then(([locations, states]) => {

  const visitedStates = new Set();

  locations.features.forEach(feature => {

    const coords = feature.geometry.coordinates;
    const lng = coords[0];
    const lat = coords[1];

    const props = feature.properties;

    const category = getCategory(props.styleUrl);

    const marker = L.marker(
      [lat,lng],
      { icon: iconByCategory(category) }
    );

    const popup = `
      <b>${props.name}</b><br>
      ${formatDescription(props.description)}
    `;

    marker.bindPopup(popup);

    markers.addLayer(marker);

    // Create point for turf
    const point = turf.point([lng, lat]);

    states.features.forEach(state => {

      if(turf.booleanPointInPolygon(point, state)){

        visitedStates.add(state.properties.NAME);

      }

    });

  });

  // Draw states layer
  L.geoJSON(states, {

    style: function(feature){

      const name = feature.properties.NAME;

      if(visitedStates.has(name)){

        return {
          fillColor: "#4da3ff",
          fillOpacity: 0.5,
          color: "#4da3ff",
          weight: 1
        };

      }

      return {
        fillColor: "#444",
        fillOpacity: 0.1,
        color: "#555",
        weight: 1
      };

    }

  }).addTo(map);

  // Update stat
  document.getElementById("statesVisited").innerText = visitedStates.size;

});

document.getElementById("parksVisited").innerText = parks;
document.getElementById("citiesVisited").innerText = cities;
document.getElementById("sportsVisited").innerText = sports;

  checkboxes.forEach(cb => {

  cb.addEventListener("change", () => {

    markers.clearLayers();

    const active = Array.from(checkboxes)
      .filter(c => c.checked)
      .map(c => c.value);
    
    let parks = 0;
    let cities = 0;
    let sports = 0;
    
    locations.features.forEach(feature => {

      const coords = feature.geometry.coordinates;
      const lng = coords[0];
      const lat = coords[1];
      const props = feature.properties;

      const category = getCategory(props.styleUrl);

      if(category === "national") parks++;
      else if(category === "city") cities++;
      else sports++;

      if(!active.includes(category) && !(category !== "city" && category !== "national" && active.includes("sports")))
        return;

      const marker = L.marker(
        [lat,lng],
        { icon: iconByCategory(category) }
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

document.getElementById("parksVisited").innerText = parks;
document.getElementById("citiesVisited").innerText = cities;
document.getElementById("sportsVisited").innerText = sports;

const percent = Math.round((visitedStates.size / 50) * 100);

document.getElementById("statesVisited").innerText = visitedStates.size;
document.getElementById("statesPercent").innerText = percent + "% of USA";
