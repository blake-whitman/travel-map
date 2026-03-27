// convert_to_clean_json.js
const fs = require('fs');
const path = require('path');

// Paths
const inputFile = path.join(__dirname, 'locations.geojson');
const outputFile = path.join(__dirname, 'locations_clean.json');
const imagesFolder = path.join(__dirname, 'images');

// Helper: find images in images folder matching location id
function findLocalImages(id) {
  if (!fs.existsSync(imagesFolder)) return [];
  return fs.readdirSync(imagesFolder)
    .filter(f => f.startsWith(id + "_") && /\.(jpg|jpeg|png|webp)$/i.test(f))
    .map(f => path.join("images", f)); // relative path for JSON
}

// Load GeoJSON
let rawData;
try {
  rawData = fs.readFileSync(inputFile, 'utf-8');
} catch (err) {
  console.error("Error reading locations.geojson:", err);
  process.exit(1);
}

let geojson;
try {
  geojson = JSON.parse(rawData);
} catch (err) {
  console.error("Error parsing JSON:", err);
  process.exit(1);
}

// Check features exist
if (!geojson.features || !Array.isArray(geojson.features)) {
  console.error("Invalid GeoJSON: 'features' array missing");
  process.exit(1);
}

// Transform each location
const cleaned = geojson.features.map(f => {
  // Generate a consistent id based on name (preserves casing)
  const id = f.properties.name.replace(/ /g, "_");

  // Clean events: remove MyMaps HTML and "unknown" dates
  const events = (f.properties.events || []).map(e => ({
    date: e.date && e.date.toLowerCase() !== 'unknown' ? e.date : null,
    description: e.description
      ? e.description.replace(/<img[^>]*>/gi, '').trim() || "Visited"
      : "Visited"
  }));

  return {
    id,
    name: f.properties.name,
    lat: f.geometry.coordinates[1],
    lng: f.geometry.coordinates[0],
    category: f.properties.category || "misc",
    league: f.properties.league || null,
    sport: f.properties.sport || null,
    level: f.properties.level || null,
    events,
    images: findLocalImages(id) // ✅ auto-populates from images folder
  };
});

// Write output JSON
try {
  fs.writeFileSync(outputFile, JSON.stringify(cleaned, null, 2), 'utf-8');
  console.log(`✅ Successfully wrote ${cleaned.length} locations to ${outputFile}`);
} catch (err) {
  console.error("Error writing cleaned JSON:", err);
  process.exit(1);
}
