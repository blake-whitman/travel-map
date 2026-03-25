// convert_geojson_with_images.js
const fs = require("fs");
const path = require("path");
const https = require("https");

// Paths
const geojsonPath = path.join(__dirname, "locations.geojson");
const outputPath = path.join(__dirname, "locations_clean.json");
const imagesDir = path.join(__dirname, "images");

// Make sure images directory exists
if (!fs.existsSync(imagesDir)) {
  fs.mkdirSync(imagesDir);
}

// Helper to download an image
function downloadImage(url, filename) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(filename);
    https.get(url, (response) => {
      if (response.statusCode !== 200) {
        file.close();
        fs.unlinkSync(filename);
        return reject(`Failed to download ${url}: ${response.statusCode}`);
      }
      response.pipe(file);
      file.on("finish", () => file.close(resolve));
    }).on("error", (err) => {
      fs.unlinkSync(filename);
      reject(err.message);
    });
  });
}

// Read GeoJSON
const geojson = JSON.parse(fs.readFileSync(geojsonPath, "utf-8"));

// Process features
(async () => {
  const locations = [];
  for (const feature of geojson.features) {
    const props = feature.properties || {};
    const coords = feature.geometry.coordinates || [];

    // Extract events
    let events = [];
    if (props.description) {
      try {
        if (typeof props.description === "string") {
          events.push({ date: "unknown", description: props.description });
        } else if (props.description.value) {
          events.push({ date: "unknown", description: props.description.value });
        }
      } catch (err) {
        console.error(`Error parsing description for ${props.name}`, err);
      }
    }

    // Extract and download images
    let images = [];
    if (props.gx_media_links) {
      const urls = props.gx_media_links.split(" ");
      for (let i = 0; i < urls.length; i++) {
        const url = urls[i];
        const ext = path.extname(url.split("?")[0]) || ".jpg";
        const filename = `${feature.id || props.name.replace(/\W+/g, "_")}_${i + 1}${ext}`;
        const filepath = path.join(imagesDir, filename);
        try {
          await downloadImage(url, filepath);
          images.push(`/images/${filename}`);
          console.log(`Downloaded: ${filename}`);
        } catch (err) {
          console.error(err);
        }
      }
    }

    // Build location object
    locations.push({
      id: feature.id || props.name.replace(/\W+/g, "_").toLowerCase(),
      name: props.name || "Unknown",
      lat: coords[1] || 0,
      lng: coords[0] || 0,
      category: props.category || "misc",  // you'll fix categories manually later
      league: props.league || null,
      sport: props.sport || null,
      level: props.level || null,
      events,
      images
    });
  }

  // Write output JSON
  fs.writeFileSync(outputPath, JSON.stringify(locations, null, 2), "utf-8");
  console.log(`✅ locations_clean.json created with ${locations.length} entries`);
})();
