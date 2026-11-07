/* app.js - the browser logic (what happens when you click things).

   What it does:
   1. Draws the map (Leaflet + OpenStreetMap).
   2. Loads the places from data/places.json.
   3. Builds the filter controls and shows matching places as cards + map pins.
   4. "Ask AI": sends your sentence to the Netlify Function (/api/ai-search).
      If the AI is unavailable, it uses the keyword search from search.js instead.

   No framework, no build step - just plain JavaScript. */

import { FEATURES, PLACE_TYPES } from "./config.js";
import { filterPlaces, keywordParse, describe } from "./search.js";

// Where the map starts. Change these two numbers to center the demo on your own city.
const MAP_CENTER = [31.5204, 74.3587];
const MAP_ZOOM = 12;

const map = L.map("map").setView(MAP_CENTER, MAP_ZOOM);
L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
  maxZoom: 19,
  attribution: "&copy; OpenStreetMap contributors",
}).addTo(map);

const pinLayer = L.layerGroup().addTo(map);
let allPlaces = []; // every place from places.json
let markers = {};   // place id -> map marker

const $ = (id) => document.getElementById(id);

// Make text safe before putting it into HTML.
function esc(text) {
  const div = document.createElement("div");
  div.textContent = String(text);
  return div.innerHTML;
}

/* ---------- Start-up ---------- */

async function init() {
  buildFilters();

  const response = await fetch("data/places.json");
  allPlaces = await response.json();
  showMatching();

  checkAIStatus(); // runs in the background; only updates the header badge
}

// Ask the function whether the AI is switched on (i.e. the API key is set).
async function checkAIStatus() {
  const badge = $("ai-status");
  try {
    const response = await fetch("/api/ai-search");
    const data = await response.json();
    badge.textContent = data.ai_enabled
      ? "✨ AI search: on"
      : "AI search: offline mode (keyword matching)";
  } catch {
    badge.textContent = "AI search: offline mode (keyword matching)";
  }
}

// Build the "type" dropdown and the feature checkboxes.
function buildFilters() {
  const select = $("type-select");
  select.innerHTML = '<option value="">All places</option>';
  for (const [key, label] of Object.entries(PLACE_TYPES)) {
    select.add(new Option(label, key));
  }

  const box = $("feature-checkboxes");
  box.innerHTML = "";
  for (const [key, info] of Object.entries(FEATURES)) {
    const label = document.createElement("label");
    label.innerHTML =
      `<input type="checkbox" value="${esc(key)}"> ` +
      `<span aria-hidden="true">${info.icon}</span> ${esc(info.label)}`;
    box.appendChild(label);
  }

  select.addEventListener("change", showMatching);
  box.addEventListener("change", showMatching);
}

function currentFilters() {
  return {
    type: $("type-select").value,
    features: [...document.querySelectorAll("#feature-checkboxes input:checked")].map(
      (input) => input.value
    ),
  };
}

// Show the understood filters in the controls so the user sees what the AI got.
function applyFiltersToControls(filters) {
  $("type-select").value = filters.type || "";
  document.querySelectorAll("#feature-checkboxes input").forEach((input) => {
    input.checked = filters.features.includes(input.value);
  });
}

// Filter the places using whatever the controls currently say.
function showMatching() {
  const { type, features } = currentFilters();
  render(filterPlaces(allPlaces, type, features));
}

/* ---------- "Ask AI" ---------- */

async function askAI(event) {
  event.preventDefault();
  const query = $("ai-query").value.trim();
  if (!query) return;

  $("ai-message").textContent = "Thinking…";

  let filters;
  let usedAI = false;
  try {
    const response = await fetch("/api/ai-search", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query }),
    });
    if (!response.ok) throw new Error("AI unavailable");
    filters = await response.json();
    usedAI = true;
    filters.message = filters.message || describe(filters.type, filters.features);
  } catch {
    // No API key, no internet, AI error... -> simple keyword matching instead.
    filters = keywordParse(query);
  }

  applyFiltersToControls(filters);
  showMatching();
  $("ai-message").textContent = (usedAI ? "✨ " : "Keyword search: ") + filters.message;
}

/* ---------- Drawing results ---------- */

function render(places) {
  pinLayer.clearLayers();
  markers = {};
  const list = $("results-list");
  list.innerHTML = "";

  $("count").textContent =
    places.length === 1 ? "1 place found" : `${places.length} places found`;

  if (places.length === 0) {
    list.innerHTML =
      '<p class="empty">No place matches all of those needs. Try removing one filter.</p>';
    return;
  }

  const points = [];
  for (const place of places) {
    list.appendChild(buildCard(place));

    const marker = L.marker([place.lat, place.lng], {
      icon: scoreIcon(place),
      title: `${place.name}, accessibility score ${place.score}`,
    })
      .bindPopup(popupHtml(place))
      .addTo(pinLayer);

    markers[place.id] = marker;
    points.push([place.lat, place.lng]);
  }
  map.fitBounds(points, { padding: [50, 50], maxZoom: 15 });
}

// Round pin with the score inside, coloured by score.
function scoreIcon(place) {
  return L.divIcon({
    className: "",
    html: `<div class="pin ${place.label.toLowerCase()}">${place.score}</div>`,
    iconSize: [38, 38],
    iconAnchor: [19, 19],
    popupAnchor: [0, -18],
  });
}

function popupHtml(place) {
  const have = Object.entries(FEATURES)
    .filter(([key]) => place.features[key])
    .map(([, info]) => `${info.icon} ${esc(info.label)}`);
  return (
    `<div class="popup"><h4>${esc(place.name)}</h4>` +
    `<p><strong>${place.score}% - ${esc(place.label)}</strong></p>` +
    `<p>${have.length ? have.join("<br>") : "No accessibility features listed"}</p></div>`
  );
}

function buildCard(place) {
  const card = document.createElement("article");
  card.className = "card";

  // One line per feature: ✓ if available, ✗ (crossed out) if not.
  const featureItems = Object.entries(FEATURES)
    .map(([key, info]) => {
      const yes = place.features[key];
      return (
        `<li class="${yes ? "yes" : "no"}">` +
        `<span aria-hidden="true">${yes ? "✓" : "✗"}</span> ` +
        `<span aria-hidden="true">${info.icon}</span> ${esc(info.label)}` +
        `<span class="sr-only">: ${yes ? "available" : "not available"}</span></li>`
      );
    })
    .join("");

  card.innerHTML =
    `<div class="card-top">` +
    `<div><h3>${esc(place.name)}</h3><span class="type">${esc(PLACE_TYPES[place.type])}</span></div>` +
    `<span class="badge ${place.label.toLowerCase()}">${place.score}% · ${esc(place.label)}</span>` +
    `</div>` +
    `<p class="desc">${esc(place.description)}</p>` +
    `<ul class="features">${featureItems}</ul>` +
    `<button type="button" class="btn">Show on map</button>`;

  card.querySelector("button").addEventListener("click", () => {
    const marker = markers[place.id];
    map.setView(marker.getLatLng(), 16);
    marker.openPopup();
    $("map").scrollIntoView({ behavior: "smooth", block: "nearest" });
  });
  return card;
}

/* ---------- Wire up the page ---------- */

$("ai-form").addEventListener("submit", askAI);
$("reset-btn").addEventListener("click", () => {
  $("ai-query").value = "";
  $("ai-message").textContent = "";
  applyFiltersToControls({ type: "", features: [] });
  showMatching();
});

init().catch(() => {
  $("count").textContent = "Could not load the places. Please refresh the page.";
});
