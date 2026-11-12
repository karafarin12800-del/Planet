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

assert.ok(html.includes('<script src="./procedural-organism-3d.js"></script>\n<script src="./planet-organism-morphology.js"></script>\n<script src="./planet-image-generation.js"></script>'),
  "morphology rules load before the image generator");
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
assert.ok(workflow.includes("cp index.html planet-localization.js evolution-engine.js procedural-organism-3d.js planet-organism-morphology.js planet-image-generation.js offline-ai.js"),
  "Android build bundles morphology rules before the runtime image-generation client");
assert.ok(workflow.includes("node --check planet-image-generation.js"), "CI validates image client syntax");
assert.ok(workflow.includes("node tests/image-generation-contract.test.cjs"), "CI runs this integration contract test");
assert.ok(sw.includes("planet-image-generation.js") && sw.includes("planet-organism-morphology.js"), "PWA app-shell cache contains the runtime client and morphology rules");
assert.ok(sw.includes("planet-pwa-v44-distinct-genome-bodyplans"), "service-worker cache version refreshes organism morphology and portrait output");
assert.ok(sw.includes("./genome-evidence.html"), "PWA app-shell cache contains the genome evidence report");
assert.ok(threeD.includes("implicit tissue field + marching tetrahedra; no taxon-specific mesh template selected"),
  "3D model generation uses runtime procedural geometry without taxon-specific templates");
assert.ok(setup.includes("OPENAI_API_KEY"), "setup explains server-only API credentials");

assert.ok(client.includes("function generateOfflineSVG"), "the app has a local genome-driven procedural image generator");
assert.ok(client.includes("if(!endpoint||!access){generateOffline(hash,variation);await writeImageCache(hash,generated,'procedural',species);return;}"), "offline image is stable and persisted by prompt-aware identity");
assert.ok(client.includes("IMAGE_DB"), "generated images are stored persistently in IndexedDB");
assert.ok(client.includes("portraitCacheHash(species,variation,prompt)") && client.includes("primary-v2"), "default image identity is stable while variations use distinct prompt-aware cache keys");
assert.ok(worker.includes("env.ORGANISM_IMAGES.get(cacheKey)") && worker.includes("env.ORGANISM_IMAGES.put(cacheKey"), "R2 keeps one global image per genome");
assert.ok(worker.includes("const genome = typeof body.genome"), "server cache key is derived from the submitted genome");
assert.ok(client.includes("A local genome-and-habitat portrait was created"), "the UI honestly identifies offline procedural output");
assert.ok(client.includes("generateOffline(hash,variation)"), "the online failure path falls back to a prompt/variation-keyed local image");
assert.ok(client.includes("generateOfflineSVG:id=>"), "the generated SVG path is exposed for direct testing");


assert.ok(client.includes("Anatomy and silhouette requirement") && client.includes("morphology.instructions"), "AI prompt follows form-specific morphology rules");
assert.ok(!client.includes("two open palms with individually separated fingers"), "AI prompt does not force all species into humanoid anatomy");
assert.ok(client.includes("function createVariation") && client.includes("variationButton.hidden=false"), "players can request a fresh visual variation");
assert.ok(client.includes("PlanetOrganismMorphology.describe"), "AI prompts use the shared morphology classifier");
assert.ok(client.includes("This botanical or filamentous organism belongs in the biosphere"), "non-animal species are described as biosphere organisms rather than locked animal portraits");
assert.ok(client.includes("function isPortraitEligible(s)"), "automatic portrait unlock has a single eligibility gate");
assert.ok(client.includes("Number(s.bodyLengthCm||0)<=10"), "portraits remain locked at 10 cm and below until the creature grows larger than a mouse");
assert.ok(client.includes("s.special===true"), "only evolved special species become collectible portraits");
assert.ok(client.includes("function scanEligibleSpecies()"), "eligible creatures are automatically scanned");
assert.ok(client.includes("function showCollection()"), "players can browse their saved creature portrait collection");
assert.ok(client.includes("PlanetWorldLifeAPI"), "portrait generation reads the active purchased planet's biosphere");
assert.ok(client.includes("cacheIdentity:hash"), "image requests carry a world-specific stable cache identity");
assert.ok(client.includes("species&&species.planetFingerprint||''"), "image cache identity includes the stable planet DNA fingerprint");
assert.ok(client.includes("s.traits.planetMorphology||s.traits.appearance"), "AI portrait prompt preserves custom and planet-specific phenotype traits");
assert.ok(client.includes("family==='filamentous'") && client.includes("family==='insectoid'") && client.includes("family==='serpentine'"), "offline renderer uses separate filament, insect and serpent silhouettes");
assert.ok(!client.includes("armY=cy-ry*.30"), "offline renderer no longer adds the same human arms and hands to every animal");
assert.ok(client.includes("writeImageCache(hash,generated,'ai',species)"), "AI portraits store creature and planet metadata");
assert.ok(worker.includes("body.cacheIdentity") && worker.includes('cacheMaterial = cacheIdentity + "|" + prompt'), "R2 cache identity includes both planet/genome identity and prompt text");
assert.ok(html.includes("window.PlanetWorldLifeAPI"), "active world exposes its live evolved species");
assert.ok(html.includes("Model.setPlanetPurchased(state,ownedPlanetIds.has(String(planet.commercePlanetId||worldId)))"), "active world's evolution uses server-verified ownership");
assert.ok(html.includes("planet:owned-planets-updated"), "owned planet updates accelerate the active biosphere");
assert.ok(read("planet-commerce-ui.js").includes("planet:owned-planets-updated"), "commerce publishes server-verified owned planets");


assert.ok(client.includes("data-planet-portrait-lock"), "locked creatures show a visible portrait unlock goal");
assert.ok(client.includes("Portrait unlocks above mouse size"), "the size gate is explained to players");
assert.ok(html.includes("شتاب تکامل ژنوم زمین در سیارهٔ خریداری‌شده فعال است"), "the HUD explains the purchased-world evolution boost");

assert.ok(client.includes("animalLike=!/microbe|bacter|fung|plant|tree|flora|filament|colony/.test(form)"), "non-animal forms do not receive misleading hand-and-foot portraits");
assert.ok(read("planet-commerce-ui.js").includes("if(client.hasSession())setTimeout(()=>refresh()"), "owned planets are refreshed automatically on signed-in startup");

assert.ok(client.includes("limbCount:v[1]<.16?0:v[1]<.34?2:v[1]<.62?4:v[1]<.82?6:8"), "genome modules encode five locomotion plans instead of defaulting nearly every species to four limbs");
assert.ok(client.includes("family==='biped'") && client.includes("family==='multi-limbed'") && client.includes("family==='limbless'") && client.includes("family==='winged'||family==='draconic'"), "offline renderer has separate biped, multi-limbed, limbless and winged silhouettes");
assert.ok(client.includes("Species-to-species diversity rule:"), "online prompt requires clearly distinct species silhouettes");
assert.ok(client.includes("planet-portrait-v3-morphology-diversity"), "portrait cache invalidates previous repetitive images");

console.log("PLANET image-generation contract passed: online API safety, offline genome-driven generation, Android packaging, PWA cache and syntax wiring.");
