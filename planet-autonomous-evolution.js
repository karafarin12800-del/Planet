/* PLANET autonomous digital biosphere: deterministic, persistent and explicitly educational. */
(function (root, factory) {
  const api = factory(root && root.PlanetEvolutionModel);
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  if (root) root.PlanetAutonomousEvolution = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function (engine) {
  "use strict";
  const VERSION = 2, MAX_SPECIES = 36, MAX_EVENTS = 80, MAX_YEAR_BATCH = 10000;
  const HABITATS = ["ocean", "shore", "land", "sky"];
  const DEFAULT_ENVIRONMENT = { planetId:"earth", name:"زمین", type:"terrestrial", temperatureC:15, waterCoverage:0.71, gravity:1, atmosphere:"nitrogen-oxygen" };
  const ATMOSPHERE_FIT = {"nitrogen-oxygen":1,"nitrogen-rich":0.94,"thin-carbon-dioxide":0.82,"dense-carbon-dioxide":0.64,"hydrogen-helium":0.72,"trace-atmosphere":0.58};
  function clamp(n,lo,hi){n=Number(n);return Math.max(lo,Math.min(hi,Number.isFinite(n)?n:lo));}
  function randomFor(state){state.rng=(Math.imul(state.rng>>>0,1664525)+1013904223)>>>0;return state.rng/4294967296;}
  function makeGenome(state){
    const bases=["GCT","GAC","GTT","CCA","AAG","TTC","ACT","CGA","GGA","TGG","AAC","CTG","ATC","AGC","GTG","CAA"];
    let dna="";
    for(let g=0;g<8;g++){let gene="ATG";for(let c=0;c<5;c++)gene+=bases[Math.floor(randomFor(state)*bases.length)];gene+=["TAA","TAG","TGA"][Math.floor(randomFor(state)*3)];dna+=gene;}
    return dna;
  }
  function distance(a,b){let d=0;for(let i=3;i<Math.min(a.length,b.length)-3;i++)if(a[i]!==b[i])d++;return d;}
  function planetHabitability(e){
    e=e||DEFAULT_ENVIRONMENT;
    const temp=clamp(e.temperatureC==null?15:e.temperatureC,-273,2000),water=clamp(e.waterCoverage==null?0.71:e.waterCoverage,0,1);
    const gravity=clamp(e.gravity==null?1:e.gravity,0.05,10),type=String(e.type||"terrestrial");
    const thermal=clamp(1-Math.max(0,Math.abs(temp-18)-20)/260,0.08,1);
    const waterFit=clamp(1-Math.abs(water-0.5)*1.05,0.25,1);
    const gravityFit=clamp(1-Math.abs(Math.log2(gravity))*0.24,0.2,1);
    const atmosphere=ATMOSPHERE_FIT[e.atmosphere]||0.65;
    return clamp(thermal*0.30+waterFit*0.22+gravityFit*0.18+atmosphere*0.18+(type==="gas-giant"?0.42:1)*0.12,0.05,1);
  }
  function environmentFromPlanet(p){
    p=p||DEFAULT_ENVIRONMENT;
    const type=String(p.type||"terrestrial");
    return {planetId:String(p.id||p.planetId||"earth"),name:String(p.name||"جهان ناشناخته").slice(0,80),type,
      temperatureC:clamp(p.meanTemperatureC==null?(p.temperatureC==null?15:p.temperatureC):p.meanTemperatureC,-273,2000),
      waterCoverage:clamp(p.waterCoverage==null?0.71:p.waterCoverage,0,1),gravity:clamp(p.gravity==null?1:p.gravity,0.05,10),
      atmosphere:String(p.atmosphere||"nitrogen-oxygen").slice(0,48),surfaceAvailable:type!=="gas-giant"};
  }
  function environmentSuitability(species,environment){
    const e=environment&&environment.surfaceAvailable!==undefined?environment:environmentFromPlanet(environment);
    if(!species)return planetHabitability(e);
    const t=species.traits||{},habitat=species.habitat||"shore";
    const targetWater=habitat==="ocean"?0.88:habitat==="shore"?0.5:habitat==="sky"?0.04:0.12;
    const waterFit=clamp(1-Math.abs(e.waterCoverage-targetWater)*1.2,0.06,1);
    const optimum=habitat==="ocean"?10:habitat==="shore"?18:habitat==="sky"?-45:22;
    const tolerance=28+clamp(t.metabolicEfficiency,0,1)*48+clamp(t.protection,0,1)*22;
    const thermal=clamp(1-Math.max(0,Math.abs(e.temperatureC-optimum)-8)/(tolerance+55),0.04,1);
    const gravity=clamp(1-Math.abs(Math.log2(e.gravity))*0.34+clamp(t.protection,0,1)*0.12,0.05,1);
    const atmosphere=ATMOSPHERE_FIT[e.atmosphere]||0.62;
    let surface=1;
    if(e.type==="gas-giant")surface=habitat==="sky"?0.98:0.06;
    else if(habitat==="sky")surface=0.12;
    else if(e.type==="ice")surface=habitat==="ocean"?0.94:0.76;
    else if(e.type==="desert")surface=habitat==="land"?0.92:habitat==="shore"?0.48:0.22;
    else if(e.type==="volcanic")surface=habitat==="land"?0.68:habitat==="shore"?0.42:0.24;
    else if(e.type==="ocean")surface=habitat==="ocean"?0.98:habitat==="shore"?0.82:0.42;
    return clamp(thermal*0.30+waterFit*0.24+gravity*0.16+atmosphere*0.16+surface*0.14,0.04,1);
  }
  function phenotype(dna,habitat){
    if(!engine)throw new Error("PlanetEvolutionModel must load before the autonomous biosphere.");
    const traits=engine.phenotypeFromDNA(dna,{ageMa:4300});
    return {traits,form:engine.inferForm(traits,4300,habitat)};
  }
  function event(state,kind,species,detail){
    state.events.unshift({year:state.year,kind,speciesId:species?species.id:null,name:species?species.name:"",detail:String(detail||"")});
    state.events=state.events.slice(0,MAX_EVENTS);
  }
  function createSpecies(state,dna,habitat,parentId,population,name){
    const id=++state.serial,p=phenotype(dna,habitat);
    const s={id,parentId:parentId||null,name:name||("گونهٔ دیجیتال "+id),dna,lineageDNA:dna,habitat,
      population:Math.max(2,Math.round(population||80)),generation:0,age:0,fitness:0.5,births:0,deaths:0,
      speciationCooldown:0,traits:p.traits,form:p.form,extinct:false};
    state.species.push(s);return s;
  }
  function createState(seed,planet){
    const env=environmentFromPlanet(planet||DEFAULT_ENVIRONMENT);
    const state={version:VERSION,year:0,generation:0,serial:0,rng:(Number(seed)>>>0)||0x504c414e,
      species:[],events:[],environment:0,planetEnvironment:env};
    const founders=env.type==="gas-giant"?["sky","sky","sky","sky"]:["ocean","shore","land","shore"];
    for(let i=0;i<4;i++){
      const s=createSpecies(state,makeGenome(state),founders[i],null,90+Math.floor(randomFor(state)*70),
        ["آغازگر آبزی","کلونی ساحلی","رشته‌زی خشکی","ریزاندام گرمادوست"][i]);
      event(state,"origin",s,"پیدایش تبار بنیان‌گذار در زیست‌کرهٔ دیجیتال");
    }
    return state;
  }
  function fitnessFor(s,cycle,planetEnvironment){
    const t=s.traits;
    const habitatBias=s.habitat==="ocean"?t.waterNeed:s.habitat==="shore"?(1-Math.abs(t.waterNeed-0.5)):s.habitat==="sky"?(0.5+t.sensing*0.5):(1-t.waterNeed);
    const seasonal=0.5+0.5*Math.sin((cycle+s.id*13)/37);
    const fit=environmentSuitability(s,planetEnvironment||DEFAULT_ENVIRONMENT);
    return clamp((0.30*t.metabolicEfficiency+0.22*t.protection+0.18*t.replication+0.16*habitatBias+0.14*seasonal)*0.62+fit*0.38,0.04,0.96);
  }
  function setEnvironment(state,planet){
    state.planetEnvironment=environmentFromPlanet(planet);
    for(const s of state.species||[])s.fitness=fitnessFor(s,state.environment,state.planetEnvironment);
    return state.planetEnvironment;
  }
  function mutate(s,state){
    const rate=0.0015+(1-s.fitness)*0.0015,dna=engine.mutateSyntheticGenome(s.dna,rate,()=>randomFor(state));
    s.dna=dna;s.traits=engine.phenotypeFromDNA(dna,{ageMa:4300});s.form=engine.inferForm(s.traits,4300,s.habitat);
  }
  function advanceOneYear(state){
    state.year++;state.environment++;
    const living=state.species.filter(s=>!s.extinct);
    for(const s of living){
      s.age++;s.fitness=fitnessFor(s,state.environment,state.planetEnvironment);
      const stress=Math.max(0,0.38-s.fitness)*0.11;
      const pressure=(s.fitness-0.48)*0.055-stress+(randomFor(state)-0.5)*0.018;
      const old=s.population;s.population=Math.round(clamp(old*(1+pressure),0,250000));s.deaths+=Math.max(0,old-s.population);
      if(s.population<2){s.population=0;s.extinct=true;event(state,"extinction",s,"جمعیت به آستانهٔ انقراض مدل رسید");continue;}
      if(s.age%4===0){
        s.generation++;state.generation++;
        const offspring=Math.max(1,Math.round(s.population*(0.025+s.traits.replication*0.025)));
        s.population=Math.min(250000,s.population+offspring);s.births+=offspring;mutate(s,state);
        if(s.speciationCooldown>0)s.speciationCooldown--;
        const divergence=distance(s.dna,s.lineageDNA);
        if(divergence>=7&&s.speciationCooldown===0&&state.species.length<MAX_SPECIES){
          const child=createSpecies(state,s.dna,s.habitat,s.id,Math.max(3,Math.round(s.population*0.035)),"شاخهٔ تازهٔ "+(state.serial+1));
          child.speciationCooldown=8;s.speciationCooldown=8;s.lineageDNA=s.dna;
          event(state,"speciation",child,"جدایی ژنتیکی مدل‌شده از تبار والد #"+s.id);
        }
      }
      if(s.age%80===0&&s.traits.motility>0.55){
        const env=state.planetEnvironment||DEFAULT_ENVIRONMENT;
        const options=env.type==="gas-giant"?["sky"]:(s.habitat==="ocean"?["shore"]:s.habitat==="shore"?["land","ocean"]:s.habitat==="land"?["shore"]:["shore"]);
        const next=options[Math.floor(randomFor(state)*options.length)];
        if(next&&next!==s.habitat&&randomFor(state)<s.traits.sensing*0.22){
          const previous=s.habitat;s.habitat=next;const p=phenotype(s.dna,next);s.traits=p.traits;s.form=p.form;
          event(state,"migration",s,"گسترش از "+previous+" به زیستگاه "+next);
        }
      }
    }
    state.species.sort((a,b)=>b.population-a.population);
    if(state.species.length>MAX_SPECIES){
      const keep=state.species.filter(s=>!s.extinct).slice(0,MAX_SPECIES),slots=Math.max(0,MAX_SPECIES-keep.length);
      state.species=keep.concat(slots?state.species.filter(s=>s.extinct).slice(-slots):[]);
    }
  }
  function advanceYears(state,years,onProgress){
    const total=Math.floor(clamp(years,0,MAX_YEAR_BATCH));
    for(let i=0;i<total;i++){advanceOneYear(state);if(onProgress&&(i%25===0||i===total-1))onProgress(i+1,total,state);}
    return state;
  }
  function serialize(state){
    return JSON.stringify({version:VERSION,year:state.year,generation:state.generation,serial:state.serial,rng:state.rng,
      environment:state.environment,planetEnvironment:environmentFromPlanet(state.planetEnvironment||DEFAULT_ENVIRONMENT),
      species:state.species,events:state.events});
  }
  function restore(raw){
    const data=typeof raw==="string"?JSON.parse(raw):raw;
    if(!data||(data.version!==1&&data.version!==VERSION)||!Array.isArray(data.species))throw new Error("Saved biosphere data is invalid.");
    const state={version:VERSION,year:Math.max(0,Number(data.year)||0),generation:Math.max(0,Number(data.generation)||0),
      serial:Math.max(0,Number(data.serial)||0),rng:Number(data.rng)>>>0,environment:Number(data.environment)||0,
      planetEnvironment:environmentFromPlanet(data.planetEnvironment||DEFAULT_ENVIRONMENT),
      species:data.species.slice(0,MAX_SPECIES),events:Array.isArray(data.events)?data.events.slice(0,MAX_EVENTS):[]};
    state.species=state.species.filter(s=>s&&typeof s.dna==="string"&&engine.normalizeSyntheticGenome(s.dna))
      .map(s=>{const p=phenotype(s.dna,s.habitat);return Object.assign({},s,p);});
    return state;
  }
  function selfTest(){
    const a=createState(12345),initial=a.species.length;advanceYears(a,40);
    const b=restore(serialize(a));
    return {ok:initial===4&&b.year===40&&b.species.length>=4&&b.species.every(s=>engine.normalizeSyntheticGenome(s.dna)&&s.traits&&s.form)&&!!b.planetEnvironment,
      years:b.year,species:b.species.length,engine:"PlanetAutonomousEvolution-v2"};
  }
  return {version:VERSION,createState,advanceYears,advanceOneYear,serialize,restore,selfTest,
    environmentFromPlanet,planetHabitability,environmentSuitability,fitnessFor,setEnvironment};
});
