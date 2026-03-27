const fs = require("fs");

// Load your existing JSON (already converted from GeoJSON)
const raw = JSON.parse(fs.readFileSync("locations.json", "utf-8"));

function extractDates(text) {
  if (!text) return [];

  const dates = [];

  // Match formats like 3/14/25 or 03/14/2025
  const slashMatches = text.match(/\b\d{1,2}\/\d{1,2}\/\d{2,4}\b/g);
  if (slashMatches) dates.push(...slashMatches);

  // Match formats like "March 12, 2023"
  const longMatches = text.match(/\b(January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2},\s+\d{4}\b/g);
  if (longMatches) dates.push(...longMatches);

  return dates;
}

function normalizeDate(dateStr) {
  if (!dateStr) return null;

  // Handle MM/DD/YY or MM/DD/YYYY
  if (dateStr.includes("/")) {
    const parts = dateStr.split("/");
    let [m, d, y] = parts;

    if (y.length === 2) {
      y = "20" + y; // assume 20xx
    }

    return `${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
  }

  // Handle "March 12, 2023"
  const parsed = new Date(dateStr);
  if (!isNaN(parsed)) {
    return parsed.toISOString().split("T")[0];
  }

  return null;
}

function cleanEvents(events) {
  if (!events || events.length === 0) return [];

  const cleaned = [];

  events.forEach(e => {
    const desc = e.description || "";

    // Extract dates from messy description
    const foundDates = extractDates(desc);

    if (foundDates.length > 0) {
      foundDates.forEach(d => {
        const normalized = normalizeDate(d);
        if (normalized) {
          cleaned.push({
            date: normalized,
            description: "Visited"
          });
        }
      });
    }
  });

  return cleaned;
}

function cleanImages(images) {
  if (!images) return [];

  return images
    .filter(img =>
      img &&
      !img.includes("mymaps.usercontent") &&
      !img.includes("<img")
    )
    .map(img => img.replace(/^\/+/, "")); // remove leading slash
}

const cleaned = raw.map(loc => ({
  id: loc.id,
  name: loc.name,
  lat: loc.lat,
  lng: loc.lng,

  category: loc.category || "misc",
  league: loc.league || null,
  sport: loc.sport || null,
  level: loc.level || null,

  events: cleanEvents(loc.events),
  images: cleanImages(loc.images)
}));

// Write output
fs.writeFileSync("locations_clean.json", JSON.stringify(cleaned, null, 2));

console.log("✅ locations_clean.json created successfully!");
