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
  const [wallet,collection,market,catalog,owned,profile]=await Promise.all([client.wallet(),client.collection(),client.listings(),client.planets(),client.ownedPlanets(),client.profile()]);
  $("commerceDisplayName").value=profile.displayName||"";
  $("commerceProfileHint").textContent=profile.displayName?"نام عمومی حساب تو ثبت شده است؛ می‌توانی آن را تغییر بدهی.":"برای نمایش نامت به‌عنوان مالک سیاره، یک نام نمایشی انتخاب و ذخیره کن.";
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
$("commerceSaveDisplayName").addEventListener("click",async()=>{
 try{const result=await client.setDisplayName($("commerceDisplayName").value);$("commerceDisplayName").value=result.displayName;$("commerceProfileHint").textContent="نام نمایشی ذخیره شد و برای نمایش عمومی مالکیت سیاره استفاده می‌شود.";status("نام نمایشی حساب ذخیره شد.");}
 catch(error){$("commerceProfileHint").textContent=error.message;status(error.message);}
});
$("commerceRefresh").addEventListener("click",refresh);
$("commerceSyncSpecimens").addEventListener("click",syncSpecimens);
$("commerceListSpecimen").addEventListener("click",async()=>{
 try{const id=$("commerceOwnSpecimen").value,price=Number($("commerceSpecimenPrice").value);
  if(!id)throw new Error("ابتدا نمونه‌ها را همگام‌سازی کن.");
  if(!Number.isSafeInteger(price)||price<1||price>1000000)throw new Error("قیمت باید بین ۱ تا ۱٬۰۰۰٬۰۰۰ توکن باشد.");
  await client.listSpecimen(id,price);status("آگهی ثبت شد؛ فروشنده دقیقاً مبلغ آگهی را می‌گیرد و کارمزد صفر است.");await refresh();
 }catch(error){status(error.message);}
});
let activeBazaarToken="";
function updateNativeButtons(){
 const bridge=window.AndroidCommerceBridge;
 const google=$("commerceGoogleLogin"),buy=$("commerceBuyTokens");
 if(google)google.hidden=!(bridge&&bridge.isGoogleConfigured&&bridge.isGoogleConfigured());
 if(buy)buy.hidden=!(bridge&&bridge.isBazaarConfigured&&bridge.isBazaarConfigured());
}
async function verifyPendingBazaarToken(token){
 if(!token||!client.hasSession()||activeBazaarToken===token)return;
 activeBazaarToken=token;
 try{
  status("در حال تأیید رسید ۲۰۰ توکن در سرور…");
  const result=await client.verifyBazaarReceipt("planet_tokens_200",token);
  if(!result.ok)throw new Error("تأیید رسید کافه‌بازار ناموفق بود.");
  const bridge=window.AndroidCommerceBridge;
  if(!bridge||!bridge.consumeBazaarPurchase)throw new Error("برای نهایی‌سازی خرید، نسخهٔ اندروید Planet را باز کن.");
  status("رسید در سرور تأیید شد؛ در حال نهایی‌سازی پرداخت…");
  bridge.consumeBazaarPurchase(token);
 }catch(error){activeBazaarToken="";status(error.message);}
}
function retryPendingBazaarToken(){
 const bridge=window.AndroidCommerceBridge;
 if(!bridge||!bridge.getPendingBazaarPurchaseToken||!client.hasSession())return;
 const token=bridge.getPendingBazaarPurchaseToken();
 if(token)verifyPendingBazaarToken(token);
}
window.PlanetCommerceUI={
 open:function(){
  $("commerceApiBase").value=client.getApiBase();authView();updateNativeButtons();
  if(!client.getApiBase())status("ابتدا Worker را مستقر کن و نشانی HTTPS آن را وارد کن.");
  else if(client.hasSession()){refresh();retryPendingBazaarToken();}
 },
 handleGoogleIdToken:async function(token,nonce){
  try{await client.googleLogin(token,nonce);authView();status("ورود با Google موفق بود.");await refresh();retryPendingBazaarToken();}
  catch(error){status(error.message);}
 },
 handleGoogleError:function(message){status(message||"ورود Google انجام نشد.");},
 handleBazaarPurchaseToken:function(token){
  if(!client.hasSession()){status("رسید خرید محفوظ ماند؛ ابتدا وارد حساب Planet شو تا خرید تأیید شود.");return;}
  verifyPendingBazaarToken(token);
 },
 handleBazaarNativeError:function(message){activeBazaarToken="";status(message||"پرداخت کافه‌بازار کامل نشد.");},
 handleBazaarStatus:function(message){status(message||"");},
 onBazaarConsumed:async function(){
  activeBazaarToken="";status("۲۰۰ توکن به کیف پول آنلاین اضافه شد و رسید نهایی شد.");await refresh();
 },
 onBazaarReady:function(){updateNativeButtons();retryPendingBazaarToken();}
};
$("commerceGoogleLogin").addEventListener("click",()=>{
 const bridge=window.AndroidCommerceBridge;
 if(bridge&&bridge.startGoogleSignIn)bridge.startGoogleSignIn();
 else status("ورود Google فقط در نسخهٔ اندروید فعال است.");
});
$("commerceBuyTokens").addEventListener("click",()=>{
 const bridge=window.AndroidCommerceBridge;
 if(bridge&&bridge.startBazaarPurchase)bridge.startBazaarPurchase();
 else status("پرداخت کافه‌بازار فقط در نسخهٔ اندروید فعال است.");
});
updateNativeButtons();
})();