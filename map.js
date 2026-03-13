// Create map
const map = L.map('map').setView([39.8283, -98.5795], 4);

// Dark basemap (closer to the mockup design)
L.tileLayer(
  'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
  {
    attribution: '&copy; OpenStreetMap & Carto'
  }
).addTo(map);

// Marker layer
const markers = L.layerGroup().addTo(map);

// Determine category from styleUrl
function getCategory(style) {

  if (!style) return "other";

  if (style.includes("1720")) return "national";   // parks
  if (style.includes("1739")) return "sports";     // sports
  if (style.includes("airport")) return "airport";
  
  return "city";
}

// Emoji icons
function iconByCategory(cat) {

  const icons = {
    city: "🏙",
    national: "🌲",
    baseball: "⚾",
    basketball: "🏀",
    football: "🏈",
    hockey: "🏒",
    soccer: "⚽",
    tennis: "🎾",
    airport: "✈",
    other: "📍"
  };

  return L.divIcon({
    html: icons[cat] || "📍",
    className: "emoji-marker",
    iconSize: [28,28]
  });
}

function formatDescription(desc) {

  if (!desc) return "";

  if (typeof desc === "string") return desc;

  if (typeof desc === "object") {

    if (desc.value) return desc.value;

    return JSON.stringify(desc);
  }

  return "";
}

// Load GeoJSON
fetch("locations.geojson")
.then(res => res.json())
.then(data => {

  let parksVisited = 0;
  let sportsVisited = 0;
  let citiesVisited = 0;

  const statesVisited = new Set();

  function drawMarkers(activeCats) {

    markers.clearLayers();

    data.features.forEach(feature => {

      const coords = feature.geometry.coordinates;

      const lat = coords[1];
      const lng = coords[0];

      const props = feature.properties;

      const category = getCategory(props.styleUrl);

      if (!activeCats.includes(category)) return;

      const marker = L.marker(
        [lat,lng],
        {icon: iconByCategory(category)}
      ).addTo(markers);

      const popup = `
<b>${props.name}</b><br>
${formatDescription(props.description)}
`;

      marker.bindPopup(popup);
    });
  }

  // Count stats
  data.features.forEach(feature => {

    const cat = getCategory(feature.properties.styleUrl);

    if (cat === "national") parksVisited++;
    if (cat === "sports") sportsVisited++;
    if (cat === "city") citiesVisited++;

  });

  document.getElementById("parksVisited").innerText = parksVisited;
  document.getElementById("sportsVisited").innerText = sportsVisited;
  document.getElementById("citiesVisited").innerText = citiesVisited;

  // Initial draw
  drawMarkers(["city","national","sports","airport"]);

  // Filters
  const checkboxes = document.querySelectorAll(".filter");

  checkboxes.forEach(cb => {

    cb.addEventListener("change", () => {

      const active = Array.from(checkboxes)
        .filter(c => c.checked)
        .map(c => c.value);

      drawMarkers(active);

    });

  });

});
