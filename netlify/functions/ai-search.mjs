/*
  ai-search.mjs - the AI part of AccessMap (a Netlify Function).

  A Netlify Function is a tiny piece of server code that Netlify runs for you
  on demand - no server to manage. This one is reachable at /api/ai-search.

  The problem it solves: people don't think in filters. They say things like
      "I use a wheelchair and need a cafe with an accessible washroom"
      "somewhere calm for my autistic son"
  This function sends that sentence to Claude and gets back filters:
      { type: "cafe", features: ["wheelchair_access", "accessible_washroom"] }

  IMPORTANT design choice: the AI only UNDERSTANDS THE QUESTION. It never
  writes facts about a place. The website filters the real data in
  places.json, so the app can't "hallucinate" a ramp that isn't there.

  Why a function and not the browser? Your ANTHROPIC_API_KEY must stay secret.
  If the browser called Claude directly, anyone could steal the key from the
  page. Here the key lives only in Netlify's environment variables.

  If anything fails (no key, network problem, weird AI answer) this function
  returns an error and the website quietly falls back to keyword search, so
  the demo never breaks.
*/

import { FEATURES, PLACE_TYPES } from "../../public/config.js";

const DEFAULT_MODEL = "claude-haiku-5-5"; // small + fast, plenty for this job
const MAX_QUERY_LENGTH = 300;

// Small helper so every reply is JSON.
function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
  });
}

// Tell Claude exactly what JSON we want back.
export function buildSystemPrompt() {
  const featureLines = Object.entries(FEATURES)
    .map(([key, info]) => `- "${key}": ${info.hint}`)
    .join("\n");
  const typeList = Object.keys(PLACE_TYPES)
    .map((key) => `"${key}"`)
    .join(", ");

  return `You help people with disabilities and health conditions find accessible places.
Turn the user's request into search filters.

Reply with JSON only, no other text, in exactly this shape:
{"type": <one of ${typeList}, or null>,
 "features": [<zero or more feature keys from the list below>],
 "message": "<one short friendly sentence, max 20 words, saying what you are showing>"}

Feature keys:
${featureLines}

Rules:
- Only include features the user needs or clearly implies
  (e.g. "I'm blind" -> braille_signage, "my son gets overwhelmed by noise" -> quiet_space).
- Use null for type if they did not mention a kind of place.
- Never invent feature keys.`;
}

// Never trust the AI's output blindly: keep only keys we actually know.
export function cleanFilters(data) {
  const type = Object.hasOwn(PLACE_TYPES, data?.type) ? data.type : "";
  const features = Array.isArray(data?.features)
    ? [...new Set(data.features.filter((key) => Object.hasOwn(FEATURES, key)))]
    : [];
  const message =
    typeof data?.message === "string" && data.message.trim()
      ? data.message.trim().slice(0, 200)
      : "";
  return { type, features, message };
}

export default async (req) => {
  const apiKey = process.env.ANTHROPIC_API_KEY;

  // GET = "is the AI switched on?" (the page uses this for the header badge)
  if (req.method === "GET") {
    return json({ ai_enabled: Boolean(apiKey) });
  }
  if (req.method !== "POST") {
    return json({ error: "Method not allowed" }, 405);
  }
  if (!apiKey) {
    return json({ error: "no_api_key" }, 503); // page falls back to keyword search
  }

  let query = "";
  try {
    const body = await req.json();
    query = String(body.query ?? "").trim().slice(0, MAX_QUERY_LENGTH);
  } catch {
    return json({ error: "bad_request" }, 400);
  }
  if (!query) {
    return json({ error: "empty_query" }, 400);
  }

  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: process.env.ACCESSMAP_MODEL || DEFAULT_MODEL,
        max_tokens: 300,
        system: buildSystemPrompt(),
        messages: [{ role: "user", content: query }],
      }),
      // Don't make the user wait: after 8 seconds give up and let the page
      // use its keyword fallback instead.
      signal: AbortSignal.timeout(8000),
    });

    if (!response.ok) {
      console.error("[ai-search] Anthropic API error:", response.status);
      return json({ error: "ai_unavailable" }, 502);
    }

    const result = await response.json();
    const text = result.content?.[0]?.text ?? "";
    const match = text.match(/\{[\s\S]*\}/); // first {...} block, in case of extra words
    if (!match) throw new Error("No JSON in AI reply");

    return json(cleanFilters(JSON.parse(match[0])));
  } catch (error) {
    console.error("[ai-search] failed:", error.message);
    return json({ error: "ai_unavailable" }, 502);
  }
};

// Makes the function available at /api/ai-search (instead of the long default URL).
export const config = { path: "/api/ai-search" };
