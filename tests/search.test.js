// Tests for public/search.js. Run with:  npm test
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import { FEATURES } from "../public/config.js";
import { accessibilityScore, scoreLabel, filterPlaces, keywordParse } from "../public/search.js";

const places = JSON.parse(readFileSync(new URL("../public/data/places.json", import.meta.url)));

test("every place has a value for every known feature", () => {
  for (const place of places) {
    for (const key of Object.keys(FEATURES)) {
      assert.equal(typeof place.features[key], "boolean", `${place.name} is missing ${key}`);
    }
  }
});

test("score: all features = 100, none = 0", () => {
  const all = Object.fromEntries(Object.keys(FEATURES).map((k) => [k, true]));
  const none = Object.fromEntries(Object.keys(FEATURES).map((k) => [k, false]));
  assert.equal(accessibilityScore(all), 100);
  assert.equal(accessibilityScore(none), 0);
});

test("score labels", () => {
  assert.equal(scoreLabel(86), "Great");
  assert.equal(scoreLabel(57), "Fair");
  assert.equal(scoreLabel(14), "Limited");
});

test("filter: cafe + accessible washroom -> only Sunrise Café", () => {
  const result = filterPlaces(places, "cafe", ["accessible_washroom"]);
  assert.deepEqual(result.map((p) => p.name), ["Sunrise Café"]);
});

test("filter: no filters returns everything, best score first", () => {
  const result = filterPlaces(places, "", []);
  assert.equal(result.length, places.length);
  assert.equal(result[0].name, "City Care Hospital");
  for (let i = 1; i < result.length; i++) assert.ok(result[i - 1].score >= result[i].score);
});

test("filter: impossible combination returns nothing", () => {
  assert.equal(filterPlaces(places, "park", ["braille_signage"]).length, 0);
});

test("keyword search understands the demo sentences", () => {
  const a = keywordParse("I use a wheelchair and need a cafe with an accessible washroom");
  assert.equal(a.type, "cafe");
  assert.deepEqual(a.features, ["wheelchair_access", "accessible_washroom"]);

  const b = keywordParse("I'm blind, where can I eat out?");
  assert.equal(b.type, "restaurant");
  assert.deepEqual(b.features, ["braille_signage"]);

  const c = keywordParse("Somewhere calm for my autistic son, like a park");
  assert.equal(c.type, "park");
  assert.deepEqual(c.features, ["quiet_space"]);

  const d = keywordParse("hello");
  assert.equal(d.type, "");
  assert.deepEqual(d.features, []);
});
