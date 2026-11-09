/* PLANET Galaxy Foundation
 * Deterministic galaxy/system/planet catalog with isolated world identities.
 * This module stores galaxy metadata only; it does not fabricate planetary life.
 */
(function(root,factory){
  const api=factory();
  if(typeof module!=="undefined"&&module.exports) module.exports=api;
  if(root) root.PlanetGalaxyEngine=api;
})(typeof globalThis!=="undefined"?globalThis:this,function(){
  "use strict";
  const VERSION=3, MAX_SYSTEMS=24, MAX_PLANETS_PER_SYSTEM=8, TARGET_SYSTEMS=17, MAX_EVENTS=50;
  const PLANET_TYPES=[
    {id:"terrestrial",label:"سنگی",biomes:["دشت","کوهستان","بیابان","جنگل"],radius:[4200,8200],water:[0.05,0.65],temp:[-25,42]},
    {id:"ocean",label:"اقیانوسی",biomes:["اقیانوس","جزیره","آب‌های کم‌عمق"],radius:[5000,10500],water:[0.72,0.99],temp:[-5,35]},
    {id:"ice",label:"یخی",biomes:["یخزار","اقیانوس زیرسطحی","شکاف یخی"],radius:[2500,7800],water:[0.35,0.95],temp:[-150,-5]},
    {id:"desert",label:"بیابانی",biomes:["تپه‌های شنی","درهٔ سنگی","دشت نمکی"],radius:[3000,9000],water:[0,0.12],temp:[15,95]},
    {id:"volcanic",label:"آتشفشانی",biomes:["دشت گدازه","کوه آتشفشانی","غار معدنی"],radius:[3500,9500],water:[0,0.18],temp:[80,450]},
    {id:"gas-giant",label:"غول گازی",biomes:["ابرهای فوقانی","کمربندهای طوفانی"],radius:[30000,85000],water:[0,0.03],temp:[-180,30]}
  ];
  const SYSTEM_NAMES=["آذر","نیلوفر","سپهر","مهرگان","روشن","باران","کیهان","آرمان","تابان","مهتاب","سروش","پگاه"];
  const PLANET_NAMES=["آوید","رایا","هیراد","مانا","ویرا","آترین","دانا","آریو","نیوا","هانا","آرکا","سایا"];
  const STAR_COLORS=["#8fc8ff","#ffd28a","#ff9a83","#d7b8ff","#fff0bd"];
  const clamp=(v,a,b)=>Math.max(a,Math.min(b,Number.isFinite(Number(v))?Number(v):a));
  function hash32(value){let h=2166136261;const s=String(value);for(let i=0;i<s.length;i++){h^=s.charCodeAt(i);h=Math.imul(h,16777619);}return h>>>0;}
  function random(seed){let s=seed>>>0;return function(){s=(Math.imul(s,1664525)+1013904223)>>>0;return s/4294967296;};}
  function pick(rng,list){return list[Math.floor(rng()*list.length)];}
  function range(rng,pair){return pair[0]+rng()*(pair[1]-pair[0]);}
  function planetEconomy(planet){
    const temp=Number(planet.meanTemperatureC)||0,water=clamp(planet.waterCoverage,0,1),gravity=clamp(planet.gravity||1,.05,10);
    const thermal=clamp(1-Math.max(0,Math.abs(temp-18)-18)/260,.08,1);
    const waterFit=clamp(1-Math.abs(water-.52)*1.15,.12,1);
    const gravityFit=clamp(1-Math.abs(Math.log2(gravity))*.24,.18,1);
    const atmosphere={"nitrogen-oxygen":1,"nitrogen-rich":.94,"thin-carbon-dioxide":.82,"dense-carbon-dioxide":.64,"hydrogen-helium":.52,"trace-atmosphere":.45}[planet.atmosphere]||.62;
    const surface=planet.type==="gas-giant"?.42:planet.type==="volcanic"?.58:planet.type==="ice"?.76:planet.type==="desert"?.72:1;
    const life=clamp(Math.round((thermal*.28+waterFit*.24+gravityFit*.16+atmosphere*.18+surface*.14)*100),5,100);
    const extreme=clamp(Math.abs(temp-18)/180,0,1),diversity=clamp((planet.biomes||[]).length/5,0,1);
    const special=clamp(Math.round(25+life*.36+extreme*18+diversity*18+(planet.type==="volcanic"||planet.type==="gas-giant"?12:0)),10,100);
    planet.lifePotential=life;planet.specialSpeciesPotential=special;planet.priceTokens=clamp(150+Math.round(850*(life*.72+special*.28)/100),150,1000);planet.creatureCapacity=2;
    return planet;
  }
  function makePlanet(systemId,index,rng,home){
    const type=home?PLANET_TYPES[0]:pick(rng,PLANET_TYPES),id=systemId+"-p"+(index+1);
    const water=home?0.71:range(rng,type.water),temperature=home?15:range(rng,type.temp);
    return planetEconomy({id,name:home?"زمین":pick(rng,PLANET_NAMES),systemId,seed:hash32(id+"|"+Math.floor(rng()*4294967295)),
      type:type.id,typeLabel:type.label,radiusKm:Math.round(range(rng,type.radius)),gravity:Math.round((home?1:range(rng,[0.25,2.4]))*100)/100,
      meanTemperatureC:Math.round(temperature),waterCoverage:Math.round(water*1000)/1000,
      atmosphere:home?"nitrogen-oxygen":pick(rng,["thin-carbon-dioxide","dense-carbon-dioxide","nitrogen-rich","hydrogen-helium","trace-atmosphere"]),
      biomes:home?["اقیانوس","جنگل","دشت","بیابان","کوهستان"]:type.biomes.slice(),discovered:!!home,visited:!!home,home:!!home,worldStatus:home?"active":"uninitialized"});
  }
  function makeSystem(index,seed,isHome){
    const rng=random(hash32(seed+"|system|"+index));
    const id="system-"+String(index+1).padStart(2,"0");
    const count=isHome?8:6+Math.floor(rng()*3);
    const planets=[];
    for(let i=0;i<count;i++) planets.push(makePlanet(id,i,rng,isHome&&i===0));
    return {id,name:isHome?"منظومهٔ آغاز":pick(rng,SYSTEM_NAMES),seed:hash32(seed+"|"+id),
      star:{type:pick(rng,["G","K","M","F"]),color:pick(rng,STAR_COLORS),luminosity:Math.round(range(rng,[0.08,1.8])*100)/100},
      discovered:!!isHome,planets};
  }
  function createGalaxy(seed){
    const normalized=Number(seed)>>>0||0x504c414e;
    const systems=[];
    for(let i=0;i<TARGET_SYSTEMS;i++) systems.push(makeSystem(i,normalized,i===0));
    const home=systems[0].planets[0];
    assignCommercePlanetIds({systems});
    return {version:VERSION,seed:normalized,year:0,activeSystemId:systems[0].id,activePlanetId:home.id,
      systems,events:[{year:0,kind:"origin",systemId:systems[0].id,planetId:home.id,detail:"آغاز جهان در سیارهٔ خانه"}]};
  }
  function assignCommercePlanetIds(galaxy){
    let index=0;const purchasable=[];
    for(const system of galaxy.systems||[])for(const planet of system.planets||[]){
      if(planet.home){planet.commercePlanetId=null;continue;}
      index++;
      if(index<=100){planet.commercePlanetId="market-world-"+String(index).padStart(3,"0");planet.baseName=planet.baseName||planet.name;planet.name=planet.baseName+" "+String(index).padStart(3,"0");purchasable.push(planet);}
      else planet.commercePlanetId=null;
    }
    const score=p=>Number(p.lifePotential||0)*.72+Number(p.specialSpeciesPotential||0)*.28;
    purchasable.slice().sort((a,b)=>score(a)-score(b)||a.commercePlanetId.localeCompare(b.commercePlanetId))
      .forEach((planet,rank)=>{planet.priceTokens=100+Math.round(rank*900/Math.max(1,purchasable.length-1));});
    return galaxy;
  }
  function findSystem(galaxy,id){return galaxy.systems.find(s=>s.id===id)||null;}
  function findPlanet(galaxy,id){for(const s of galaxy.systems){const p=s.planets.find(x=>x.id===id);if(p)return {system:s,planet:p};}return null;}
  function record(galaxy,kind,system,planet,detail){galaxy.events.unshift({year:galaxy.year,kind,systemId:system.id,planetId:planet?planet.id:null,detail:String(detail||"")});galaxy.events=galaxy.events.slice(0,MAX_EVENTS);}
  function discoverPlanet(galaxy,planetId){
    const found=findPlanet(galaxy,planetId);if(!found)return false;
    const p=found.planet,s=found.system;if(p.discovered)return false;
    p.discovered=true;s.discovered=true;p.worldStatus="discovered";
    record(galaxy,"discovery",s,p,"سیاره برای نخستین بار کشف شد");
    return true;
  }
  function selectPlanet(galaxy,planetId){
    const found=findPlanet(galaxy,planetId);if(!found||!found.planet.discovered)return false;
    galaxy.activeSystemId=found.system.id;galaxy.activePlanetId=found.planet.id;
    found.planet.visited=true;if(found.planet.worldStatus==="discovered")found.planet.worldStatus="ready";
    record(galaxy,"visit",found.system,found.planet,"سیاره به‌عنوان جهان فعال انتخاب شد");
    return true;
  }
  function setYear(galaxy,year){galaxy.year=Math.max(0,Math.floor(clamp(year,0,Number.MAX_SAFE_INTEGER)));return galaxy.year;}
  function getPlanet(galaxy,id){const found=findPlanet(galaxy,id);return found?JSON.parse(JSON.stringify(found.planet)):null;}
  function getActivePlanet(galaxy){return getPlanet(galaxy,galaxy.activePlanetId);}
  function getSummary(galaxy){
    let total=0,discovered=0,visited=0;
    for(const s of galaxy.systems)for(const p of s.planets){total++;if(p.discovered)discovered++;if(p.visited)visited++;}
    return {systems:galaxy.systems.length,planets:total,discovered,visited,year:galaxy.year,activePlanetId:galaxy.activePlanetId};
  }
  function serialize(galaxy){return JSON.stringify(galaxy);}
  function restore(serialized){
    const data=typeof serialized==="string"?JSON.parse(serialized):JSON.parse(JSON.stringify(serialized));
    if(!data||![1,2,VERSION].includes(data.version)||!Array.isArray(data.systems)||data.systems.length<1||data.systems.length>MAX_SYSTEMS)throw new Error("Invalid or unsupported Planet galaxy save.");
    let planetCount=0,activeFound=false;
    for(const s of data.systems){
      if(!s||typeof s.id!=="string"||!Array.isArray(s.planets)||s.planets.length>MAX_PLANETS_PER_SYSTEM)throw new Error("Invalid star system in Planet save.");
      planetCount+=s.planets.length;
      for(const p of s.planets){if(!p||typeof p.id!=="string"||p.systemId!==s.id)throw new Error("Invalid planet record in Planet save.");if(p.id===data.activePlanetId&&p.discovered)activeFound=true;}
    }
    if(planetCount>MAX_SYSTEMS*MAX_PLANETS_PER_SYSTEM||!activeFound||!findSystem(data,data.activeSystemId))throw new Error("Planet galaxy save has an invalid active world.");
    data.events=Array.isArray(data.events)?data.events.slice(0,MAX_EVENTS):[];
    data.year=Math.max(0,Math.floor(clamp(data.year,0,Number.MAX_SAFE_INTEGER)));
    for(const system of data.systems)for(const planet of system.planets)planetEconomy(planet);
    for(let i=data.systems.length;i<TARGET_SYSTEMS&&i<MAX_SYSTEMS;i++)data.systems.push(makeSystem(i,Number(data.seed)>>>0||0x504c414e,false));
    data.version=VERSION;assignCommercePlanetIds(data);
    return data;
  }
  return {version:VERSION,maxSystems:MAX_SYSTEMS,maxPlanetsPerSystem:MAX_PLANETS_PER_SYSTEM,
    createGalaxy,discoverPlanet,selectPlanet,setYear,getPlanet,getActivePlanet,getSummary,serialize,restore,planetEconomy,assignCommercePlanetIds};
});
