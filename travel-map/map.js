// Initialize map
const map = L.map('map').setView([39.8283, -98.5795], 4); // Center of USA

// Add tile layer
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  attribution: '&copy; OpenStreetMap contributors'
}).addTo(map);

// Load GeoJSON data
fetch('locations.geojson')
  .then(res => res.json())
  .then(data => {
    const markers = L.layerGroup().addTo(map);

    let statesVisited = new Set();
    let citiesVisited = new Set();
    let parksVisited = 0;
    let sportsVisited = 0;

    function iconByCategory(cat) {
      const icons = {
        city: '🏙',
        national: '🌲',
        sports: '🏟',
        airport: '✈'
      };
      return L.divIcon({
        html: icons[cat] || '📍',
        className: 'custom-marker',
        iconSize: [30, 30]
      });
    }

    function countStats(feature) {
      const cat = feature.properties.category;
      if (cat === 'city') citiesVisited.add(feature.properties.name);
      if (cat === 'national') parksVisited++;
      if (cat === 'sports') sportsVisited++;
      statesVisited.add(feature.properties.state || ''); // optional state property
    }

    data.features.forEach(feature => {
      countStats(feature);
      const marker = L.marker(
        [feature.geometry.coordinates[1], feature.geometry.coordinates[0]],
        {icon: iconByCategory(feature.properties.category)}
      ).addTo(markers);

      let popupContent = `<strong>${feature.properties.name}</strong><br>`;
      if (feature.properties.visited) popupContent += `Visited: ${feature.properties.visited}<br>`;
      if (feature.properties.notes) popupContent += `<p>${feature.properties.notes}</p>`;
      marker.bindPopup(popupContent);
    });

    document.getElementById('statesVisited').innerText = statesVisited.size;
    document.getElementById('citiesVisited').innerText = citiesVisited.size;
    document.getElementById('parksVisited').innerText = parksVisited;
    document.getElementById('sportsVisited').innerText = sportsVisited;

    // Filter checkboxes
    const checkboxes = document.querySelectorAll('.filter');
    checkboxes.forEach(cb => cb.addEventListener('change', () => {
      markers.clearLayers();
      const activeCats = Array.from(checkboxes).filter(c => c.checked).map(c => c.value);
      data.features.forEach(feature => {
        if (!activeCats.includes(feature.properties.category)) return;
        const marker = L.marker(
          [feature.geometry.coordinates[1], feature.geometry.coordinates[0]],
          {icon: iconByCategory(feature.properties.category)}
        ).addTo(markers);
        let popupContent = `<strong>${feature.properties.name}</strong><br>`;
        if (feature.properties.visited) popupContent += `Visited: ${feature.properties.visited}<br>`;
        if (feature.properties.notes) popupContent += `<p>${feature.properties.notes}</p>`;
        marker.bindPopup(popupContent);
      });
    }));
  });
