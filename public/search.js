/*
  search.js - the "data brain" (runs in the browser).

  What it does, in plain words:
    1. accessibilityScore -> works out a score from 0 to 100 for a place
    2. filterPlaces       -> keeps only the places that match the filters
    3. keywordParse       -> the offline "understand a sentence" helper, used
                             whenever the AI is not available

  No AI in this file. It is plain JavaScript, so the facts about a place
  always come from places.json and are never made up.
*/

import { FEATURES, PLACE_TYPES, TYPE_PATTERNS } from "./config.js";

// Score = share of tracked features the place has (e.g. 5 of 7 -> 71).
export function accessibilityScore(features) {
  const have = Object.keys(FEATURES).filter((key) => features[key]).length;
  return Math.round((100 * have) / Object.keys(FEATURES).length);
}

// Turn a score into a simple word.
export function scoreLabel(score) {
  if (score >= 80) return "Great";
  if (score >= 50) return "Fair";
  return "Limited";
}

// Keep places that match ALL the filters, best score first.
//   placeType : e.g. "cafe" (or "" / null for any type)
//   required  : feature keys the place MUST have, e.g. ["accessible_washroom"]
export function filterPlaces(places, placeType, required = []) {
  return places
    .filter((place) => !placeType || place.type === placeType)
    .filter((place) => required.every((key) => place.features[key]))
    .map((place) => {
      const score = accessibilityScore(place.features);
      return { ...place, score, label: scoreLabel(score) };
    })
    .sort((a, b) => b.score - a.score || a.name.localeCompare(b.name));
}

// Offline "understanding": look for known words in the sentence.
export function keywordParse(query) {
  const text = query.toLowerCase();
  const type =
    Object.keys(TYPE_PATTERNS).find((key) => new RegExp(TYPE_PATTERNS[key]).test(text)) || "";
  const features = Object.keys(FEATURES).filter((key) =>
    new RegExp(FEATURES[key].pattern).test(text)
  );
  return { type, features, message: describe(type, features) };
}

// A friendly sentence that says what we are showing.
export function describe(type, features) {
  if (!type && features.length === 0) {
    return "Showing all places. Try mentioning what you need, like 'wheelchair' or 'quiet'.";
  }
  const where = type ? `results for ${PLACE_TYPES[type]}` : "all places";
  if (features.length === 0) return `Showing ${where}.`;
  const needs = features.map((key) => FEATURES[key].label.toLowerCase()).join(", ");
  return `Showing ${where} with: ${needs}.`;
}
