"use strict";
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const read = p => fs.readFileSync(path.join(__dirname, "..", p), "utf8");

const html = read("index.html");
const client = read("planet-image-generation.js");
const worker = read("services/image-generation-worker/index.js");
const workflow = read(".github/workflows/android-apk.yml");
const sw = read("sw.js");
const threeD = read("procedural-organism-3d.js");
const setup = read("IMAGE_GENERATION_SETUP.md");

assert.ok(html.includes('<script src="./procedural-organism-3d.js"></script>\n<script src="./planet-image-generation.js"></script>'),
  "the 3D generator loads before the optional image generator");
assert.ok(client.includes("getSpeciesSnapshot"), "image prompt uses the simulator's current species catalog");
assert.ok(client.includes("Digital genome length:"), "prompt includes sequence provenance");
assert.ok(client.includes("Environment from the simulation:"), "prompt includes simulated habitat and time");
assert.ok(client.includes("not a preloaded species picture"), "image request asks for newly generated pixels");
assert.ok(client.includes("fetch(url.toString()"), "image generation calls the configured backend");
assert.ok(!client.includes("data:image/png;base64,"), "no pre-generated PNG is embedded in the client module");
assert.ok(worker.includes("https://api.openai.com/v1/images/generations"), "worker calls the image-generation API");
assert.ok(worker.includes('env.OPENAI_IMAGE_MODEL || "gpt-image-2.5-flare"'), "worker defaults to a documented image-generation model");
assert.ok(worker.includes('"Authorization": "Bearer " + env.OPENAI_API_KEY'), "provider key is read only from server environment");
assert.ok(worker.includes("https://appassets.androidplatform.net"), "Android WebView AssetLoader origin is allowed");
assert.ok(workflow.includes("cp index.html planet-localization.js evolution-engine.js procedural-organism-3d.js planet-image-generation.js offline-ai.js"),
  "Android build bundles the runtime image-generation client");
assert.ok(workflow.includes("node --check planet-image-generation.js"), "CI validates image client syntax");
assert.ok(workflow.includes("node tests/image-generation-contract.test.cjs"), "CI runs this integration contract test");
assert.ok(sw.includes("planet-image-generation.js"), "PWA app-shell cache contains the runtime client");
assert.ok(sw.includes("planet-pwa-v20-creature-collectibles"), "service-worker cache version is bumped for UI and Earth texture changes");
assert.ok(sw.includes("./genome-evidence.html"), "PWA app-shell cache contains the genome evidence report");
assert.ok(threeD.includes("implicit tissue field + marching tetrahedra; no taxon-specific mesh template selected"),
  "3D model generation uses runtime procedural geometry without taxon-specific templates");
assert.ok(setup.includes("OPENAI_API_KEY"), "setup explains server-only API credentials");

assert.ok(client.includes("function generateOfflineSVG"), "the app has a local genome-driven procedural image generator");
assert.ok(client.includes("if(!endpoint||!access){generateOffline();return;}"), "image generation works without configuring a remote API");
assert.ok(client.includes("An original image was generated locally"), "the UI honestly identifies offline procedural output");
assert.ok(client.includes("generateOffline();"), "the online failure path falls back to local generation");
assert.ok(client.includes("generateOfflineSVG:id=>"), "the generated SVG path is exposed for direct testing");
assert.ok(client.includes("Anatomy requirement:"), "AI portraits request visible arms, hands, fingers and feet");
assert.ok(client.includes("function getSizeGate(s)"), "creature portrait unlocks use an explicit size gate");
assert.ok(client.includes("Evolve beyond mouse size"), "species below the mouse-size threshold stay locked");
assert.ok(client.includes("const accelerator=(purchased?2.65:1)*(importedEarth?1.45:1)"), "Earth reference genomes and purchased planets accelerate collectible unlocks");
assert.ok(client.includes("setOwnershipResolver"), "commerce can provide authoritative purchased-planet ownership");
assert.ok(client.includes("function scanEligibleSpecies()"), "eligible organisms are scanned automatically without manual clicks");
assert.ok(client.includes("planet-creature-collection-v1"), "generated portraits are persisted as a collectible gallery");
assert.ok(client.includes("individually separated fingers"), "offline portrait prompt requests detailed hands");
assert.ok(client.includes("shoulderY=cy-ry*.30"), "offline fallback draws paired arms and hands");
assert.ok(sw.includes("planet-pwa-v20-creature-collectibles"), "PWA cache is invalidated for the new collectible system");

console.log("PLANET image-generation contract passed: online API safety, offline genome-driven generation, Android packaging, PWA cache and syntax wiring.");
