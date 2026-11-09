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
    let replacedSpecies=null;
    if(state.species.length>=MAX_CREATURES){
      // Keep the ecosystem capped at 24 while allowing players to continue selective breeding.
      const candidates=state.species.filter(x=>!x.extinct&&Number(x.id)!==Number(parentA.id)&&Number(x.id)!==Number(parentB.id));
      if(!candidates.length)throw new Error("برای ترکیب باید دو والد انتخاب کنی تا یک جایگاه آزاد بماند.");
      candidates.sort((x,y)=>(Number(x.fitness)||0)-(Number(y.fitness)||0)||(Number(x.population)||0)-(Number(y.population)||0)||Number(x.id)-Number(y.id));
      replacedSpecies=candidates[0];
      state.species.splice(state.species.indexOf(replacedSpecies),1);
    }
    let dna="";for(let gene=0;gene<8;gene++){const source=randomFor(state)<.5?a:b;dna+=source.slice(gene*21,gene*21+21);}
    dna=Genome.mutateSyntheticGenome(dna,.035,()=>randomFor(state));
    const traits=Genome.phenotypeFromDNA(dna,{ageMa:4300}),form=Genome.inferForm(traits,4300,parentA.habitat||parentB.habitat||"land");
    const p1=Number(parentA.bodyLengthCm)||Number(parentA.traits&&parentA.traits.estimatedBodyLengthCm)||20;
    const p2=Number(parentB.bodyLengthCm)||Number(parentB.traits&&parentB.traits.estimatedBodyLengthCm)||20;
    const factors=[.22,.4,.65,.85,1,1.25,1.7,2.4,3.5],factor=factors[Math.floor(randomFor(state)*factors.length)];
    const bodyLengthCm=Math.max(MIN_SIZE_CM,Math.min(MAX_SIZE_CM,(Number(traits.estimatedBodyLengthCm)||Math.sqrt(p1*p2))*factor));
    const generation=Math.max(Number(parentA.generation)||0,Number(parentB.generation)||0)+1;
    const divergence=Math.max(distance(dna,a),distance(dna,b)),special=generation>=6&&divergence>=8,id=++state.serial;
    const child={id,parentId:parentA.id||null,secondParentId:parentB.id||null,name:"گونهٔ ترکیبی "+String(id).padStart(3,"0"),dna,lineageDNA:dna,
      habitat:parentA.habitat||parentB.habitat||"land",population:40+Math.floor(randomFor(state)*160),generation,age:0,fitness:.4+randomFor(state)*.55,
      births:0,deaths:0,speciationCooldown:0,traits,form,bodyLengthCm,special,rarityScore:special?Math.min(100,55+divergence+randomFor(state)*30):0,
      originWorldType:"alien",extinct:false,trophicRole:Life.roleForSpecies({id,traits}),marketEligible:false};
    child.marketEligible=Life.isMarketEligible(child);state.species.push(child);
    if(replacedSpecies)child.replacedSpeciesId=replacedSpecies.id;
    return Object.assign({},child,{sizeLabel:sizeLabel(bodyLengthCm),marketEligible:child.marketEligible,replacedSpeciesId:replacedSpecies&&replacedSpecies.id||null});
  }
  function save(state){if(!Life||!state)throw new Error("جهان ژنومی برای ذخیره آماده نیست.");return Life.serialize(state);}
  function restore(value){if(!Life)throw new Error("موتور تکامل ژنومی آماده نیست.");const state=Life.restore(value);state.genomeGameVersion=VERSION;return state;}
  return {VERSION,GENOME_LENGTH,MAX_CREATURES,MIN_SIZE_CM,MAX_SIZE_CM,hash32,validDNA,createDailyPool,createWorld,advance,breed,sizeLabel,save,restore};
});
