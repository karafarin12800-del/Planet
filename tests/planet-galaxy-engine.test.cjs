"use strict";
const assert=require("node:assert/strict");
const galaxyEngine=require("../planet-galaxy-engine.js");

const a=galaxyEngine.createGalaxy(12345);
const b=galaxyEngine.createGalaxy(12345);
assert.equal(galaxyEngine.serialize(a),galaxyEngine.serialize(b),"same seed creates the same galaxy");
assert.equal(a.systems.length,17);
assert.equal(a.activePlanetId,a.systems[0].planets[0].id);
assert.equal(galaxyEngine.getSummary(a).discovered,1,"only the home planet starts discovered");
assert.equal(galaxyEngine.getActivePlanet(a).home,true);
assert.ok(a.systems.every(s=>s.planets.length<=galaxyEngine.maxPlanetsPerSystem));
assert.ok(a.systems.flatMap(s=>s.planets).every(p=>Number.isInteger(p.seed)&&p.biomes.length>0));
assert.equal(a.systems[0].planets.length,8);
assert.ok(a.systems.slice(1).every(s=>s.planets.length>=6&&s.planets.length<=8));
const purchasable=a.systems.flatMap(s=>s.planets).filter(p=>p.commercePlanetId);
assert.equal(purchasable.length,100);
assert.equal(purchasable[0].commercePlanetId,"market-world-001");
assert.equal(purchasable[99].commercePlanetId,"market-world-100");
assert.equal(a.systems[0].planets[0].commercePlanetId,null);
assert.equal(new Set(purchasable.map(p=>p.name)).size,100);
assert.equal(Math.min(...purchasable.map(p=>p.priceTokens)),50,"each system has a 50-token starter planet");
for(const system of a.systems){const planets=system.planets.filter(p=>p.commercePlanetId);if(planets.length){assert.equal(Math.min(...planets.map(p=>p.priceTokens)),50,"every star system has one low-cost planet");const starter=planets.find(p=>p.priceTokens===50);assert.equal(starter.creatureCapacity,1);assert.equal(starter.features.length,1);}}
assert.equal(Math.max(...purchasable.map(p=>p.priceTokens)),1000,"the most expensive planet costs 1,000 tokens");
assert.ok(a.systems.flatMap(s=>s.planets).every(p=>p.lifePotential>=0&&p.lifePotential<=100&&p.specialSpeciesPotential>=0&&p.creatureCapacity===2&&p.priceTokens>=50&&p.priceTokens<=1000));

const next=a.systems[0].planets[1];
assert.equal(galaxyEngine.selectPlanet(a,next.id),false,"undiscovered planets cannot become active");
assert.equal(galaxyEngine.discoverPlanet(a,next.id),true);
assert.equal(galaxyEngine.discoverPlanet(a,next.id),false,"discovery is idempotent");
assert.equal(galaxyEngine.selectPlanet(a,next.id),true);
assert.equal(a.activePlanetId,next.id);
assert.equal(galaxyEngine.getActivePlanet(a).visited,true);
assert.equal(galaxyEngine.selectPlanet(a,"missing-planet"),false);

galaxyEngine.setYear(a,2000);
const restored=galaxyEngine.restore(galaxyEngine.serialize(a));
assert.equal(restored.year,2000);
assert.equal(restored.version,3);
assert.equal(restored.systems.flatMap(s=>s.planets).filter(p=>p.commercePlanetId).length,100);
const legacy=JSON.parse(galaxyEngine.serialize(a));legacy.version=1;const migrated=galaxyEngine.restore(legacy);assert.equal(migrated.version,3);assert.equal(migrated.systems.flatMap(s=>s.planets).filter(p=>p.commercePlanetId).length,100);
assert.equal(restored.activePlanetId,next.id);
assert.deepEqual(galaxyEngine.getSummary(restored),galaxyEngine.getSummary(a));

const snapshot=galaxyEngine.getPlanet(restored,next.id);
snapshot.name="tampered";
assert.notEqual(galaxyEngine.getPlanet(restored,next.id).name,"tampered","planet snapshots cannot mutate saved world state");
assert.throws(()=>galaxyEngine.restore(JSON.stringify({version:999,systems:[]})),/Invalid|unsupported/);
console.log("PLANET galaxy foundation tests passed:",galaxyEngine.getSummary(restored));
