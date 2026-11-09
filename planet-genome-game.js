(function(root,factory){
  const api=factory(root&&root.PlanetAutonomousEvolution,root&&root.PlanetEvolutionModel);
  if(typeof module!=="undefined"&&module.exports)module.exports=api;
  if(root)root.PlanetGenomeGame=api;
})(typeof globalThis!=="undefined"?globalThis:this,function(Life,Genome){
  "use strict";
  const VERSION=1,GENOME_LENGTH=168,MAX_CREATURES=24,MIN_SIZE_CM=2.2,MAX_SIZE_CM=600;
  function hash32(value){let h=2166136261;const s=String(value==null?"":value);for(let i=0;i<s.length;i++){h^=s.charCodeAt(i);h=Math.imul(h,16777619);}return h>>>0;}
  function validDNA(value){return Genome&&Genome.normalizeSyntheticGenome(String(value||""));}
  function randomFor(state){state.rng=(Math.imul(state.rng>>>0,1664525)+1013904223)>>>0;return state.rng/4294967296;}
  function cleanPool(values){return (Array.isArray(values)?values:[]).map(x=>typeof x==="string"?x:x&&x.dna).map(validDNA).filter(Boolean);}
  function createDailyPool(seed,day,earthGenomes){
    if(!Life)throw new Error("موتور تکامل ژنومی آماده نیست.");
    const dayKey=String(day||new Date().toISOString().slice(0,10)),base=cleanPool(earthGenomes);
    const candidates=base.length>=4?base:Life.createEarthGenomePool(hash32("earth-origin|"+dayKey+"|"+String(seed))).map(validDNA).filter(Boolean);
    let cursor=hash32(String(seed)+"|daily-genomes|"+dayKey)||0x504c414e;
    const next=()=>{cursor=(Math.imul(cursor,1664525)+1013904223)>>>0;return cursor/4294967296;};
    const chosen=[],used=new Set();
    while(chosen.length<4&&used.size<candidates.length){const index=Math.floor(next()*candidates.length);if(used.has(index))continue;used.add(index);chosen.push({id:"earth-"+dayKey+"-"+chosen.length,dna:candidates[index],source:"زمین مادر",day:dayKey});}
    return chosen;
  }
  function createWorld(seed,planet,sourceGenomes){
    if(!Life)throw new Error("موتور تکامل ژنومی آماده نیست.");
    const normalized=hash32(String(seed)+"|"+String(planet&&planet.id||"unknown")),source=cleanPool(sourceGenomes);
    const state=Life.createState(normalized,planet||{},source.length>=2?source:Life.createEarthGenomePool(normalized));
    state.genomeGameVersion=VERSION;state.worldSeedHash=hash32(String(seed)).toString(16);return state;
  }
  function advance(state,years){if(!Life||!state||!Number.isFinite(Number(years))||Number(years)<0)throw new Error("مقدار شبیه‌سازی معتبر نیست.");Life.advanceYears(state,Math.min(10000,Math.floor(Number(years))));return state;}
  function distance(a,b){let n=0;for(let i=0;i<Math.min(a.length,b.length);i++)if(a[i]!==b[i])n++;return n;}
  function sizeLabel(cm){if(cm<=8)return "موش‌مانند";if(cm<=30)return "گربه‌مانند";if(cm<=110)return "سگ‌مانند";if(cm<=230)return "اسب‌مانند";return "فیل‌مانند";}
  function breed(state,parentA,parentB){
    if(!Genome||!Life||!state)throw new Error("جهان ژنومی فعال نیست.");
    const a=validDNA(parentA&&parentA.dna),b=validDNA(parentB&&parentB.dna);
    if(!a||!b)throw new Error("ژنوم هر دو والد باید معتبر باشد.");
    if(parentA&&parentB&&parentA.id!=null&&parentB.id!=null&&String(parentA.id)===String(parentB.id))throw new Error("برای ساخت نسل تازه، دو موجود متفاوت را انتخاب کن.");
    let replacedSpecies=null;
    if(state.species.length>=MAX_CREATURES){
      // Keep the ecosystem capped at 24 while allowing players to continue selective breeding.
      const candidates=state.species.filter(x=>!x.extinct&&Number(x.id)!==Number(parentA.id)&&Number(x.id)!==Number(parentB.id));
      if(!candidates.length)throw new Error("برای ترکیب باید دو والد انتخاب کنی تا یک جایگاه آزاد بماند.");
      candidates.sort((x,y)=>(Number(x.fitness)||0)-(Number(y.fitness)||0)||(Number(x.population)||0)-(Number(y.population)||0)||Number(x.id)-Number(y.id));
      replacedSpecies=candidates[0];
      state.species.splice(state.species.indexOf(replacedSpecies),1);
    }
    const traitA=parentA.traits||{},traitB=parentB.traits||{};
    const fitnessA=Number(parentA.fitness)||.5,fitnessB=Number(parentB.fitness)||.5;
    let dna="";
    for(let gene=0;gene<8;gene++){
      const signalA=Number(traitA.signals&&traitA.signals[gene])||fitnessA;
      const signalB=Number(traitB.signals&&traitB.signals[gene])||fitnessB;
      const stronger=signalA>=signalB?a:b,other=stronger===a?b:a;
      dna+=(randomFor(state)<.76?stronger:other).slice(gene*21,gene*21+21);
    }
    dna=Genome.mutateSyntheticGenome(dna,.045,()=>randomFor(state));
    const traits=Genome.phenotypeFromDNA(dna,{ageMa:4300});
    const capabilityKeys=["motility","sensing","protection","replication","thermalTolerance","learning","cooperation","cognition","metabolicEfficiency","feedingEfficiency","growthRate"];
    capabilityKeys.forEach(key=>{
      const best=Math.max(Number(traitA[key])||0,Number(traitB[key])||0);
      if(best>0)traits[key]=Math.min(1.25,Math.max(Number(traits[key])||0,best+.025+randomFor(state)*.075));
    });
    const appA=traitA.appearance||{},appB=traitB.appearance||{},appearance=traits.appearance||{};
    const inherited=(key,fallback,min,max)=>{
      const strongest=Math.max(Number(appA[key])||fallback,Number(appB[key])||fallback);
      return Math.max(min,Math.min(max,Math.max(Number(appearance[key])||fallback,strongest*.62+fallback*.38+randomFor(state)*.16)));
    };
    appearance.limbCount=4;
    appearance.limbLength=inherited("limbLength",.92,.55,1.8);
    appearance.limbThickness=inherited("limbThickness",.55,.22,1.35);
    appearance.handSize=inherited("handSize",.62,.35,1.35);
    appearance.footSize=inherited("footSize",.72,.4,1.5);
    appearance.earSize=inherited("earSize",.72,.25,1.65);
    appearance.trunkLength=inherited("trunkLength",.48,.12,1.5);
    appearance.tailLength=inherited("tailLength",.88,.25,1.95);
    appearance.neckLength=inherited("neckLength",.66,.18,1.75);
    appearance.headSize=inherited("headSize",.82,.35,1.5);
    appearance.bodyLength=inherited("bodyLength",1.08,.65,1.72);
    appearance.bodyWidth=inherited("bodyWidth",.86,.45,1.5);
    traits.appearance=appearance;
    const p1=Number(parentA.bodyLengthCm)||Number(traitA.estimatedBodyLengthCm)||20;
    const p2=Number(parentB.bodyLengthCm)||Number(traitB.estimatedBodyLengthCm)||20;
    const factors=[.55,.72,.88,1,1.18,1.42,1.75,2.1],factor=factors[Math.floor(randomFor(state)*factors.length)];
    const bodyLengthCm=Math.max(6,Math.min(MAX_SIZE_CM,(Number(traits.estimatedBodyLengthCm)||Math.sqrt(p1*p2))*factor));
    const generation=Math.max(Number(parentA.generation)||0,Number(parentB.generation)||0)+1;
    const divergence=Math.max(distance(dna,a),distance(dna,b)),special=divergence>=4,id=++state.serial;
    const improvedFitness=Math.min(1,Math.max(fitnessA,fitnessB)+.02+randomFor(state)*.075);
    const child={id,parentId:parentA.id||null,secondParentId:parentB.id||null,name:"گونهٔ ترکیبی "+String(id).padStart(3,"0"),dna,lineageDNA:dna,
      habitat:parentA.habitat||parentB.habitat||"land",population:40+Math.floor(randomFor(state)*160),generation,age:0,fitness:improvedFitness,
      births:0,deaths:0,speciationCooldown:0,traits,form:"hybrid-mammal",bodyLengthCm,special,rarityScore:Math.min(100,62+divergence+randomFor(state)*28),
      originWorldType:"alien",extinct:false,trophicRole:Life.roleForSpecies({id:state.serial+1,traits}),marketEligible:false};
    child.marketEligible=Life.isMarketEligible(child);state.species.push(child);
    if(replacedSpecies)child.replacedSpeciesId=replacedSpecies.id;
    return Object.assign({},child,{sizeLabel:sizeLabel(bodyLengthCm),marketEligible:child.marketEligible,replacedSpeciesId:replacedSpecies&&replacedSpecies.id||null});
  }
  function save(state){if(!Life||!state)throw new Error("جهان ژنومی برای ذخیره آماده نیست.");return Life.serialize(state);}
  function restore(value){if(!Life)throw new Error("موتور تکامل ژنومی آماده نیست.");const state=Life.restore(value);state.genomeGameVersion=VERSION;return state;}
  return {VERSION,GENOME_LENGTH,MAX_CREATURES,MIN_SIZE_CM,MAX_SIZE_CM,hash32,validDNA,createDailyPool,createWorld,advance,breed,sizeLabel,save,restore};
});
