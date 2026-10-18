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

assert.match(html, /<script src="\.\/procedural-organism-3d\.js"><\/script>\s*<script src="\.\/planet-image-generation\.js"><\/script>/,
  "the 3D generator loads before the optional image generator");
assert.match(client, /getSpeciesSnapshot/, "image prompt uses the simulator's current species catalog");
assert.match(client, /Digital genome length:/, "prompt includes sequence provenance");
assert.match(client, /Environment from the simulation:/, "prompt includes the simulated habitat and time");
assert.match(client, /not a preloaded species picture/, "image request explicitly asks for newly generated pixels");
assert.match(client, /fetch\(url\.toString\(\)/, "image generation actually calls the configured backend");
assert.doesNotMatch(client, /data:image\/(?:png|jpeg|webp);base64,[A-Za-z0-9+/]{512}/,
  "the app module must not ship a pre-generated image payload");
assert.match(worker, /https:\/\/api\.openai\.com\/v1\/images\/generations/,
  "worker calls the image-generation API");
assert.match(worker, /OPENAI_IMAGE_MODEL\s*\|\|\s*"gpt-image-2\.5-flare"/,
  "worker defaults to a documented image-generation model");
assert.match(worker, /Authorization.*Bearer.*env\.OPENAI_API_KEY/,
  "provider key is read only from the server environment");
assert.match(worker, /https:\/\/appassets\.androidplatform\.net/,
  "Android WebView AssetLoader origin is allowed for configured APK image requests");
assert.match(workflow, /planet-image-generation\.js.*app\/src\/main\/assets/,
  "Android build bundles the runtime image-generation client");
assert.match(workflow, /node --check planet-image-generation\.js/,
  "CI validates the image client JavaScript syntax");
assert.match(workflow, /node tests\/image-generation-contract\.test\.cjs/,
  "CI runs this image-generation integration contract test");
assert.match(sw, /planet-image-generation\.js/,
  "PWA app-shell cache contains the runtime client");
assert.match(sw, /planet-pwa-v12-genome-ai-images/,
  "service worker cache version is bumped for the new app shell");
assert.match(threeD, /implicit tissue field \+ marching tetrahedra; no taxon-specific mesh template selected/,
  "the 3D model generator uses runtime procedural geometry rather than taxon-specific model templates");
assert.match(setup, /OPENAI_API_KEY/, "setup explains server-only API credentials");
console.log("PLANET image-generation integration contract passed: runtime-generated imagery, backend-only API key, Android packaging, PWA cache and syntax-validation wiring.");
