/* PLANET autonomous digital biosphere: deterministic, persistent and explicitly educational. */
(function (root, factory) {
  const api = factory(root && root.PlanetEvolutionModel);
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  if (root) root.PlanetAutonomousEvolution = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function (engine) {
  "use strict";
  const VERSION = 7, MAX_SPECIES = 100, EARTH_SPECIES_COUNT = 100, OFFWORLD_SPECIES_COUNT = 2, OFFWORLD_SPECIES_LIMIT = 24, MIN_VISIBLE_BODY_LENGTH_CM = 2, EARTH_MIN_MARKET_SIZE_CM = 45, ALIEN_MIN_MARKET_SIZE_CM = 5, MAX_EVENTS = 80, MAX_YEAR_BATCH = 10000;
  const HABITATS = ["ocean", "shore", "land", "sky"];
  const DEFAULT_ENVIRONMENT = { planetId:"earth", name:"زمین", type:"terrestrial", temperatureC:15, waterCoverage:0.71, gravity:1, atmosphere:"nitrogen-oxygen" };
  const ATMOSPHERE_FIT = {"nitrogen-oxygen":1,"nitrogen-rich":0.94,"thin-carbon-dioxide":0.82,"dense-carbon-dioxide":0.64,"hydrogen-helium":0.72,"trace-atmosphere":0.58};
  const TROPHIC_ROLES = ["producer","grazer","predator","decomposer"];
  const ROLE_LABELS = {producer:"تولیدکننده",grazer:"گیاه‌خوار",predator:"شکارچی",decomposer:"تجزیه‌گر"};
  function createResourcePools(environment){
    const e=environment||DEFAULT_ENVIRONMENT, habitats=e.type==="gas-giant"?["sky"]:HABITATS;
    const pools={};
    habitats.forEach((habitat,index)=>{
      const water=habitat==="ocean"?0.9:habitat==="shore"?0.58:habitat==="sky"?0.04:0.14;
      const fit=clamp(1-Math.abs((e.waterCoverage==null?0.71:e.waterCoverage)-water),0.15,1);
      pools[habitat]={biomass:420+Math.round(fit*260),nutrients:620+Math.round(fit*180),detritus:80,capacity:900+Math.round(fit*600),renewal:0.018+fit*0.012,season:index*0.7};
    });
    return pools;
  }
  function roleForSpecies(species){
    if(species&&TROPHIC_ROLES.includes(species.trophicRole))return species.trophicRole;
    const traits=species&&species.traits||{};
    const score=clamp(traits.metabolicEfficiency,0,1)*0.38+clamp(traits.socialCooperation,0,1)*0.22+clamp(traits.protection,0,1)*0.18+clamp(traits.sensing,0,1)*0.22;
    const id=Number(species&&species.id)||1;
    return TROPHIC_ROLES[(Math.floor(score*100)+id*7)%TROPHIC_ROLES.length];
  }
  function ensureEcology(state){
    if(!state.resources||typeof state.resources!=="object")state.resources=createResourcePools(state.planetEnvironment);
    for(const s of state.species||[])if(!TROPHIC_ROLES.includes(s.trophicRole))s.trophicRole=roleForSpecies(s);
    if(!Number.isFinite(state.detritus))state.detritus=0;
    return state.resources;
  }

  function clamp(n,lo,hi){n=Number(n);return Math.max(lo,Math.min(hi,Number.isFinite(n)?n:lo));}
  function hash32(value){let h=2166136261;const s=String(value==null?"":value);for(let i=0;i<s.length;i++){h^=s.charCodeAt(i);h=Math.imul(h,16777619);}return h>>>0;}
  function hashUnit(value){return hash32(value)/4294967295;}
  function fingerprintForPlanet(p){
    p=p||DEFAULT_ENVIRONMENT;
    const identity=[p.id||p.planetId||"unknown",p.seed||0,p.type||"terrestrial",p.meanTemperatureC==null?p.temperatureC:p.meanTemperatureC,
      p.waterCoverage,p.gravity,p.atmosphere||"nitrogen-oxygen",(p.biomes||[]).slice().sort().join(","),p.priceTokens||p.price||0,p.specialSpeciesPotential||0].join("|");
    return hash32("PLANET-DNA-SIGNATURE|"+identity).toString(16).padStart(8,"0").toUpperCase();
  }
  function rarityTierForPrice(price){const value=Math.max(0,Number(price)||0);return value>=800?"mythic":value>=600?"legendary":value>=400?"epic":value>=200?"rare":"common";}
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
    const planetId=String(p.id||p.planetId||"earth");
    return {planetId,name:String(p.name||"جهان ناشناخته").slice(0,80),type,home:p.home===true||planetId==="earth"||planetId==="system-01-p1",
      temperatureC:clamp(p.meanTemperatureC==null?(p.temperatureC==null?15:p.temperatureC):p.meanTemperatureC,-273,2000),
      waterCoverage:clamp(p.waterCoverage==null?0.71:p.waterCoverage,0,1),gravity:clamp(p.gravity==null?1:p.gravity,0.05,10),
      atmosphere:String(p.atmosphere||"nitrogen-oxygen").slice(0,48),surfaceAvailable:type!=="gas-giant",purchased:p.purchased===true,earthSeeded:p.earthSeeded===true,
      seed:Number(p.seed)||0,biomes:Array.isArray(p.biomes)?p.biomes.map(String).slice(0,12):[],priceTokens:Math.max(0,Number(p.priceTokens||p.price)||0),
      lifePotential:clamp(p.lifePotential==null?50:p.lifePotential,0,100),specialSpeciesPotential:clamp(p.specialSpeciesPotential==null?50:p.specialSpeciesPotential,0,100),
      rarityTier:rarityTierForPrice(p.priceTokens||p.price),geneticFingerprint:fingerprintForPlanet(p)};
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
  function phenotype(dna,habitat,environment){
    if(!engine)throw new Error("PlanetEvolutionModel must load before the autonomous biosphere.");
    const traits=engine.phenotypeFromDNA(dna,{ageMa:4300}),env=environment||DEFAULT_ENVIRONMENT;
    const fingerprint=env.geneticFingerprint||fingerprintForPlanet(env),key=fingerprint+"|"+dna,appearance=traits.appearance||{};
    const v=channel=>hashUnit(key+"|"+channel),gravity=clamp(env.gravity==null?1:env.gravity,.05,10),temperature=Number(env.temperatureC)||15;
    const compact=clamp(1+Math.log2(gravity)*.12,.72,1.30);
    appearance.bodyLength=clamp((Number(appearance.bodyLength)||1)*(.78+v("length")*.48)/compact,.35,2.8);
    appearance.bodyWidth=clamp((Number(appearance.bodyWidth)||1)*(.78+v("width")*.52)*compact,.25,2.8);
    appearance.bodyHeight=clamp((Number(appearance.bodyHeight)||1)*(.76+v("height")*.58)*(temperature>80?1.12:temperature< -30?.9:1),.2,2.8);
    appearance.headSize=clamp((Number(appearance.headSize)||1)*(.72+v("head")*.62),.15,2.6);
    appearance.limbLength=clamp((Number(appearance.limbLength)||1)*(.68+v("limbs")*.78)/Math.sqrt(gravity),.12,2.8);
    appearance.limbThickness=clamp((Number(appearance.limbThickness)||1)*(.72+v("thickness")*.68)*compact,.1,2.5);
    appearance.appendageLength=clamp((Number(appearance.appendageLength)||1)*(.58+v("appendages")*.92),.05,2.8);
    appearance.tailLength=clamp((Number(appearance.tailLength)||1)*(.45+v("tail")*1.25),.02,3);
    appearance.wingSpan=clamp((Number(appearance.wingSpan)||.2)*(.35+v("wings")*1.55),.02,3);
    appearance.finSize=clamp((Number(appearance.finSize)||.2)*(.35+v("fins")*1.5),.02,2.8);
    appearance.armorCoverage=clamp((Number(appearance.armorCoverage)||0)*.55+v("armor")*.55+(env.specialSpeciesPotential||50)/500,0,1);
    appearance.hue=((Number(appearance.hue)||0)+Math.round(v("hue")*360))%360;
    appearance.limbCount=v("limb-plan")<.22?2:v("limb-plan")<.70?4:6;
    appearance.segmentCount=2+Math.floor(v("segments")*9);appearance.pattern=Math.floor(v("pattern")*9);appearance.surface=Math.floor(v("surface")*7);
    traits.estimatedBodyLengthCm=Number((traits.estimatedBodyLengthCm*(.86+v("size")*.28)/Math.sqrt(gravity)).toFixed(2));
    traits.estimatedBodyLengthMm=Number((traits.estimatedBodyLengthCm*10).toFixed(1));
    traits.protection=clamp(traits.protection+(v("defense")-.5)*.18+(env.specialSpeciesPotential||50)/1200,0,1);
    traits.motility=clamp(traits.motility+(v("mobility")-.5)*.2,0,1);
    traits.waterNeed=clamp(traits.waterNeed+(env.waterCoverage-.5)*.12,0,1);
    traits.planetMorphology={fingerprint,profileKey:hash32(key).toString(16).toUpperCase(),gravityClass:gravity>=1.4?"high":gravity<=.7?"low":"standard",
      climateClass:temperature>=80?"hot":temperature<=-30?"cold":"temperate",variation:v("identity")};
    return {traits,form:engine.inferForm(traits,4300,habitat)};
  }
  function event(state,kind,species,detail){
    state.events.unshift({year:state.year,kind,speciesId:species?species.id:null,name:species?species.name:"",detail:String(detail||"")});
    state.events=state.events.slice(0,MAX_EVENTS);
  }
  function isMarketEligible(species){
    if(!species||species.special!==true)return false;
    const length=Number(species.bodyLengthCm||species.traits&&species.traits.estimatedBodyLengthCm)||0;
    return species.originWorldType==="earth"?length>=EARTH_MIN_MARKET_SIZE_CM:length>ALIEN_MIN_MARKET_SIZE_CM;
  }
  function createSpecies(state,dna,habitat,parentId,population,name,trophicRole,metadata){
    const id=++state.serial,p=phenotype(dna,habitat,state.planetEnvironment),meta=metadata||{};
    const originWorldType=meta.originWorldType||(state.planetEnvironment.home?"earth":"alien");
    const special=meta.special===true,minimumSize=MIN_VISIBLE_BODY_LENGTH_CM+0.01;
    const s={id,parentId:parentId||null,name:name||("گونهٔ دیجیتال "+id),dna,lineageDNA:dna,habitat,
      population:Math.max(2,Math.round(population||80)),generation:0,age:0,fitness:0.5,births:0,deaths:0,
      speciationCooldown:0,traits:p.traits,form:p.form,bodyLengthCm:Math.max(minimumSize,Number(p.traits.estimatedBodyLengthCm)||minimumSize),
      special,rarityScore:clamp(meta.rarityScore||0,0,100),originWorldType,
      extinct:false,trophicRole:TROPHIC_ROLES.includes(trophicRole)?trophicRole:null};
    s.trophicRole=s.trophicRole||roleForSpecies(s);
    s.marketEligible=isMarketEligible(s);
    state.species.push(s);return s;
  }
  function crossGenome(state,parentA,parentB){
    const a=engine.normalizeSyntheticGenome(String(parentA||"")),b=engine.normalizeSyntheticGenome(String(parentB||""));
    if(!a||!b)throw new Error("Earth genome pool contains an invalid genome.");
    let child="";
    for(let gene=0;gene<8;gene++){
      const start=gene*21,source=randomFor(state)<0.5?a:b;
      child+=source.slice(start,start+21);
    }
    return engine.mutateSyntheticGenome(child,0.025,()=>randomFor(state));
  }
  function createEarthGenomePool(seed){
    const poolState={rng:(Number(seed)>>>0)||0x504c414e};
    return Array.from({length:EARTH_SPECIES_COUNT},()=>makeGenome(poolState));
  }
  function createState(seed,planet,sourceGenomes){
    const env=environmentFromPlanet(planet||DEFAULT_ENVIRONMENT);env.earthSeeded=!env.home;
    const state={version:VERSION,year:0,generation:0,serial:0,rng:(Number(seed)>>>0)||0x504c414e,
      species:[],events:[],environment:0,planetEnvironment:env,resources:createResourcePools(env),detritus:0};
    if(env.home){
      const habitats=["ocean","shore","land","ocean","shore","land"];
      const roles=["producer","grazer","predator","decomposer"];
      for(let i=0;i<EARTH_SPECIES_COUNT;i++){
        const habitat=habitats[i%habitats.length],role=roles[i%roles.length];
        const s=createSpecies(state,makeGenome(state),habitat,null,90+Math.floor(randomFor(state)*210),
          "گونهٔ زمینی "+String(i+1).padStart(3,"0"),role,{special:false,originWorldType:"earth"});
        event(state,"origin",s,"گونهٔ پایهٔ زمین؛ برای همهٔ بازیکنان مشترک و غیرقابل‌فروش");
      }
    }else{
      const pool=(Array.isArray(sourceGenomes)?sourceGenomes:[]).map(x=>typeof x==="string"?x:x&&x.dna).filter(x=>engine.normalizeSyntheticGenome(String(x||"")));
      const genomes=pool.length>=2?pool:createEarthGenomePool(state.rng);
      for(let i=0;i<OFFWORLD_SPECIES_COUNT;i++){
        const aIndex=Math.floor(randomFor(state)*genomes.length),bIndex=(aIndex+1+Math.floor(randomFor(state)*(genomes.length-1)))%genomes.length;
        const dna=crossGenome(state,genomes[aIndex],genomes[bIndex]);
        const habitat=env.type==="gas-giant"?"sky":(i===0?"shore":"land");
        const s=createSpecies(state,dna,habitat,null,45+Math.floor(randomFor(state)*65),
          "گونهٔ بنیان‌گذار سیاره "+(i+1),i===0?"grazer":"predator",{special:false,rarityScore:0,originWorldType:"alien"});
        event(state,"origin",s,"گونهٔ ترکیبی ویژه از ژنوم‌های زمین، سازگارشده با محیط این سیاره");
      }
    }
    return state;
  }
  function visibleSpecies(state){
    return (state&&Array.isArray(state.species)?state.species:[]).filter(s=>Number(s.bodyLengthCm||s.traits&&s.traits.estimatedBodyLengthCm)>MIN_VISIBLE_BODY_LENGTH_CM);
  }
  function speciesLimit(state){return state&&state.planetEnvironment&&state.planetEnvironment.home?EARTH_SPECIES_COUNT:OFFWORLD_SPECIES_LIMIT;}
  function fitnessFor(s,cycle,planetEnvironment){
    const t=s.traits;
    const habitatBias=s.habitat==="ocean"?t.waterNeed:s.habitat==="shore"?(1-Math.abs(t.waterNeed-0.5)):s.habitat==="sky"?(0.5+t.sensing*0.5):(1-t.waterNeed);
    const seasonal=0.5+0.5*Math.sin((cycle+s.id*13)/37);
    const fit=environmentSuitability(s,planetEnvironment||DEFAULT_ENVIRONMENT);
    return clamp((0.30*t.metabolicEfficiency+0.22*t.protection+0.18*t.replication+0.16*habitatBias+0.14*seasonal)*0.62+fit*0.38,0.04,0.96);
  }
  function setEnvironment(state,planet){
    const previous=state.planetEnvironment||{};state.planetEnvironment=environmentFromPlanet(planet);
    state.planetEnvironment.earthSeeded=!state.planetEnvironment.home;
    if(planet&&planet.purchased!==undefined)state.planetEnvironment.purchased=planet.purchased===true;
    else state.planetEnvironment.purchased=previous.planetId===state.planetEnvironment.planetId&&previous.purchased===true;
    for(const s of state.species||[])s.fitness=fitnessFor(s,state.environment,state.planetEnvironment);
    return state.planetEnvironment;
  }
  function setPlanetPurchased(state,purchased){if(!state||!state.planetEnvironment)return false;state.planetEnvironment.purchased=!!purchased;return state.planetEnvironment.purchased;}
  function mutate(s,state){
    const fastPurchasedEarthSeed=!!(state.planetEnvironment.purchased&&state.planetEnvironment.earthSeeded);
    const rate=(0.022+(1-s.fitness)*0.014)*(fastPurchasedEarthSeed?1.75:1),dna=engine.mutateSyntheticGenome(s.dna,rate,()=>randomFor(state));
    s.dna=dna;const p=phenotype(dna,s.habitat,state.planetEnvironment);s.traits=p.traits;s.form=p.form;
    const minimumSize=MIN_VISIBLE_BODY_LENGTH_CM+0.01;
    s.bodyLengthCm=Math.max(minimumSize,Number(s.traits.estimatedBodyLengthCm)||minimumSize);
    const earth=!!state.planetEnvironment.home,divergence=distance(s.dna,s.lineageDNA||s.dna);
    const tier=state.planetEnvironment.rarityTier||"common",tierBonus={common:0,rare:1,epic:2,legendary:3,mythic:4}[tier]||0;
    const requiredDivergence=earth?22:(fastPurchasedEarthSeed?Math.max(3,5-tierBonus):Math.max(5,8-tierBonus)),requiredGeneration=earth?18:(fastPurchasedEarthSeed?Math.max(2,3-Math.floor(tierBonus/2)):Math.max(3,6-tierBonus)),requiredSize=earth?EARTH_MIN_MARKET_SIZE_CM:ALIEN_MIN_MARKET_SIZE_CM;
    const sizeReady=earth?s.bodyLengthCm>=requiredSize:s.bodyLengthCm>requiredSize;
    if(!s.special&&divergence>=requiredDivergence&&s.generation>=requiredGeneration&&sizeReady){
      s.special=true;s.rarityScore=clamp(52+divergence*0.8+s.fitness*18+(state.planetEnvironment.specialSpeciesPotential||0)*0.22+tierBonus*4,0,100);
      event(state,"speciation",s,"این تبار پس از جهش‌های پی‌درپی و سازگاری محیطی به گونهٔ ویژه تبدیل شد.");
    }
    s.marketEligible=isMarketEligible(s);
  }

  function advanceOneYear(state){
    ensureEcology(state);
    state.year++;state.environment++;
    const pools=state.resources,live=state.species.filter(s=>!s.extinct);
    const startPopulation=new Map(live.map(s=>[s.id,s.population]));
    const predatorMeals=new Map(),grazerDemand={};
    Object.keys(pools).forEach(h=>{
      const r=pools[h],season=0.72+0.28*Math.sin((state.environment/37)+r.season);
      const nutrientReturn=Math.min(36,r.detritus*0.055);
      r.nutrients=clamp(r.nutrients+nutrientReturn-r.nutrients*r.renewal*0.32,80,1800);
      r.detritus=Math.max(0,r.detritus*0.91);
      r.biomass=clamp(r.biomass+r.nutrients*r.renewal*season-r.biomass*0.012,20,r.capacity);
      r.nutrients=clamp(r.nutrients-r.biomass*0.003,40,1800);
      grazerDemand[h]=live.filter(s=>s.habitat===h&&s.trophicRole==="grazer").reduce((n,s)=>n+s.population*(0.018+s.traits.metabolicEfficiency*0.012),0);
    });
    // Predators draw from local grazer populations; kills are shared across predators to avoid order bias.
    for(const h of Object.keys(pools)){
      const predators=live.filter(s=>s.habitat===h&&s.trophicRole==="predator");
      const prey=live.filter(s=>s.habitat===h&&s.trophicRole==="grazer"&&s.population>0);
      const preyTotal=prey.reduce((n,s)=>n+s.population,0);
      const predatorTotal=predators.reduce((n,s)=>n+s.population,0);
      if(preyTotal>0&&predatorTotal>0){
        const killBudget=Math.min(Math.floor(preyTotal*0.16),Math.max(0,Math.floor(predatorTotal*0.028)));
        let remaining=killBudget;
        prey.forEach((s,index)=>{
          const killed=index===prey.length-1?remaining:Math.min(s.population,Math.floor(killBudget*s.population/preyTotal));
          if(killed>0){s.population-=killed;s.deaths+=killed;remaining-=killed;predatorMeals.set(h,(predatorMeals.get(h)||0)+killed);}
        });
        if(remaining>0&&prey.length) {const s=prey[0],k=Math.min(s.population,remaining);s.population-=k;s.deaths+=k;predatorMeals.set(h,(predatorMeals.get(h)||0)+k);}
        if(killBudget>0)event(state,"predation",predators[0],"شکار "+killBudget+" واحد جمعیت از زنجیرهٔ غذایی");
      }
    }
    // Resource competition is calculated from the same yearly snapshot for every species in a habitat.
    const resourceShares={};
    Object.keys(pools).forEach(h=>{
      const demand=grazerDemand[h]||0,available=pools[h].biomass;
      resourceShares[h]=demand>0?clamp(available/(available+demand*2.2),0.12,1):1;
      const grazers=live.filter(s=>s.habitat===h&&s.trophicRole==="grazer");
      const producers=live.filter(s=>s.habitat===h&&s.trophicRole==="producer");
      const totalProducer=producers.reduce((n,s)=>n+s.population,0);
      const share=producers.length?clamp(pools[h].nutrients/(pools[h].nutrients+totalProducer*0.16),0.16,1):1;
      producers.forEach(s=>{s.resourceShare=share;});
      if(grazers.length>1&&resourceShares[h]<0.72&&state.year%12===0)
        event(state,"competition",grazers[0],"رقابت چند گونه برای منابع محدود زیستگاه");
    });
    const deathsThisYear=[];
    for(const s of live){
      s.age++;s.fitness=fitnessFor(s,state.environment,state.planetEnvironment);
      const pool=pools[s.habitat]||pools.shore||pools.sky;
      const role=s.trophicRole;
      let food=1,roleGrowth=0;
      if(role==="producer"){
        food=clamp((pool.nutrients/(pool.nutrients+260))*((s.resourceShare||1)),0.08,1);
        roleGrowth=(food-0.48)*0.052;
      }else if(role==="grazer"){
        food=resourceShares[s.habitat]||0.35;
        const hunted=Math.max(0,(startPopulation.get(s.id)||s.population)-s.population);
        food=clamp(food-hunted/Math.max(1,startPopulation.get(s.id)||s.population)*0.45,0.05,1);
        roleGrowth=(food-0.52)*0.064;
        pool.biomass=Math.max(0,pool.biomass-s.population*(0.004+s.traits.metabolicEfficiency*0.003));
      }else if(role==="predator"){
        const meals=predatorMeals.get(s.habitat)||0;
        const predators=live.filter(x=>x.habitat===s.habitat&&x.trophicRole==="predator").reduce((n,x)=>n+x.population,0);
        food=clamp((meals/Math.max(1,predators*0.028))*0.72,0.06,1);
        roleGrowth=(food-0.46)*0.058;
      }else{
        food=clamp((state.detritus+pool.detritus+1)/(state.detritus+pool.detritus+260),0.12,0.95);
        roleGrowth=(food-0.42)*0.035;
        pool.nutrients=clamp(pool.nutrients+s.population*0.0018,40,1800);
      }
      const capacity=pool.capacity*(role==="producer"?1.8:role==="predator"?0.48:role==="decomposer"?0.72:1.0);
      const crowding=clamp(s.population/Math.max(1,capacity),0,2);
      const competitionPenalty=Math.max(0,crowding-0.62)*0.045;
      const stress=Math.max(0,0.38-s.fitness)*0.11+Math.max(0,0.42-food)*0.065;
      const pressure=(s.fitness-0.48)*0.035+roleGrowth-stress-competitionPenalty+(randomFor(state)-0.5)*0.012;
      const old=s.population;
      s.population=Math.round(clamp(old*(1+pressure),0,250000));
      const deaths=Math.max(0,old-s.population);s.deaths+=deaths;
      if(deaths>0)deathsThisYear.push({habitat:s.habitat,count:deaths});
      if(s.population<2){s.population=0;s.extinct=true;event(state,"extinction",s,"جمعیت به آستانهٔ انقراض مدل رسید");continue;}
      const fastPurchasedEarthSeed=!!(state.planetEnvironment.purchased&&state.planetEnvironment.earthSeeded);
      if(s.age%(fastPurchasedEarthSeed?1:2)===0){
        s.generation++;state.generation++;
        const offspring=Math.max(1,Math.round(s.population*(0.018+s.traits.replication*0.022)*food));
        s.population=Math.min(250000,s.population+offspring);s.births+=offspring;mutate(s,state);
        if(s.speciationCooldown>0)s.speciationCooldown--;
        const divergence=distance(s.dna,s.lineageDNA);
        if(divergence>=5&&s.speciationCooldown===0&&state.species.filter(x=>!x.extinct).length<speciesLimit(state)){
          const roleChange=randomFor(state)<0.035;
          const inheritedRole=roleChange?TROPHIC_ROLES[Math.floor(randomFor(state)*TROPHIC_ROLES.length)]:s.trophicRole;
          const childSize=engine.estimatedBodyLengthCmFromDNA(s.dna)||0;
          const special=!state.planetEnvironment.home;
          const tierBonus={common:0,rare:1,epic:2,legendary:3,mythic:4}[state.planetEnvironment.rarityTier||"common"]||0;
          const rarityScore=clamp(48+divergence*1.1+s.fitness*15+(state.planetEnvironment.lifePotential||0)*0.06+(state.planetEnvironment.specialSpeciesPotential||0)*0.14+tierBonus*5,0,100);
          const child=createSpecies(state,s.dna,s.habitat,s.id,Math.max(3,Math.round(s.population*0.035)),"شاخهٔ تازهٔ "+(state.serial+1),inheritedRole,
            {special,rarityScore,originWorldType:state.planetEnvironment.home?"earth":"alien"});
          child.speciationCooldown=8;s.speciationCooldown=8;s.lineageDNA=s.dna;
          event(state,"speciation",child,"جدایی ژنتیکی مدل‌شده از تبار والد #"+s.id);
        }
      }
      if(s.age%80===0&&s.traits.motility>0.55){
        const env=state.planetEnvironment||DEFAULT_ENVIRONMENT;
        const options=env.type==="gas-giant"?["sky"]:(s.habitat==="ocean"?["shore"]:s.habitat==="shore"?["land","ocean"]:s.habitat==="land"?["shore"]:["shore"]);
        const next=options[Math.floor(randomFor(state)*options.length)];
        if(next&&next!==s.habitat&&randomFor(state)<s.traits.sensing*0.22){
          const previous=s.habitat;s.habitat=next;const p=phenotype(s.dna,next,state.planetEnvironment);s.traits=p.traits;s.form=p.form;
          event(state,"migration",s,"گسترش از "+previous+" به زیستگاه "+next);
        }
      }
    }
    state.detritus=clamp(state.detritus*0.88,0,10000);
    deathsThisYear.forEach(d=>{const pool=pools[d.habitat];if(pool)pool.detritus=clamp(pool.detritus+d.count*0.12,0,5000);state.detritus=clamp(state.detritus+d.count*0.035,0,10000);});
    Object.keys(pools).forEach(h=>{
      const pool=pools[h],producers=live.filter(s=>!s.extinct&&s.habitat===h&&s.trophicRole==="producer");
      const producerBiomass=producers.reduce((n,s)=>n+s.population,0);
      pool.biomass=clamp(pool.biomass+producerBiomass*0.0015,0,pool.capacity);
    });
    state.species.sort((a,b)=>b.population-a.population);
    const limit=speciesLimit(state);
    if(state.species.length>limit){
      const keep=state.species.filter(s=>!s.extinct).slice(0,limit),slots=Math.max(0,limit-keep.length);
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
      resources:state.resources,detritus:state.detritus,species:state.species,events:state.events});
  }
  function restore(raw){
    const data=typeof raw==="string"?JSON.parse(raw):raw;
    if(!data||![1,2,3,4,5,6,VERSION].includes(data.version)||!Array.isArray(data.species))throw new Error("Saved biosphere data is invalid.");
    const state={version:VERSION,year:Math.max(0,Number(data.year)||0),generation:Math.max(0,Number(data.generation)||0),
      serial:Math.max(0,Number(data.serial)||0),rng:Number(data.rng)>>>0,environment:Number(data.environment)||0,
      planetEnvironment:environmentFromPlanet(data.planetEnvironment||DEFAULT_ENVIRONMENT),
      resources:data.resources&&typeof data.resources==="object"?data.resources:null,detritus:Math.max(0,Number(data.detritus)||0),
      species:data.species.slice(0,MAX_SPECIES),events:Array.isArray(data.events)?data.events.slice(0,MAX_EVENTS):[]};
    state.species=state.species.filter(s=>s&&typeof s.dna==="string"&&engine.normalizeSyntheticGenome(s.dna))
      .map(s=>{const p=phenotype(s.dna,s.habitat,state.planetEnvironment);return Object.assign({},s,p,{bodyLengthCm:p.traits.estimatedBodyLengthCm,
        special:s.special===true,rarityScore:clamp(s.rarityScore||0,0,100),originWorldType:s.originWorldType||(state.planetEnvironment.home?"earth":"alien")});});
    if(state.planetEnvironment.home){
      state.species=state.species.slice(0,EARTH_SPECIES_COUNT);
      while(state.species.length<EARTH_SPECIES_COUNT){
        const i=state.species.length,s=createSpecies(state,makeGenome(state),["ocean","shore","land"][i%3],null,90+Math.floor(randomFor(state)*210),
          "گونهٔ زمینی "+String(i+1).padStart(3,"0"),TROPHIC_ROLES[i%TROPHIC_ROLES.length],{special:false,originWorldType:"earth"});
        event(state,"origin",s,"گونهٔ پایهٔ زمین؛ برای همهٔ بازیکنان مشترک و غیرقابل‌فروش");
      }
    }else{
      state.species=state.species.slice(0,OFFWORLD_SPECIES_LIMIT);
      state.species.forEach(s=>{
        s.originWorldType="alien";
        const divergence=distance(s.dna,s.lineageDNA||s.dna);
        const tierBonus={common:0,rare:1,epic:2,legendary:3,mythic:4}[state.planetEnvironment.rarityTier||"common"]||0;
        const minGeneration=Math.max(2,6-Math.floor(tierBonus/2)),minDivergence=Math.max(3,8-tierBonus);
        s.special=s.special===true||(Number(s.generation)>=minGeneration&&divergence>=minDivergence);
        s.rarityScore=s.special?Math.max(52,Number(s.rarityScore)||52):0;
      });
    }
    state.species.forEach(s=>{
      const minimumSize=MIN_VISIBLE_BODY_LENGTH_CM+0.01;
      s.bodyLengthCm=Math.max(minimumSize,Number(s.traits&&s.traits.estimatedBodyLengthCm)||minimumSize);s.marketEligible=isMarketEligible(s);
    });
    ensureEcology(state);
    return state;
  }
  function selfTest(){
    const a=createState(12345),initial=a.species.length,alien=createState(9876,{id:"test-world",type:"desert",meanTemperatureC:35,waterCoverage:0.05,gravity:1.1,atmosphere:"thin-carbon-dioxide"},a.species.map(s=>s.dna));
    const alienFoundersNonMarketable=alien.species.every(s=>!s.special&&!isMarketEligible(s));
    advanceYears(a,40);advanceYears(alien,40);
    const b=restore(serialize(a)),c=restore(serialize(alien));
    return {ok:initial===EARTH_SPECIES_COUNT&&b.year===40&&b.species.length===EARTH_SPECIES_COUNT&&c.species.length>=OFFWORLD_SPECIES_COUNT&&c.species.length<=OFFWORLD_SPECIES_LIMIT&&
      b.species.concat(c.species).every(s=>engine.normalizeSyntheticGenome(s.dna)&&s.traits&&s.form&&s.bodyLengthCm>2)&&
      a.species.every(s=>!s.marketEligible||(s.special&&s.bodyLengthCm>=EARTH_MIN_MARKET_SIZE_CM))&&
      alienFoundersNonMarketable&&!!b.planetEnvironment,
      years:b.year,species:b.species.length,offworldSpecies:c.species.length,engine:"PlanetAutonomousEvolution-v7"};
  }
  return {version:VERSION,createState,createEarthGenomePool,advanceYears,advanceOneYear,serialize,restore,selfTest,visibleSpecies,isMarketEligible,setPlanetPurchased,fingerprintForPlanet,rarityTierForPrice,
    environmentFromPlanet,planetHabitability,environmentSuitability,fitnessFor,setEnvironment,roleForSpecies,ensureEcology,TROPHIC_ROLES,ROLE_LABELS,
    EARTH_SPECIES_COUNT,OFFWORLD_SPECIES_COUNT,OFFWORLD_SPECIES_LIMIT,MIN_VISIBLE_BODY_LENGTH_CM,EARTH_MIN_MARKET_SIZE_CM,ALIEN_MIN_MARKET_SIZE_CM};
});
