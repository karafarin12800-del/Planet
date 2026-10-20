"use strict";
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const read = p => fs.readFileSync(path.join(__dirname, "..", p), "utf8");

const html = read("index.html");
const workflow = read(".github/workflows/android-apk.yml");
const sw = read("sw.js");
const imageContract = read("tests/image-generation-contract.test.cjs");

// Catalog: simulation refreshes must not repeatedly destroy the active scroll position.
assert.ok(html.includes("speciesListUserScrollingUntil=0"), "catalog tracks active user scrolling");
assert.ok(html.includes("box.scrollTop=previousScrollTop"), "catalog preserves scroll position across redraws");
assert.ok(html.includes("renderSpeciesCatalog(true)"), "opening the catalog forces one full render");

// Genome actions share one fixed dock and must not overlap on small screens.
assert.ok(html.includes("planet-genome-action-dock"), "genome buttons share one dock");
assert.ok(html.includes("dock.appendChild(fullGenomeButton);dock.appendChild(button)"), "both genome buttons are children of the dock");
assert.ok(html.includes("max-width:calc((100vw - 26px)/2)"), "dock buttons respect narrow mobile screens");

// Requested unused zoom button is absent from markup and event binding.
assert.ok(!html.includes('id="lifeZoomBtn"'), "life zoom button was removed");
assert.ok(!html.includes('class="life-zoom-btn"'), "life zoom button markup was removed");
assert.ok(!html.includes("$('lifeZoomBtn').onclick"), "life zoom click binding was removed");

// The help sheet documents actual app capabilities and remains readable on mobile.
assert.ok(html.includes("راهنمای کامل Planet"), "guide title is updated");
assert.ok(html.includes("آزمایشگاه ژنوم کامل"), "guide covers the full genome lab");
assert.ok(html.includes("گزارش مستند ژنوم"), "guide covers the evidence report");
assert.ok(html.includes("محدودیت علمی مهم"), "guide states biological-model limitations");
assert.ok(html.includes("#helpOverlay .planet-help-modal p,#helpOverlay .planet-help-modal li{font-size:14px"), "help text is larger on desktop");
assert.ok(html.includes("font-size:13px;line-height:1.9"), "help text remains readable on small screens");

// Higher-resolution day map is loaded locally in APK and has an online fallback.
assert.ok(html.includes("./earth-daymap-4k.jpg"), "Earth texture can load from Android assets");
assert.ok(html.includes("https://cdn.solarsystemscope.com/textures/download/8k_earth_daymap.jpg"), "Earth texture has official-host fallback");
assert.ok(html.includes("Math.min(4096,hardwareLimit)"), "texture upload is capped for mobile GPU safety");
assert.ok(html.includes("Earth surface map 4K"), "loaded Earth texture status supports English");
assert.ok(html.includes("منبع بافت روز زمین: Solar System Scope"), "Earth texture attribution is included");

assert.ok(workflow.includes("earth-daymap-4k.jpg"), "Android build includes the downscaled map");
assert.ok(workflow.includes("Pillow"), "CI uses a reproducible image resize step");
assert.ok(workflow.includes("resize((4096, 2048)"), "CI creates a 4K power-of-two texture");
assert.ok(sw.includes("planet-pwa-v15-full-language-switch"), "PWA cache key was bumped");
assert.ok(imageContract.includes("planet-pwa-v15-full-language-switch"), "existing image contract agrees with new cache version");

console.log("PLANET UI regression tests passed: catalog scroll stability, aligned genome buttons, removed life zoom, complete guide, and GPU-safe Earth texture.");
