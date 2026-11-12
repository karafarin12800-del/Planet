/* PLANET per-world autonomous biosphere persistence.
 * Keeps each discovered planet's digital biosphere isolated without replacing legacy saves.
 */
(function(root,factory){
  const api=factory();
  if(typeof module!=="undefined"&&module.exports)module.exports=api;
  if(root)root.PlanetWorldState=api;
})(typeof globalThis!=="undefined"?globalThis:this,function(){
  "use strict";
  const GALAXY_KEY="planet-galaxy-save-v1";
  const LEGACY_KEY="planet-autonomous-biosphere-v1";
  const PREFIX="planet-autonomous-biosphere-world-v1:";
  function validId(id){return typeof id==="string"&&id.length>0&&id.length<=120;}
  function readGalaxy(storage,engine){
    try{
      if(!storage||!engine)return null;
      const raw=storage.getItem(GALAXY_KEY);
      return raw?engine.restore(raw):null;
    }catch(error){return null;}
  }
  function getHomeWorldId(storage,engine){
    const galaxy=readGalaxy(storage,engine);
    if(!galaxy)return null;
    for(const system of galaxy.systems||[]){
      const home=(system.planets||[]).find(planet=>planet&&planet.home);
      if(home)return home.id;
    }
    return null;
  }
  function getActiveWorldId(storage,engine,fallback){
    const galaxy=readGalaxy(storage,engine);
    return galaxy&&validId(galaxy.activePlanetId)?galaxy.activePlanetId:(validId(fallback)?fallback:"system-01-p1");
  }
  function storageKey(worldId){
    if(!validId(worldId))throw new Error("A stable planet ID is required.");
    return PREFIX+encodeURIComponent(worldId);
  }
  function parseSnapshot(raw){
    if(!raw)return null;
    try{
      const value=JSON.parse(raw);
      if(!value||typeof value!=="object"||typeof value.state!=="string")return null;
      return {state:value.state,live:!!value.live,speed:Math.max(1,Math.min(20,Number(value.speed)||10)),lastWall:Math.max(0,Number(value.lastWall)||0)};
    }catch(error){return null;}
  }
  function load(storage,worldId,options){
    if(!storage||!validId(worldId))return null;
    const opts=options||{},key=storageKey(worldId);
    let current=null;
    try{current=parseSnapshot(storage.getItem(key));}catch(error){return null;}
    if(current)return current;
    const homeId=opts.homeWorldId||getHomeWorldId(storage,opts.galaxyEngine);
    const legacyKey=opts.legacyKey||LEGACY_KEY;
    if(homeId===worldId){
      let legacy=null;
      try{legacy=parseSnapshot(storage.getItem(legacyKey));}catch(error){return null;}
      if(legacy){
        try{storage.setItem(key,JSON.stringify(legacy));}catch(error){}
        return legacy;
      }
    }
    return null;
  }
  function getPlanet(storage,engine,worldId){
    const galaxy=readGalaxy(storage,engine);
    if(!galaxy||!engine||typeof engine.getPlanet!=="function")return null;
    return engine.getPlanet(galaxy,validId(worldId)?worldId:galaxy.activePlanetId);
  }
  function getActivePlanet(storage,engine){
    const galaxy=readGalaxy(storage,engine);
    return galaxy&&engine&&typeof engine.getActivePlanet==="function"?engine.getActivePlanet(galaxy):null;
  }
  function save(storage,worldId,snapshot){
    if(!storage||!validId(worldId)||!snapshot||typeof snapshot.state!=="string")return false;
    const value={state:snapshot.state,live:!!snapshot.live,speed:Math.max(1,Math.min(20,Number(snapshot.speed)||10)),lastWall:Math.max(0,Number(snapshot.lastWall)||Date.now())};
    try{storage.setItem(storageKey(worldId),JSON.stringify(value));return true;}catch(error){return false;}
  }
  function getGenomePool(storage,worldId){
    if(!storage||!validId(worldId))return [];
    const snapshot=load(storage,worldId,{homeWorldId:worldId,legacyKey:LEGACY_KEY});
    if(!snapshot||!snapshot.state)return [];
    try{
      const parsed=JSON.parse(snapshot.state);
      return Array.isArray(parsed.species)?parsed.species.map(s=>s&&s.dna).filter(dna=>typeof dna==="string"&&dna.length===168).slice(0,100):[];
    }catch(error){return [];}
  }
  function seedFor(worldId){
    const s=String(worldId||"planet"),input=s+"|planet-biosphere";
    let hash=2166136261;
    for(let i=0;i<input.length;i++){hash^=input.charCodeAt(i);hash=Math.imul(hash,16777619);}
    return hash>>>0||0x504c414e;
  }
  return {galaxyKey:GALAXY_KEY,legacyKey:LEGACY_KEY,prefix:PREFIX,storageKey,getHomeWorldId,getActiveWorldId,getPlanet,getActivePlanet,load,save,getGenomePool,seedFor};
});
