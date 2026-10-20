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

// Earth/system camera transitions restore the previous camera and do not strand the app in focus mode.
assert.ok(html.includes("function restoreFocus()"), "camera restoration is centralized");
assert.ok(html.includes("if(!sys&&lifeFocusMode)"), "Earth view explicitly exits close-up mode");
assert.ok(html.includes("targetYaw=savedFocus.targetYaw"), "camera target angles are restored along with current angles");

// Cell size is not fabricated from the synthetic 168-bp toy genome.
assert.ok(html.includes("اندازهٔ واقعی سلول: نامشخص"), "synthetic lineages disclose unknown real cell size");
assert.ok(html.includes("id=" + '"originScenario"'), "early-Earth scenario selector is available");
assert.ok(html.includes("originScenarioSettings"), "scenario choices change model environment inputs");
assert.ok(html.includes("NASA — محیط‌های احتمالی آغاز حیات"), "origin-of-life scenario links to scientific evidence");
assert.ok(html.includes("این مقادیر تنظیمات آزمایشی مدل‌اند"), "scenario settings are labeled as illustrative rather than established paleoclimate");

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

// Performance regressions: large timeline jumps must yield to the browser between generations.
const catchUpStart = html.indexOf("function catchUpEvolution(targetAge)");
const catchUpEnd = html.indexOf("function lifeTimeLabel", catchUpStart);
assert.ok(catchUpStart >= 0 && catchUpEnd > catchUpStart, "timeline catch-up function exists");
const catchUpCode = html.slice(catchUpStart, catchUpEnd);
assert.ok(catchUpCode.includes("requestAnimationFrame(advance)"), "timeline simulation is time-sliced across frames");
assert.ok(catchUpCode.includes("evolutionaryStep({deferUI:true})"), "catch-up steps suppress repeated DOM redraws");
assert.ok(!catchUpCode.includes("for(let i=0;i<steps;i++)"), "timeline jumps must not run all generations synchronously");
assert.ok(html.includes("!catchUpInProgress"), "the normal simulation pauses while timeline catch-up is active");
assert.ok(html.includes("cancelCatchUp();lifeStarted=false;lifeAgeMa=0"), "reset cancels a pending catch-up task");

// Restoring a saved timeline must not spawn dozens of agents for future lineages or recalculate their phenotype twice.
const restoreStart = html.indexOf("function restoreLifeState()");
const restoreEnd = html.indexOf("function cancelCatchUp()", restoreStart);
assert.ok(restoreStart >= 0 && restoreEnd > restoreStart, "bounded state restore exists");
const restoreCode = html.slice(restoreStart, restoreEnd);
assert.ok(restoreCode.includes("slice(-MAX_SPECIES)"), "corrupt/legacy archives are capped before restore");
assert.ok(restoreCode.includes("s.firstAppearanceMa<=lifeAgeMa"), "future lineages do not spawn agents during restore");
assert.ok(restoreCode.includes("restoreAgentBudget"), "restoration has a global agent budget");
assert.ok(!restoreCode.includes("const agent=createAgent(s,null)"), "saved agents are restored without constructing throwaway agents");
assert.ok(html.includes("now-lastHudUpdate>=100"), "expensive HUD DOM updates are throttled");
assert.ok(html.includes("t-lastStarDraw<80"), "the starfield is not redrawn at full display refresh rate");
assert.ok(!html.includes("requestAnimationFrame(drawLife)"), "the unused empty Earth overlay loop is disabled");
assert.ok(html.includes("innerWidth<=900?2048:4096"), "mobile WebGL textures are capped at 2K");
assert.ok(html.includes("webglcontextlost"), "WebGL loss is handled rather than leaving a silent frozen scene");
assert.ok(html.includes("now-speciesCatalogLastRenderAt<2000"), "large species catalog is not rebuilt several times per second");

console.log("PLANET UI regression tests passed: catalog scroll stability, aligned genome buttons, removed life zoom, complete guide, and GPU-safe Earth texture.");
