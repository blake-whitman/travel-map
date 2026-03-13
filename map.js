// =============================
// MAP INITIALIZATION
// =============================

const map = L.map("map").setView([39.5, -98.35], 4);

L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
  maxZoom: 18,
  attribution: "© OpenStreetMap"
}).addTo(map);


// =============================
// COLORS
// =============================

const STATE_COLOR = "#4da3ff";
const TERRITORY_COLOR = "#f5b942";
const COUNTRY_COLOR = "#3fbf7f";


// =============================
// VISITED TRACKING
// =============================

let visitedStates = new Set();
let visitedTerritories = new Set();
let visitedCountries = new Set();


// =============================
// MARKERS DATA
// (replace with your real dataset)
// =============================

const locations = [
  // Example structure
  // {name:"New York", lat:40.7128, lng:-74.0060, type:"city"}
];


// =============================
// LOAD STATES
// =============================

let statesLayer;

fetch("data/us-states.geojson")
  .then(res => res.json())
  .then(data => {

    statesLayer = L.geoJSON(data, {
      style: stateStyle
    }).addTo(map);

    detectVisitedStates(data);

});

function stateStyle(feature){

  const name = feature.properties.name;

  if (visitedStates.has(name)){
    return {
      color: STATE_COLOR,
      weight: 1,
      fillColor: STATE_COLOR,
      fillOpacity: 0.6
    };
  }

  return {
    color:"#555",
    weight:1,
    fillOpacity:0
  };
}


// =============================
// LOAD TERRITORIES
// =============================

let territoriesLayer;

fetch("data/us-territories.geojson")
  .then(res => res.json())
  .then(data => {

    territoriesLayer = L.geoJSON(data, {
      style: territoryStyle
    }).addTo(map);

    detectVisitedTerritories(data);

});

function territoryStyle(feature){

  const name = feature.properties.name;

  if (visitedTerritories.has(name)){
    return {
      color: TERRITORY_COLOR,
      weight: 1,
      fillColor: TERRITORY_COLOR,
      fillOpacity: 0.6
    };
  }

  return {
    color:"#555",
    weight:1,
    fillOpacity:0
  };
}


// =============================
// LOAD COUNTRIES
// =============================

let countriesLayer;

fetch("data/countries.geojson")
  .then(res => res.json())
  .then(data => {

    countriesLayer = L.geoJSON(data, {
      style: countryStyle
    }).addTo(map);

    detectVisitedCountries(data);

});

function countryStyle(feature){

  const name = feature.properties.ADMIN || feature.properties.name;

  if(name === "United States of America"){
    return {
      color:"#555",
      weight:1,
      fillOpacity:0
    };
  }

  if (visitedCountries.has(name)){
    return {
      color: COUNTRY_COLOR,
      weight: 1,
      fillColor: COUNTRY_COLOR,
      fillOpacity: 0.6
    };
  }

  return {
    color:"#555",
    weight:1,
    fillOpacity:0
  };
}


// =============================
// DETECT VISITED STATES
// =============================

function detectVisitedStates(data){

  locations.forEach(loc => {

    const point = turf.point([loc.lng, loc.lat]);

    data.features.forEach(feature => {

      if(turf.booleanPointInPolygon(point, feature)){

        const name = feature.properties.name;

        if(name !== "Puerto Rico"){
          visitedStates.add(name);
        }

      }

    });

  });

  if(statesLayer){
    statesLayer.setStyle(stateStyle);
  }

  updateStats();
}


// =============================
// DETECT VISITED TERRITORIES
// =============================

function detectVisitedTerritories(data){

  locations.forEach(loc => {

    const point = turf.point([loc.lng, loc.lat]);

    data.features.forEach(feature => {

      if(turf.booleanPointInPolygon(point, feature)){
        visitedTerritories.add(feature.properties.name);
      }

    });

  });

  if(territoriesLayer){
    territoriesLayer.setStyle(territoryStyle);
  }

  updateStats();
}


// =============================
// DETECT VISITED COUNTRIES
// =============================

function detectVisitedCountries(data){

  locations.forEach(loc => {

    const point = turf.point([loc.lng, loc.lat]);

    data.features.forEach(feature => {

      if(turf.booleanPointInPolygon(point, feature)){

        const name = feature.properties.ADMIN || feature.properties.name;

        visitedCountries.add(name);

      }

    });

  });

  if(countriesLayer){
    countriesLayer.setStyle(countryStyle);
  }

  updateStats();
}


// =============================
// STATS UPDATE
// =============================

function updateStats(){

  const statesEl = document.getElementById("states-count");
  const territoriesEl = document.getElementById("territories-count");
  const countriesEl = document.getElementById("countries-count");

  if(statesEl){
    statesEl.textContent = visitedStates.size + "/50";
  }

  if(territoriesEl){
    territoriesEl.textContent = visitedTerritories.size + "/5";
  }

  if(countriesEl){
    countriesEl.textContent = visitedCountries.size;
  }

}


// =============================
// MARKER RENDERING
// =============================

locations.forEach(loc => {

  const marker = L.marker([loc.lat, loc.lng]).addTo(map);

  marker.bindPopup(loc.name);

});
