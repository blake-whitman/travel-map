// convert_geojson_to_clean_json.js
const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');

const inputFile = 'locations.geojson';
const outputFile = 'locations_clean.json';
const imagesFolder = 'images';

// Read GeoJSON
const raw = fs.readFileSync(inputFile, 'utf-8');
const geojson = JSON.parse(raw);

const cleaned = geojson.features.map(feature => {
  const props = feature.properties;
  const [lng, lat] = feature.geometry.coordinates;

  // Parse HTML description to extract events and ignore images
  const dom = new JSDOM(props.description?.value || '');
  const doc = dom.window.document;

  // Extract <br>-separated lines
  const lines = Array.from(doc.body.childNodes)
    .map(n => n.textContent.trim())
    .filter(t => t && t !== ''); 

  const events = [];
  for (let line of lines) {
    // Look for lines that match "Event - Name vs Name - MM/DD/YY"
    const match = line.match(/^(.*?)(?: - )?(.*?)(?: - )?(\d{1,2}\/\d{1,2}\/\d{2,4})$/);
    if (match) {
      let [_, stadium, matchName, date] = match;
      // Convert date to YYYY-MM-DD
      const [m, d, y] = date.split('/');
      const fullYear = y.length === 2 ? '20' + y : y;
      events.push({
        date: `${fullYear}-${m.padStart(2,'0')}-${d.padStart(2,'0')}`,
        description: stadium ? `${stadium} - ${matchName}` : matchName
      });
    }
  }

  // Collect image paths from local images folder matching ID
  const idSafe = feature.properties.name.replace(/[^\w]/g,'_');
  const images = fs.readdirSync(imagesFolder)
    .filter(f => f.startsWith(idSafe))
    .map(f => path.join(imagesFolder, f));

  return {
    id: idSafe,
    name: props.name,
    lat,
    lng,
    category: props.category || 'misc',
    league: props.league || null,
    sport: props.sport || null,
    level: props.level || null,
    events,
    images
  };
});

// Write cleaned JSON
fs.writeFileSync(outputFile, JSON.stringify(cleaned, null, 2), 'utf-8');
console.log(`✅ Clean JSON written to ${outputFile}`);
