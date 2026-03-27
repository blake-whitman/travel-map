const fs = require("fs");

// Load GeoJSON
const geo = JSON.parse(fs.readFileSync("locations.geojson", "utf-8"));

// Load list of local images
const imageFiles = fs.readdirSync("images");

// --------------------
// Helpers
// --------------------

function extractDates(text) {
  if (!text) return [];

  const dates = [];

  const slashMatches = text.match(/\b\d{1,2}\/\d{1,2}\/\d{2,4}\b/g);
  if (slashMatches) dates.push(...slashMatches);

  const longMatches = text.match(/\b(January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2},\s+\d{4}\b/g);
  if (longMatches) dates.push(...longMatches);

  return dates;
}

function normalizeDate(dateStr) {
  if (!dateStr) return null;

  if (dateStr.includes("/")) {
    let [m, d, y] = dateStr.split("/");
    if (y.length === 2) y = "20" + y;
    return `${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
  }

  const parsed = new Date(dateStr);
  if (!isNaN(parsed)) return parsed.toISOString().split("T")[0];

  return null;
}

function extractTextDescription(desc) {
  if (!desc) return "";
  if (typeof desc === "string") return desc;
  if (typeof desc === "object" && desc.value) return desc.value;
  return "";
}

function cleanEvents(description) {
  const text = extractTextDescription(description);
  const foundDates = extractDates(text);

  return foundDates
    .map(d => normalizeDate(d))
    .filter(Boolean)
    .map(d => ({
      date: d,
      description: "Visited"
    }));
}

// 🔥 KEY FUNCTION
function findLocalImages(id) {
  return imageFiles
    .filter(file => file.toLowerCase().startsWith(id))
    .map(file => `images/${file}`);
}

// --------------------
// Main transform
// --------------------

const cleaned = geo.features.map(f => {
  const [lng, lat] = f.geometry.coordinates;

  const id = f.properties.name.replace(/ /g, "_");

  return {
    id,
    name: f.properties.name,

    lat,
    lng,

    category: "misc",
    league: null,
    sport: null,
    level: null,

    events: cleanEvents(f.properties.description),

    // ✅ USE LOCAL IMAGES ONLY
    images: findLocalImages(id)
  };
});

// Write output
fs.writeFileSync("locations_clean.json", JSON.stringify(cleaned, null, 2));

console.log("✅ locations_clean.json created with LOCAL images!");
