"use strict";
const assert=require("node:assert/strict");
const World=require("../planet-world-state.js");
const Galaxy=require("../planet-galaxy-engine.js");
class MemoryStorage{
  constructor(){this.data=new Map();}
  getItem(key){return this.data.has(key)?this.data.get(key):null;}
  setItem(key,value){this.data.set(key,String(value));}
}
const storage=new MemoryStorage();
const galaxy=Galaxy.createGalaxy(98765);
storage.setItem(World.galaxyKey,Galaxy.serialize(galaxy));
const home=galaxy.systems[0].planets[0].id;
const other=galaxy.systems[0].planets[1].id;
assert.equal(World.getHomeWorldId(storage,Galaxy),home);
assert.equal(World.getActiveWorldId(storage,Galaxy),home);
assert.notEqual(World.seedFor(home),World.seedFor(other),"each planet receives a deterministic but distinct biosphere seed");

const legacy={state:JSON.stringify({version:1,year:42,species:[]}),live:false,speed:3,lastWall:1234};
storage.setItem(World.legacyKey,JSON.stringify(legacy));
assert.deepEqual(World.load(storage,home,{homeWorldId:home}),legacy,"legacy biosphere save migrates to the original home world");
assert.equal(storage.getItem(World.legacyKey),JSON.stringify(legacy),"migration preserves the original legacy save as a backup");
assert.equal(World.load(storage,other,{homeWorldId:home}),null,"a new planet never inherits another planet's biosphere");

const first={state:"world-one",live:true,speed:4,lastWall:5000};
const second={state:"world-two",live:false,speed:2,lastWall:6000};
assert.equal(World.save(storage,home,first),true);
assert.equal(World.save(storage,other,second),true);
assert.deepEqual(World.load(storage,home,{homeWorldId:home}),first);
assert.deepEqual(World.load(storage,other,{homeWorldId:home}),second);
assert.notEqual(World.storageKey(home),World.storageKey(other));
assert.equal(World.save(storage,"",first),false);
console.log("Planet per-world persistence tests passed.");
