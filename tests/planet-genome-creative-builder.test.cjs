"use strict";
const assert=require("node:assert/strict");
require("../evolution-engine.js");
const Life=require("../planet-autonomous-evolution.js");
const Game=require("../planet-genome-game.js");
const pool=Life.createEarthGenomePool(98765);
const world={id:"creative-test-world",type:"crystal",meanTemperatureC:12,waterCoverage:.25,gravity:1.1,atmosphere:"fantasy",home:false};
const state=Game.createWorld("creative-seed",world,pool.slice(0,3));
const before=state.species.length;
const creature=Game.createCustomCreature(state,{
 description:"یک اژدهای کریستالی بنفش با شش بال، شاخ طلایی، دم بسیار بلند و زره درخشان",
 name:"آذرخش",diet:"carnivore",habitat:"sky",scale:"colossal"
});
assert.equal(state.species.length,before+1);
assert.equal(creature.name,"آذرخش");
assert.equal(creature.diet,"carnivore");
assert.equal(creature.habitat,"sky");
assert.ok(creature.bodyLengthCm>=80000,"colossal prompt must create a giant creature");
assert.ok(creature.special&&creature.marketEligible,"player-created creatures must be eligible for collection/market flow");
assert.equal(creature.creativeBrief.includes("اژدهای"),true);
Game.renameCreature(state,creature.id,"اژدهای شاهوار");
assert.equal(state.species.find(x=>x.id===creature.id).name,"اژدهای شاهوار");
const oldSize=creature.bodyLengthCm,oldGeneration=creature.generation;
Game.boostCreature(state,creature.id,{factor:12});
const evolved=state.species.find(x=>x.id===creature.id);
assert.ok(evolved.bodyLengthCm>oldSize,"instant evolution must increase body size");
assert.ok(evolved.generation>oldGeneration,"instant evolution must advance generation");
assert.ok(evolved.dna.length===168&&/^[ACGT]+$/.test(evolved.dna),"mutated genome must remain valid");
const saved=Game.save(state),restored=Game.restore(saved),roundtrip=restored.species.find(x=>x.id===creature.id);
assert.equal(roundtrip.name,"اژدهای شاهوار");
assert.equal(roundtrip.creativeBrief,creature.creativeBrief);
assert.equal(roundtrip.diet,"carnivore");
console.log("Genome creative builder passed:",JSON.stringify({species:state.species.length,name:roundtrip.name,sizeCm:roundtrip.bodyLengthCm,generation:roundtrip.generation,habitat:roundtrip.habitat,diet:roundtrip.diet}));
