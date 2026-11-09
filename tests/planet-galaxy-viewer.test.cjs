const assert = require("node:assert/strict");
const Engine = require("../planet-galaxy-engine.js");
const Viewer = require("../planet-galaxy-viewer.js");

const first = Engine.createGalaxy(123456);
const second = Engine.createGalaxy(123456);
const layoutA = Viewer.layoutGalaxy(first);
const layoutB = Viewer.layoutGalaxy(second);

assert.equal(layoutA.length, first.systems.length, "every system gets a 3D map position");
assert.deepEqual(layoutA, layoutB, "galaxy coordinates are deterministic for the same catalog");
assert.equal(layoutA[0].x, 0, "home system is anchored at the galaxy origin");
assert.equal(layoutA[0].z, 0, "home system is anchored at the galaxy origin");
assert.equal(new Set(layoutA.map(item => item.id)).size, layoutA.length, "system map IDs are unique");

for (let i = 0; i < layoutA.length; i++) {
  for (let j = i + 1; j < layoutA.length; j++) {
    const a = layoutA[i], b = layoutA[j];
    const distance = Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z);
    assert.ok(distance > 3, "star systems remain visually separated");
  }
}

for (const system of first.systems) {
  const positions = Viewer.layoutPlanets(system, 1000);
  assert.equal(positions.length, system.planets.length, "every planet gets an orbital position");
  assert.equal(new Set(positions.map(item => item.id)).size, positions.length, "planet IDs remain unique");
  positions.forEach((position, index) => {
    assert.ok(position.orbit >= 2.15, "planet orbit radius is positive and bounded away from the star");
    if (index > 0) assert.ok(position.orbit > positions[index - 1].orbit, "outer planets use larger orbit radii");
    assert.ok(Number.isFinite(position.x) && Number.isFinite(position.y) && Number.isFinite(position.z), "planet positions are finite");
  });
}
assert.deepEqual(Viewer.colorForType("ocean"), [0.12, 0.48, 0.88], "planet type palette is stable");
assert.deepEqual(Viewer.hexColor("#ffffff"), [1, 1, 1], "star hex colors are converted to normalized RGB");

for (const system of first.systems) {
  for (const planet of system.planets) {
    const profile = Viewer.planetSurfaceProfile(planet);
    assert.equal(profile.waterCoverage, planet.waterCoverage, "surface profile keeps the catalog water coverage");
    assert.ok(profile.land.every(value => value >= 0 && value <= 1), "surface palette channels are normalized");
    assert.ok(profile.accent.every(value => value >= 0 && value <= 1), "surface accent channels are normalized");
    assert.ok(profile.water.every(value => value >= 0 && value <= 1), "surface water channels are normalized");
    assert.equal(profile.gasGiant, planet.type === "gas-giant", "gas giants receive the correct surface rendering profile");
  }
}

const saved = Engine.serialize(first);
const restored = Engine.restore(saved);
assert.deepEqual(Viewer.layoutGalaxy(restored), layoutA, "saved galaxy keeps its navigation layout");
console.log("Planet galaxy viewer tests passed.");
