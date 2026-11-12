"use strict";
(function(root,factory){const api=factory();if(typeof module!=="undefined"&&module.exports)module.exports=api;if(root)root.PlanetOrganismMorphology=api;})(typeof globalThis!=="undefined"?globalThis:this,function(){
  "use strict";
  const clamp=(v,lo,hi,d)=>{const n=Number(v);return Math.max(lo,Math.min(hi,Number.isFinite(n)?n:d));};
  function classify(specimen,phenotype){
    const s=specimen||{},p=phenotype||s.traits||s.phenotype||{},a=p.appearance||s.appearance||{},form=String(s.form||"digital-organism").toLowerCase(),habitat=String(s.habitat||"unknown").toLowerCase();
    const limbCount=Math.round(clamp(a.limbCount,0,8,4)),segmentCount=Math.round(clamp(a.segmentCount,1,16,4)),wingSpan=clamp(a.wingSpan,0,3,clamp(a.appendageLength,0,3,0)),tailLength=clamp(a.tailLength,0,3,0),photosynthetic=p.photosynthetic===true||s.diet==="photosynthetic",aquatic=/ocean|marine|aquatic|water|shore|coast|wetland/.test(habitat);
    let family,label,silhouette,nonAnimal=false;
    if(photosynthetic||/photosynthetic|plant|tree|flora|vegetation|botanical/.test(form)){family="photosynthetic-colony";label="photosynthetic colony";silhouette="a branching botanical colony with several stems, leaf fans, visible roots and light-catching structures";nonAnimal=true;}
    else if(/filament|fung|mycel|hypha|mushroom|colony/.test(form)){family="filamentous";label="filamentous organism";silhouette="a branching filament or mycelial network with visible threads, junctions, nodules and spore-like structures";nonAnimal=true;}
    else if(/serpentine|serpent|snake|worm|ribbon/.test(form)||(limbCount===0&&tailLength>=1.25)){family="serpentine";label="serpentine body plan";silhouette="one long continuous flexible body with an S-shaped or coiled profile and no default legs or arms";}
    else if(/insect|arthropod|beetle|crustacean/.test(form)||(limbCount>=6&&segmentCount>=6)){family="insectoid";label="segmented multi-limbed body plan";silhouette="a distinct head, thorax and abdomen with multiple jointed legs, antennae and an exoskeletal outline";}
    else if(/dragon|draconic/.test(form)){family="draconic";label="draconic body plan";silhouette="a reptilian trunk, four weight-bearing limbs, long tail, horned head and wing membranes when wing span is high";}
    else if(aquatic||/fish|aquatic|marine/.test(form)){family="aquatic";label="aquatic body plan";silhouette="a streamlined hydrodynamic body with tail propulsion, fins and gill structures, not a standing humanoid";}
    else if(wingSpan>=1.15){family="winged";label="winged body plan";silhouette="a flight-adapted body with broad attached wings shaped around the measured span";}
    else if(limbCount>=6){family="multi-limbed";label="multi-limbed body plan";silhouette="a non-humanoid trunk with exactly the measured number of locomotor appendages";}
    else if(limbCount===4){family="quadruped";label="four-limbed body plan";silhouette="a horizontal or low-slung quadruped with four separate weight-bearing limbs";}
    else if(limbCount===2){family="biped";label="two-limbed body plan";silhouette="a body balanced on two locomotor appendages, without an extra pair of arms";}
    else if(limbCount===0){family="limbless";label="limbless body plan";silhouette="a limbless body propelled by undulation, cilia, fins or other non-leg structures";}
    else{family="polymorphic";label="unusual digital body plan";silhouette="an asymmetrical organism whose outline follows its measured proportions and appendage traits";}
    return{family,label,silhouette,nonAnimal,limbCount,segmentCount,wingSpan,tailLength};
  }
  function describe(specimen,phenotype){
    const profile=classify(specimen,phenotype),p=phenotype||specimen&&specimen.traits||{},a=p.appearance||specimen&&specimen.appearance||{};
    const appendages=profile.nonAnimal?"This is a non-animal body plan: do not add an animal face, torso, arms, hands, fingers, legs or feet.":profile.limbCount===0?"Use a limbless anatomy; do not invent legs, arms, hands or fingers.":"Use exactly "+profile.limbCount+" main locomotor appendages. Do not convert them into human arms and legs or add human hands and fingers.";
    const details=["body length "+clamp(a.bodyLength,0,3,1).toFixed(2),"body width "+clamp(a.bodyWidth,0,3,1).toFixed(2),"body height "+clamp(a.bodyHeight,0,3,1).toFixed(2),"head size "+clamp(a.headSize,0,3,.5).toFixed(2),"limb thickness "+clamp(a.limbThickness,0,3,.5).toFixed(2),"tail length "+profile.tailLength.toFixed(2),"wing span "+profile.wingSpan.toFixed(2),"fin size "+clamp(a.finSize,0,3,0).toFixed(2),"horn length "+clamp(a.hornLength,0,3,0).toFixed(2),"armor coverage "+Math.round(clamp(a.armorCoverage,0,1,0)*100)+"%","segment count "+profile.segmentCount,"symmetry "+clamp(a.symmetry,0,1,.8).toFixed(2)].join("; ");
    return{family:profile.family,label:profile.label,silhouette:profile.silhouette,appendages,details,instructions:"Distinct silhouette lock: "+profile.silhouette+". "+appendages+" Morphology controls: "+details+". The outline must visibly differ from a generic humanoid or stock mammal."};
  }
  return{classify,describe};
});
