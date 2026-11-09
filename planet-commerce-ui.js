(function(){
"use strict";
const $=id=>document.getElementById(id);
const client=window.PlanetCommerceClient;
function status(value){const el=$("commerceStatus");if(el)el.textContent=String(value||"");}
function authView(){const signed=client.hasSession();$("commerceAuthPanel").hidden=signed;$("commerceAccountPanel").hidden=!signed;}
function row(box,title,details,buttonText,onClick){
 const item=document.createElement("div");item.className="species-item";
 const info=document.createElement("div");info.className="species-info";
 const name=document.createElement("b");name.textContent=title;
 const small=document.createElement("small");small.textContent=details;
 info.append(name,small);item.append(info);
 if(buttonText){const button=document.createElement("button");button.type="button";button.textContent=buttonText;button.addEventListener("click",onClick);item.append(button);}
 box.append(item);
}
function fillOwnSelect(items){
 const select=$("commerceOwnSpecimen"),previous=select.value;select.textContent="";
 if(!items.length){const option=document.createElement("option");option.value="";option.textContent="نمونهٔ همگام‌شدهٔ قابل فروش وجود ندارد";select.append(option);return;}
 items.forEach(x=>{const option=document.createElement("option");option.value=x.id;option.textContent=x.name+" · "+x.form+" · نسل "+x.generation;select.append(option);});
 if(items.some(x=>String(x.id)===previous))select.value=previous;
}
async function refresh(){
 if(!client.hasSession()){authView();return;}
 status("در حال دریافت کیف پول و بازار…");
 try{
  const [wallet,collection,market,catalog,owned]=await Promise.all([client.wallet(),client.collection(),client.listings(),client.planets(),client.ownedPlanets()]);
  $("commerceTokenBalance").textContent=Number(wallet.balance||0).toLocaleString("fa-IR");
  const ownedIds=new Set((owned.planets||[]).map(x=>x.id)),catalogBox=$("commercePlanetCatalog");catalogBox.textContent="";
  (catalog.planets||[]).forEach(planet=>{
   row(catalogBox,planet.name,planet.type+" · "+planet.price+" توکن",ownedIds.has(planet.id)?"خریداری‌شده":"خرید",async()=>{
    if(ownedIds.has(planet.id))return;
    if(!confirm("سیارهٔ "+planet.name+" با قیمت "+planet.price+" توکن خریداری شود؟"))return;
    try{const result=await client.buyPlanet(planet.id);status("سیارهٔ "+result.planet.name+" در حساب ثبت شد.");await refresh();}catch(error){status(error.message);}
   });
   if(ownedIds.has(planet.id))catalogBox.lastElementChild.querySelector("button").disabled=true;
  });
  const specimens=collection.specimens||[],own=specimens.filter(x=>x.status==="owned"),myBox=$("commerceMySpecimens");myBox.textContent="";fillOwnSelect(own);
  specimens.filter(x=>x.status==="listed").forEach(x=>row(myBox,x.name,x.form+" · آگهی فعال","لغو آگهی",async()=>{
   try{await client.cancelListing(x.listing_id);status("آگهی لغو شد و نمونه به کلکسیون برگشت.");await refresh();}catch(error){status(error.message);}
  }));
  const marketBox=$("commerceMarketListings");marketBox.textContent="";
  (market.listings||[]).forEach(x=>row(marketBox,x.name,x.form+" · نسل "+x.generation+" · "+x.price+" توکن","خرید",async()=>{
   if(!confirm("این نمونه با قیمت "+x.price+" توکن خریداری شود؟"))return;
   try{const result=await client.buyListing(x.id);status("خرید انجام شد؛ "+result.paid+" توکن پرداخت شد، کارمزد صفر.");await refresh();}catch(error){status(error.message);}
  }));
  if(!(market.listings||[]).length)marketBox.textContent="فعلاً آگهی فعالی از بازیکنان دیگر وجود ندارد.";
  authView();status("حساب متصل است؛ موجودی و بازار از سرور به‌روزرسانی شدند.");
 }catch(error){authView();status(error.message);}
}
async function syncSpecimens(){
 try{
  const context=window.PlanetCommerceContext;if(!context)throw new Error("اتصال کلکسیون محلی آماده نیست.");
  const state=context.getCollection();let count=0;
  for(const specimen of state.specimens){if(specimen.source==="online")continue;
   await client.registerSpecimen({clientKey:specimen.id,planetId:specimen.worldId||context.getWorldId(),name:specimen.name,form:specimen.form,dna:specimen.dna,generation:specimen.generation,fitness:specimen.fitness});count++;
  }
  await refresh();status(count+" نمونه با شناسهٔ ثابت همگام شد؛ تکرار عملیات نمونهٔ تکراری نمی‌سازد.");
 }catch(error){status(error.message);}
}
async function connect(){
 try{client.setApiBase($("commerceApiBase").value);status("نشانی ذخیره شد؛ سرویس در حال بررسی است…");const result=await client.health();status(result.ok?"سرویس آنلاین پاسخ می‌دهد.":"سرویس آنلاین آماده نیست.");if(client.hasSession())await refresh();}
 catch(error){status(error.message);}
}
$("commerceConnect").addEventListener("click",connect);
$("commerceRegister").addEventListener("click",async()=>{
 try{await client.register($("commerceEmail").value.trim(),$("commercePassword").value);$("commerceVerifyPanel").hidden=false;status("حساب ساخته شد؛ کد تأیید را از ایمیل بردار و وارد کن.");}
 catch(error){status(error.message);}
});
$("commerceVerify").addEventListener("click",async()=>{
 try{const result=await client.verifyEmail($("commerceEmail").value.trim(),$("commerceVerifyCode").value.trim());authView();status("ایمیل تأیید شد؛ "+Number(result.welcomeTokens||20)+" توکن خوش‌آمدگویی اضافه شد.");await refresh();retryPendingBazaarToken();}
 catch(error){status(error.message);}
});
$("commerceLogin").addEventListener("click",async()=>{
 try{await client.login($("commerceEmail").value.trim(),$("commercePassword").value);authView();status("ورود موفق بود.");await refresh();retryPendingBazaarToken();}
 catch(error){status(error.message);}
});
$("commerceLogout").addEventListener("click",()=>{client.logout();authView();$("commerceTokenBalance").textContent="۰";status("از حساب آنلاین خارج شدی.");});
$("commerceRefresh").addEventListener("click",refresh);
$("commerceSyncSpecimens").addEventListener("click",syncSpecimens);
$("commerceListSpecimen").addEventListener("click",async()=>{
 try{const id=$("commerceOwnSpecimen").value,price=Number($("commerceSpecimenPrice").value);
  if(!id)throw new Error("ابتدا نمونه‌ها را همگام‌سازی کن.");
  if(!Number.isSafeInteger(price)||price<1||price>1000000)throw new Error("قیمت باید بین ۱ تا ۱٬۰۰۰٬۰۰۰ توکن باشد.");
  await client.listSpecimen(id,price);status("آگهی ثبت شد؛ فروشنده دقیقاً مبلغ آگهی را می‌گیرد و کارمزد صفر است.");await refresh();
 }catch(error){status(error.message);}
});
window.PlanetCommerceUI={open:function(){
 $("commerceApiBase").value=client.getApiBase();authView();
 if(!client.getApiBase())status("ابتدا Worker را مستقر کن و نشانی HTTPS آن را وارد کن.");
 else if(client.hasSession())refresh();
}};
})();