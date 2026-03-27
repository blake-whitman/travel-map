const fs = require("fs");

// Load GeoJSON
const geo = JSON.parse(fs.readFileSync("locations.geojson", "utf-8"));

function extractDates(text) {
  if (!text) return [];

  const dates = [];

  // 3/14/25 or 03/14/2025
  const slashMatches = text.match(/\b\d{1,2}\/\d{1,2}\/\d{2,4}\b/g);
  if (slashMatches) dates.push(...slashMatches);

  // March 12, 2023
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
  if (!isNaN(parsed)) {
    return parsed.toISOString().split("T")[0];
  }

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

function extractImages(feature) {
  // Prefer gx_media_links if present
  if (feature.properties.gx_media_links) {
    return feature.properties.gx_media_links
      .split(" ")
      .filter(Boolean)
      .filter(url => !url.includes("mymaps.usercontent")); // remove bad ones
  }

  return [];
}

function cleanLocalImages(images) {
  return (images || [])
    .filter(img => img && !img.includes("mymaps.usercontent"))
    .map(img => img.replace(/^\/+/, "")); // remove leading slash
}

const cleaned = geo.features.map(f => {
  const [lng, lat] = f.geometry.coordinates;

  return {
    id: f.properties.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/^_|_$/g, ""),

    name: f.properties.name,

    lat,
    lng,

    category: "misc",   // you will fix later
    league: null,
    sport: null,
    level: null,

    events: cleanEvents(f.properties.description),

    images: cleanLocalImages(
      extractImages(f)
    )
  };
});

// Write output
fs.writeFileSync("locations_clean.json", JSON.stringify(cleaned, null, 2));

console.log("✅ locations_clean.json created from GeoJSON!");
