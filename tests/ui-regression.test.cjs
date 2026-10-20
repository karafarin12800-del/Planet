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
assert.ok(html.includes("https://www.solarsystemscope.com/textures/download/2k_earth_daymap.jpg"), "web fallback avoids decoding an unnecessary 8K image on mobile");
assert.ok(html.includes("Math.min(4096,hardwareLimit)"), "texture upload is capped for mobile GPU safety");
assert.ok(html.includes("meta.width+'×'+meta.height"), "Earth texture status reports the actual uploaded dimensions");
assert.ok(html.includes("منبع بافت روز زمین: Solar System Scope"), "Earth texture attribution is included");

assert.ok(workflow.includes("earth-daymap-4k.jpg"), "Android build includes the downscaled map");
assert.ok(workflow.includes("Pillow"), "CI uses a reproducible image resize step");
assert.ok(workflow.includes("resize((4096, 2048)"), "CI creates a 4K power-of-two texture");
assert.ok(sw.includes("planet-pwa-v16-freeze-fixes"), "PWA cache key was bumped");
assert.ok(imageContract.includes("planet-pwa-v16-freeze-fixes"), "existing image contract agrees with new cache version");

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
const persistStart = html.indexOf("function persistLifeState()");
const persistEnd = html.indexOf("function restoreLifeState()", persistStart);
assert.ok(persistStart >= 0 && persistEnd > persistStart, "bounded persistence function exists");
const persistCode = html.slice(persistStart, persistEnd);
assert.ok(persistCode.includes("let agentBudget=MAX_LIVING_SPECIES*MAX_AGENTS_PER_SPECIES"), "saved agents have a hard global upper bound");
assert.ok(persistCode.includes("aliveAtCurrentAge"), "future/extinct lineages do not serialize dormant agent populations");
assert.ok(persistCode.includes(".filter(a=>a&&a.alive!==false)"), "only living agent state is serialized");
assert.ok(persistCode.includes("Life state save skipped"), "storage failures are diagnosed rather than silently swallowed");
assert.ok(restoreCode.includes("restoreAgentBudget"), "restoration has a global agent budget");
assert.ok(!restoreCode.includes("const agent=createAgent(s,null)"), "saved agents are restored without constructing throwaway agents");
assert.ok(html.includes("now-lastHudUpdate>=100"), "expensive HUD DOM updates are throttled");
assert.ok(html.includes("t-lastStarDraw<80"), "the starfield is not redrawn at full display refresh rate");
assert.ok(!html.includes("requestAnimationFrame(drawLife)"), "the unused empty Earth overlay loop is disabled");
assert.ok(html.includes("innerWidth<=900?2048:4096"), "mobile WebGL textures are capped at 2K");
assert.ok(html.includes("webglcontextlost"), "WebGL loss is handled rather than leaving a silent frozen scene");
assert.ok(html.includes("now-speciesCatalogLastRenderAt<2000"), "large species catalog is not rebuilt several times per second");
assert.ok(html.includes("if(!force&&!$('speciesOverlay').classList.contains('open'))return"), "hidden species archive does not build hundreds of cards during startup");
assert.ok(html.includes("rect.bottom<viewport.top-120||rect.top>viewport.bottom+120"), "off-screen organism thumbnails are deferred");
assert.ok(html.includes("artRenderScheduled"), "visible thumbnails are rendered lazily during scroll");
const activity = read("app/src/main/java/com/planet/live/MainActivity.java");
assert.ok(activity.includes("protected void onPause()") && activity.includes("webView.onPause()"), "Android pauses WebView activity work in background");
assert.ok(activity.includes("protected void onResume()") && activity.includes("webView.onResume()"), "Android resumes WebView activity work when foregrounded");

// Large genomes are scanned incrementally rather than by allocating full-length regex match arrays.
assert.ok(html.includes("async function parseGenome(text,name,formatHint)"), "full-genome parser is asynchronous");
assert.ok(html.includes("for(let offset=0;offset<seq.length;offset+=200000)"), "genome statistics are scanned in bounded chunks");
assert.ok(html.includes("await yieldToBrowser()"), "long sequence scans yield to the WebView event loop");
assert.ok(html.includes("const g=await parseGenome(text,name,format);"), "file import awaits the incremental genome parser");
assert.ok(html.includes("const lowPowerDevice=window.innerWidth<=900"), "phones use a low-power startup rendering path");
assert.ok(html.includes("const landPixels=ctx.getImageData(0,0,w,h).data"), "procedural Earth texture uses one raster readback");
assert.ok(!html.includes("ctx.getImageData(x|0,y|0,1,1)"), "procedural Earth generation avoids hundreds of synchronous 1x1 canvas readbacks");
assert.ok(html.includes("lowPowerDevice?1024:2048"), "Earth fallback generation is smaller on phones");
assert.ok(html.includes("lowPowerDevice?512:1024"), "cloud texture generation is smaller on phones");

assert.ok(!html.includes("records.map(r=>r.seq).join('')"), "RNA/DNA classification does not concatenate a duplicate full genome");

assert.ok(html.includes("const speciesBaseFitness=calculateFitness(s,lifeAgeMa)"), "species baseline fitness is computed once per ecology step");
assert.ok(html.includes("actAgent(agent,s,env,neighbors,context,speciesBaseFitness)"), "individual agents reuse the species fitness calculation");
assert.ok(!html.includes("agent.fitness=clamp(.25*calculateFitness(s,lifeAgeMa)"), "fitness calculation is not repeated for every individual in a species");
assert.ok(!html.includes("ensureDinosaurLineages()"), "evolution does not call the removed dinosaur-seeding function");
assert.ok(html.includes("Evolution step failed; orbital rendering continues"), "an ecology exception pauses evolution without killing the planet render loop");
assert.ok(html.includes("planet-pwa-v16-freeze-fixes"), "PWA cache invalidation includes the freeze fixes");
assert.ok(html.includes("while(evolutionAccumulator>=.75&&lifeAgeMa<4540)"), "the ecology loop stops stepping after the geological timeline reaches its endpoint");
assert.ok(html.includes("if(lifeStarted&&lifeAgeMa>=4540){lifeStarted=false;evolutionAccumulator=0"), "restored or completed timelines pause automatically at the endpoint");
console.log("PLANET UI regression tests passed: catalog scroll stability, aligned genome buttons, removed life zoom, complete guide, and GPU-safe Earth texture.");
