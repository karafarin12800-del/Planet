import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const source = await readFile(new URL("../services/image-generation-worker/index.js", import.meta.url), "utf8");
const moduleUrl = "data:text/javascript;base64," + Buffer.from(source).toString("base64");
const { default: worker } = await import(moduleUrl);

const bucket = new Map();
const env = {
  OPENAI_API_KEY: "test-provider-key",
  PLANET_ACCESS_CODE: "test-access-code",
  OPENAI_IMAGE_MODEL: "test-image-model",
  ORGANISM_IMAGES: {
    async get(key) {
      const value = bucket.get(key);
      return value ? { text: async () => value, customMetadata: { model: "test-image-model" } } : null;
    },
    async put(key, value) { bucket.set(key, value); }
  }
};
let providerCalls = 0;
const originalFetch = globalThis.fetch;
globalThis.fetch = async (url, options) => {
  providerCalls++;
  assert.equal(url, "https://api.openai.com/v1/images/generations");
  assert.equal(options.headers.Authorization, "Bearer test-provider-key");
  const payload = JSON.parse(options.body);
  assert.equal(payload.model, "test-image-model");
  return new Response(JSON.stringify({ data: [{ b64_json: "aGVsbG8=" }] }), {
    status: 200, headers: { "Content-Type": "application/json" }
  });
};

const request = (path, init = {}) => new Request("https://worker.test" + path, {
  ...init,
  headers: { Origin: "https://karafarin12800-del.github.io", ...(init.headers || {}) }
});
const json = async response => response.json();

try {
  const health = await json(await worker.fetch(request("/health"), env));
  assert.equal(health.configured, true);
  assert.equal(health.persistentCacheAvailable, true);
  assert.equal(health.providerKeyPresent, true);

  const deniedOrigin = await worker.fetch(new Request("https://worker.test/health", {
    headers: { Origin: "https://attacker.invalid" }
  }), env);
  assert.equal(deniedOrigin.status, 403, "unlisted origins are rejected");

  const missingConfig = await worker.fetch(request("/generate", { method: "POST" }), {});
  assert.equal(missingConfig.status, 503, "missing provider, access code or R2 fails closed");

  const unauthorized = await worker.fetch(request("/generate", {
    method: "POST", headers: { "Content-Type": "application/json", "X-Planet-Access-Code": "wrong" },
    body: JSON.stringify({ prompt: "creature", genome: "ACGT" })
  }), env);
  assert.equal(unauthorized.status, 401, "incorrect access code is rejected");

  const invalidGenome = await worker.fetch(request("/generate", {
    method: "POST", headers: { "Content-Type": "application/json", "X-Planet-Access-Code": "test-access-code" },
    body: JSON.stringify({ prompt: "creature", genome: "NOT-DNA" })
  }), env);
  assert.equal(invalidGenome.status, 400, "invalid synthetic genomes are rejected");

  const payload = {
    prompt: "A complete original alien organism, full body, two arms and two legs.",
    genome: "ACGTACGTACGT",
    cacheIdentity: "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
    planetId: "world-a"
  };
  const headers = { "Content-Type": "application/json", "X-Planet-Access-Code": "test-access-code" };
  const first = await worker.fetch(request("/generate", { method: "POST", headers, body: JSON.stringify(payload) }), env);
  assert.equal(first.status, 200);
  const firstData = await json(first);
  assert.equal(firstData.imageBase64, "aGVsbG8=");
  assert.equal(firstData.cached, false);
  assert.equal(firstData.provenance, "image-model-generated; conditioned on user-supplied digital phenotype prompt");
  assert.equal(providerCalls, 1);

  const cached = await worker.fetch(request("/generate", { method: "POST", headers, body: JSON.stringify(payload) }), env);
  assert.equal(cached.status, 200);
  const cachedData = await json(cached);
  assert.equal(cachedData.cached, true, "same planet/genome identity reuses the persistent image");
  assert.equal(providerCalls, 1, "cache hits do not incur another provider request");

  const alternatePrompt = { ...payload, prompt: "A branching filament organism with no animal torso or limbs." };
  const promptVariation = await worker.fetch(request("/generate", { method: "POST", headers, body: JSON.stringify(alternatePrompt) }), env);
  assert.equal(promptVariation.status, 200);
  assert.equal((await json(promptVariation)).cached, false, "changed morphology prompt cannot reuse the old image");
  assert.equal(providerCalls, 2);

  const otherPlanet = { ...payload, cacheIdentity: "bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb", planetId: "world-b" };
  const secondPlanet = await worker.fetch(request("/generate", { method: "POST", headers, body: JSON.stringify(otherPlanet) }), env);
  assert.equal(secondPlanet.status, 200);
  assert.equal((await json(secondPlanet)).cached, false, "same genome on another planet gets a distinct cache entry");
  assert.equal(providerCalls, 3);
  assert.equal(bucket.size, 3, "different prompts and planet identities are stored separately");

  console.log("PLANET image Worker runtime tests passed: health, origin allowlist, fail-closed config, auth, genome validation, provider request and planet-specific R2 cache.");
} finally {
  globalThis.fetch = originalFetch;
}
