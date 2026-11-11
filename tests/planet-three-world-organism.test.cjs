"use strict";
const assert = require("node:assert/strict");
require("../evolution-engine.js"); // Registers the genome phenotype model used by the ecology engine.
const life = require("../planet-autonomous-evolution.js");
const meshEngine = require("../procedural-organism-3d.js");

// Keep the source genome and specimen identity fixed; only the planet changes.
const earthSeed = life.createState(20261111);
const genome = earthSeed.species[0].dna;
const worlds = [
  { id:"test-desert", seed:101, type:"desert", meanTemperatureC:82, waterCoverage:0.03, gravity:1.8, atmosphere:"thin-carbon-dioxide", priceTokens:900, specialSpeciesPotential:90, biomes:["dunes","canyons"] },
  { id:"test-ice-ocean", seed:202, type:"ice", meanTemperatureC:-88, waterCoverage:0.91, gravity:0.48, atmosphere:"nitrogen-rich", priceTokens:120, specialSpeciesPotential:25, biomes:["ice","subsurface-ocean"] },
  { id:"test-volcanic", seed:303, type:"volcanic", meanTemperatureC:310, waterCoverage:0.12, gravity:1.25, atmosphere:"dense-carbon-dioxide", priceTokens:520, specialSpeciesPotential:70, biomes:["lava-fields","sulfur-plains"] }
];

const results = worlds.map(world => {
  const state = life.createState(444, world, [genome, genome]);
  const species = state.species[0];
  assert.equal(species.dna, genome, "all worlds must receive the exact same source genome");
  assert.equal(species.traits.planetMorphology.fingerprint, state.planetEnvironment.geneticFingerprint);
  const mesh = meshEngine.buildMesh({
    id: species.id,
    nameEn: species.nameEn,
    form: species.form,
    dna: species.dna,
    habitat: species.habitat,
    generation: species.generation,
    traits: species.traits,
    environment: {
      temperatureC: state.planetEnvironment.temperatureC,
      moisture: state.planetEnvironment.waterCoverage,
      oxygen: 0.21
    }
  });
  assert.ok(mesh.triangles > 100, "each world must produce a non-empty 3D organism mesh");
  assert.ok(mesh.groups.every(group => group.positions.length > 0), "each generated mesh must contain surface geometry");
  assert.ok(mesh.groups.every(group => group.positions.every(Number.isFinite)), "mesh coordinates must be finite");
  const glb = meshEngine.toGLB(mesh);
  const view = new DataView(glb);
  assert.equal(view.getUint32(0, true), 0x46546c67, "export must be a valid GLB container");
  assert.equal(view.getUint32(8, true), glb.byteLength, "GLB length header must match exported bytes");
  return { fingerprint:state.planetEnvironment.geneticFingerprint, groups:mesh.groups, triangles:mesh.triangles, glbBytes:glb.byteLength };
});

assert.equal(new Set(results.map(x => x.fingerprint)).size, 3, "three planets must have distinct fingerprints");
assert.equal(new Set(results.map(x => JSON.stringify(x.groups))).size, 3,
  "the same genome must produce three distinct 3D morphologies across the three planetary environments");

// Replaying one exact world/genome pair must reproduce the exact mesh.
const repeatState = life.createState(444, worlds[0], [genome, genome]);
const repeatSpecies = repeatState.species[0];
const repeatMesh = meshEngine.buildMesh({
  id:repeatSpecies.id, nameEn:repeatSpecies.nameEn, form:repeatSpecies.form,
  dna:repeatSpecies.dna, habitat:repeatSpecies.habitat, generation:repeatSpecies.generation,
  traits:repeatSpecies.traits,
  environment:{temperatureC:repeatState.planetEnvironment.temperatureC, moisture:repeatState.planetEnvironment.waterCoverage, oxygen:0.21}
});
assert.deepEqual(repeatMesh.groups, results[0].groups, "same genome and same planet must reproduce the same mesh");

console.log("PLANET three-world organism integration passed:", JSON.stringify(results.map((x,i)=>({
  world:worlds[i].id, fingerprint:x.fingerprint, triangles:x.triangles, glbBytes:x.glbBytes
}))));
