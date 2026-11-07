// Tests for netlify/functions/ai-search.mjs, with the Anthropic API mocked.
// Run with:  npm test
import { test, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";

import handler, { cleanFilters, buildSystemPrompt } from "../netlify/functions/ai-search.mjs";

const realFetch = globalThis.fetch;
const realKey = process.env.ANTHROPIC_API_KEY;

beforeEach(() => {
  delete process.env.ANTHROPIC_API_KEY;
});
afterEach(() => {
  globalThis.fetch = realFetch;
  if (realKey === undefined) delete process.env.ANTHROPIC_API_KEY;
  else process.env.ANTHROPIC_API_KEY = realKey;
});

const post = (body) =>
  new Request("http://localhost/api/ai-search", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: typeof body === "string" ? body : JSON.stringify(body),
  });

// Pretend Anthropic replied with this text.
const mockAI = (text, status = 200) => {
  const calls = [];
  globalThis.fetch = async (url, options) => {
    calls.push({ url, options });
    return new Response(JSON.stringify({ content: [{ type: "text", text }] }), { status });
  };
  return calls;
};

test("GET reports whether AI is on", async () => {
  let res = await handler(new Request("http://localhost/api/ai-search"));
  assert.deepEqual(await res.json(), { ai_enabled: false });

  process.env.ANTHROPIC_API_KEY = "test-key";
  res = await handler(new Request("http://localhost/api/ai-search"));
  assert.deepEqual(await res.json(), { ai_enabled: true });
});

test("POST without a key -> 503 (page falls back to keywords)", async () => {
  const res = await handler(post({ query: "wheelchair cafe" }));
  assert.equal(res.status, 503);
});

test("other methods -> 405", async () => {
  const res = await handler(new Request("http://localhost/api/ai-search", { method: "DELETE" }));
  assert.equal(res.status, 405);
});

test("bad JSON and empty query -> 400", async () => {
  process.env.ANTHROPIC_API_KEY = "test-key";
  assert.equal((await handler(post("not json"))).status, 400);
  assert.equal((await handler(post({ query: "   " }))).status, 400);
});

test("good AI answer is returned, and the key is sent as a header", async () => {
  process.env.ANTHROPIC_API_KEY = "test-key";
  const calls = mockAI(
    '{"type":"cafe","features":["wheelchair_access","accessible_washroom"],"message":"Showing cafés."}'
  );
  const res = await handler(post({ query: "wheelchair cafe with washroom" }));
  assert.equal(res.status, 200);
  assert.deepEqual(await res.json(), {
    type: "cafe",
    features: ["wheelchair_access", "accessible_washroom"],
    message: "Showing cafés.",
  });
  assert.equal(calls[0].url, "https://api.anthropic.com/v1/messages");
  assert.equal(calls[0].options.headers["x-api-key"], "test-key");
  const sent = JSON.parse(calls[0].options.body);
  assert.equal(sent.messages[0].content, "wheelchair cafe with washroom");
});

test("AI wrapped in extra words still parses", async () => {
  process.env.ANTHROPIC_API_KEY = "test-key";
  mockAI('Sure! Here you go:\n{"type":"park","features":["quiet_space"],"message":"Calm parks."}\nHope it helps.');
  const res = await handler(post({ query: "calm park" }));
  assert.equal((await res.json()).type, "park");
});

test("AI inventing feature keys or types is cleaned up", async () => {
  process.env.ANTHROPIC_API_KEY = "test-key";
  mockAI('{"type":"spaceship","features":["wheelchair_access","teleporter","wheelchair_access"],"message":"x"}');
  const body = await (await handler(post({ query: "anything" }))).json();
  assert.equal(body.type, "");
  assert.deepEqual(body.features, ["wheelchair_access"]);
});

test("API error, garbage reply and network failure -> 502 (page falls back)", async () => {
  process.env.ANTHROPIC_API_KEY = "test-key";

  mockAI("{}", 401);
  assert.equal((await handler(post({ query: "x" }))).status, 502);

  mockAI("sorry, I cannot help with that");
  assert.equal((await handler(post({ query: "x" }))).status, 502);

  globalThis.fetch = async () => {
    throw new Error("network down");
  };
  assert.equal((await handler(post({ query: "x" }))).status, 502);
});

test("very long queries are truncated to 300 characters", async () => {
  process.env.ANTHROPIC_API_KEY = "test-key";
  const calls = mockAI('{"type":null,"features":[],"message":"ok"}');
  await handler(post({ query: "a".repeat(5000) }));
  assert.equal(JSON.parse(calls[0].options.body).messages[0].content.length, 300);
});

test("cleanFilters + system prompt basics", () => {
  assert.deepEqual(cleanFilters(null), { type: "", features: [], message: "" });
  const prompt = buildSystemPrompt();
  assert.match(prompt, /braille_signage/);
  assert.match(prompt, /"hospital"/);
});
