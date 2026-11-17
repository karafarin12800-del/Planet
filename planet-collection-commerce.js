/* Persistent per-planet specimen collection and local prototype commerce.
 * Sold specimens are removed permanently; reacquisition creates a new specimen record.
 * Local credits are gameplay currency only, never a real-money entitlement.
 */
(function(root,factory){
  const api=factory();
  if(typeof module!=="undefined"&&module.exports)module.exports=api;
  if(root)root.PlanetCollectionCommerce=api;
})(typeof globalThis!=="undefined"?globalThis:this,function(){
  "use strict";
  const VERSION=1, PREFIX="planet-collection-commerce-v1:", MAX_RECORDS=250, MAX_LEDGER=100;
  const SHOP_ITEMS=[
    {id:"habitat-reef",name:"زیستگاه مرجانی",description:"پوستهٔ نمایشی برای مجموعهٔ زیستگاه‌ها",price:120,category:"cosmetic"},
    {id:"habitat-crystal",name:"زیستگاه بلورین",description:"پوستهٔ نمایشی بلورین",price:180,category:"cosmetic"},
    {id:"gallery-frame",name:"قاب نمایش ویژه",description:"قاب نمایشی برای موجودات منتخب",price:90,category:"cosmetic"}
  ];
  function validWorld(id){return typeof id==="string"&&id.length>0&&id.length<=120;}
  function key(worldId){if(!validWorld(worldId))throw new Error("A stable planet ID is required.");return PREFIX+encodeURIComponent(worldId);}
  function cleanText(value,max){return String(value==null?"":value).replace(/[<>\u0000-\u001f]/g,"").slice(0,max||100);}
  function finite(value,fallback,min,max){const n=Number(value);return Math.max(min,Math.min(max,Number.isFinite(n)?n:fallback));}
  function emptyState(){return {version:VERSION,credits:250,serial:0,specimens:[],ownedItems:[],sales:[],purchases:[]};}
  function normalize(raw){
    let data=raw;
    if(typeof raw==="string"){try{data=JSON.parse(raw);}catch(e){return emptyState();}}
    if(!data||typeof data!=="object")return emptyState();
    return {version:VERSION,credits:finite(data.credits,250,0,1e9),serial:finite(data.serial,0,0,1e9),
      specimens:Array.isArray(data.specimens)?data.specimens.filter(x=>x&&typeof x.id==="string").slice(-MAX_RECORDS).map(x=>({
        id:cleanText(x.id,180),worldId:cleanText(x.worldId,120),speciesId:finite(x.speciesId,0,0,1e9),
        name:cleanText(x.name,100)||"موجود دیجیتال",dna:cleanText(x.dna,100000),form:cleanText(x.form,80),
        generation:finite(x.generation,0,0,1e9),fitness:finite(x.fitness,.5,0,1),habitat:cleanText(x.habitat,30),
        acquiredAt:finite(x.acquiredAt,0,0,1e15),source:cleanText(x.source,24)||"evolution",parentId:x.parentId==null?null:finite(x.parentId,0,0,1e9)
      })):[],
      ownedItems:Array.isArray(data.ownedItems)?Array.from(new Set(data.ownedItems.filter(x=>SHOP_ITEMS.some(i=>i.id===x)))):[],
      sales:Array.isArray(data.sales)?data.sales.slice(-MAX_LEDGER):[],
      purchases:Array.isArray(data.purchases)?data.purchases.slice(-MAX_LEDGER):[]};
  }
  function load(storage,worldId){
    if(!storage||!validWorld(worldId))return emptyState();
    try{return normalize(storage.getItem(key(worldId)));}catch(e){return emptyState();}
  }
  function save(storage,worldId,state){
    if(!storage||!validWorld(worldId))return false;
    try{storage.setItem(key(worldId),JSON.stringify(normalize(state)));return true;}catch(e){return false;}
  }
  function specimenFrom(state,species,worldId,source){
    if(!species||!Number.isFinite(Number(species.id)))throw new Error("گونهٔ معتبر انتخاب نشده است.");
    const dna=String(species.dna||species.lineageDNA||"").toUpperCase();
    if(!dna||!/^[ACGT]+$/.test(dna))throw new Error("ژنوم موجود معتبر نیست.");
    if(state.specimens.length>=MAX_RECORDS)throw new Error("ظرفیت کلکسیون این سیاره پر شده است.");
    const serial=++state.serial;
    return {id:"specimen-"+encodeURIComponent(worldId)+"-"+serial,worldId,speciesId:Number(species.id),
      name:cleanText(species.nameFa||species.nameEn||species.name||("گونهٔ "+species.id),100),
      dna,form:cleanText(species.form||species.habitat||"نامشخص",80),
      generation:finite(species.generation,0,0,1e9),fitness:finite(species.fitness,.5,0,1),
      habitat:cleanText(species.habitat,30),acquiredAt:Date.now(),source:source||"evolution",
      parentId:species.parentId==null?null:finite(species.parentId,0,0,1e9)};
  }
  function acquire(state,species,worldId){
    if(!validWorld(worldId))throw new Error("شناسهٔ سیاره معتبر نیست.");
    const specimen=specimenFrom(state,species,worldId,"evolution");
    if(state.specimens.some(x=>x.id===specimen.id))throw new Error("شناسهٔ نمونه تکراری است.");
    state.specimens.push(specimen);return specimen;
  }
  function specimenValue(specimen){
    const rarity=Math.min(180,Math.round((specimen.generation||0)*1.5+(specimen.fitness||0)*65+(specimen.dna.length/3)));
    return Math.max(15,Math.min(500,35+rarity));
  }
  function sell(state,specimenId){
    const index=state.specimens.findIndex(x=>x.id===specimenId);
    if(index<0)throw new Error("این نمونه دیگر در کلکسیون نیست.");
    const specimen=state.specimens[index],price=specimenValue(specimen);
    state.specimens.splice(index,1);
    state.credits=finite(state.credits+price,0,0,1e9);
    state.sales.push({id:specimen.id,name:specimen.name,price,at:Date.now()});
    state.sales=state.sales.slice(-MAX_LEDGER);
    return {specimen,price,credits:state.credits};
  }
  function buyCreature(state,species,worldId,price){
    const cost=finite(price,100,1,100000);
    if(state.credits<cost)throw new Error("اعتبار کافی برای خرید این موجود وجود ندارد.");
    if(!validWorld(worldId))throw new Error("شناسهٔ سیاره معتبر نیست.");
    const specimen=specimenFrom(state,species,worldId,"market");
    if(state.specimens.some(x=>x.id===specimen.id))throw new Error("شناسهٔ نمونه تکراری است.");
    state.credits-=cost;state.specimens.push(specimen);
    state.purchases.push({id:specimen.id,type:"creature",price:cost,at:Date.now()});
    state.purchases=state.purchases.slice(-MAX_LEDGER);
    return {specimen,price:cost,credits:state.credits};
  }
  function buyItem(state,itemId){
    const item=SHOP_ITEMS.find(x=>x.id===itemId);
    if(!item)throw new Error("کالای فروشگاه پیدا نشد.");
    if(state.ownedItems.includes(itemId))throw new Error("این کالا قبلاً خریداری شده است.");
    if(state.credits<item.price)throw new Error("اعتبار کافی برای خرید این کالا وجود ندارد.");
    state.credits-=item.price;state.ownedItems.push(itemId);
    state.purchases.push({id:itemId,type:"item",price:item.price,at:Date.now()});
    state.purchases=state.purchases.slice(-MAX_LEDGER);
    return {item,credits:state.credits};
  }
  function listItems(){return SHOP_ITEMS.map(x=>({...x}));}
  return {VERSION,PREFIX,MAX_RECORDS,SHOP_ITEMS:listItems,emptyState,normalize,key,load,save,acquire,sell,buyCreature,buyItem,specimenValue};
});
