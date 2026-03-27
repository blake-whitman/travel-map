// convert_to_clean_json_safe.js
const fs = require('fs');
const path = require('path');

const inputFile = path.join(__dirname, 'locations.geojson');
const outputFile = path.join(__dirname, 'locations_clean.json');
const imagesFolder = path.join(__dirname, 'images');

// Helper: find local images by location id
function findLocalImages(id) {
  if (!fs.existsSync(imagesFolder)) return [];
  return fs.readdirSync(imagesFolder)
    .filter(f => f.startsWith(id + "_") && /\.(jpg|jpeg|png|webp)$/i.test(f))
    .map(f => path.join("images", f));
}

// Load original GeoJSON
const rawData = fs.readFileSync(inputFile, 'utf-8');
const geojson = JSON.parse(rawData);

if (!geojson.features || !Array.isArray(geojson.features)) {
  console.error("Invalid GeoJSON: 'features' array missing");
  process.exit(1);
}

// Transform safely
const cleaned = geojson.features.map(f => {
  const id = f.properties.name.replace(/ /g, "_");

  const events = (f.properties.events || []).map(e => ({
    ...e, // keep all original fields
    description: e.description
      ? e.description.replace(/<img[^>]*>/gi, '').trim() // strip only <img> tags
      : e.description // leave undefined if not present
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
    images: findLocalImages(id)
  };
});

// Write clean JSON
fs.writeFileSync(outputFile, JSON.stringify(cleaned, null, 2), 'utf-8');
console.log(`✅ Successfully wrote ${cleaned.length} locations to ${outputFile}`);
