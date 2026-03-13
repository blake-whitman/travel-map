// Initialize map
const map = L.map('map').setView([39.8283, -98.5795], 4);

// Dark map style
L.tileLayer(
'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
{ attribution: '&copy; OpenStreetMap & Carto' }
).addTo(map);

// Cluster group
const markers = L.markerClusterGroup({
  maxClusterRadius: 40
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

// Load data
fetch("locations.geojson")
.then(res => res.json())
.then(data => {

  let parks = 0;
  let cities = 0;
  let sports = 0;

  data.features.forEach(feature => {

    const coords = feature.geometry.coordinates;

    const lng = coords[0];
    const lat = coords[1];

    const props = feature.properties;

    const category = getCategory(props.name);

    if(category === "national") parks++;
    if(category === "city") cities++;
    if(category !== "city" && category !== "national") sports++;

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

  // Update stats
  document.getElementById("parksVisited").innerText = parks;
  document.getElementById("citiesVisited").innerText = cities;
  document.getElementById("sportsVisited").innerText = sports;

});
