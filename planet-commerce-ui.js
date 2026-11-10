(function(){
"use strict";
const $=id=>document.getElementById(id);
const client=window.PlanetCommerceClient;
function status(value){const el=$("commerceStatus");if(el)el.textContent=String(value||"");}
function insufficientTokens(error){return /INSUFFICIENT_TOKENS|توکن کافی|اعتبار کافی/i.test(String(error&&error.message||error||""));}
function routeToWalletIfInsufficient(error){
 if(!insufficientTokens(error))return false;
 status("موجودی کافی نیست؛ کیف پول و بسته‌های خرید توکن باز شد.");
 if(window.PlanetGalaxyOpenWallet)window.PlanetGalaxyOpenWallet();
 else if(window.PlanetCommerceUI&&window.PlanetCommerceUI.openSection)window.PlanetCommerceUI.openSection("commerceWalletSection");
 return true;
}
async function notifyAccountReady(){try{const profile=await client.profile();window.dispatchEvent(new CustomEvent("planet:account-ready",{detail:{profile}}));}catch(error){status(error.message||"پروفایل حساب دریافت نشد.");}}
function authView(){const signed=client.hasSession();$("commerceAuthPanel").hidden=signed;$("commerceAccountPanel").hidden=!signed;if(!signed)window.dispatchEvent(new CustomEvent('planet:owned-planets-updated',{detail:{planetIds:[]}}));}
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
  $("commerceProfileHint").textContent=(profile.displayName?"نام عمومی حساب تو ثبت شده است؛ می‌توانی آن را تغییر بدهی.":"برای پروفایل و شناسایی حساب در بازار موجودات، یک نام نمایشی انتخاب و ذخیره کن.")+" شناسه حساب سازنده: "+profile.id;
  $("commerceVipBadge").style.display=profile.vipActive?"inline-block":"none";
  $("commerceProfileCard").style.borderColor=profile.vipActive?"#e6bd68":"#365b77";
  $("commerceProfileCard").style.boxShadow=profile.vipActive?"0 0 0 1px #e6bd6844,0 0 22px #d5a84422":"none";
  $("commerceVipStatus").textContent=profile.vipActive?"VIP فعال تا "+String(profile.vipExpiresAt||"").slice(0,10):"اشتراک VIP فعال نیست.";
  $("commerceVipDaily").disabled=!profile.vipActive||profile.vipDailyClaimedToday;
  $("commerceVipDaily").textContent=profile.vipDailyClaimedToday?"پاداش امروز دریافت شده":"دریافت ۱۰ توکن روزانه";
  $("commerceTokenBalance").textContent=Number(wallet.balance||0).toLocaleString("fa-IR");
  window.dispatchEvent(new CustomEvent("planet:wallet-updated",{detail:{balance:Number(wallet.balance||0)}}));
  const ownedIds=new Set((owned.planets||[]).map(x=>x.id)),catalogBox=$("commercePlanetCatalog");window.dispatchEvent(new CustomEvent('planet:owned-planets-updated',{detail:{planetIds:Array.from(ownedIds)}}));catalogBox.textContent="";
  (catalog.planets||[]).forEach(planet=>{
   row(catalogBox,planet.name,planet.type+" · "+planet.price+" توکن"+(profile.vipActive?" · VIP: "+Math.round(planet.price*.9)+" توکن":""),ownedIds.has(planet.id)?"خریداری‌شده":"خرید",async()=>{
    if(ownedIds.has(planet.id))return;
    const shownPrice=profile.vipActive?Math.round(planet.price*.9):planet.price;
    if(!confirm("سیارهٔ "+planet.name+" با قیمت "+shownPrice+" توکن"+(profile.vipActive?" (با تخفیف VIP)":"")+" خریداری شود؟"))return;
    try{const result=await client.buyPlanet(planet.id);status("سیارهٔ "+result.planet.name+" ثبت شد؛ "+result.paid+" توکن پرداخت شد.");await refresh();}catch(error){if(!routeToWalletIfInsufficient(error))status(error.message);}
   });
   if(ownedIds.has(planet.id))catalogBox.lastElementChild.querySelector("button").disabled=true;
  });
  const specimens=collection.specimens||[],own=specimens.filter(x=>x.status==="owned"),eligibleOwn=own.filter(x=>Number(x.market_eligible)===1),myBox=$("commerceMySpecimens");myBox.textContent="";fillOwnSelect(eligibleOwn);
  own.forEach(x=>row(myBox,x.name,x.form+" · "+Number(x.body_length_cm||0)+" cm · نسل "+Number(x.generation||0)+(Number(x.market_eligible)===1?" · آمادهٔ فروش":" · نگهداری در آلبوم"),Number(x.market_eligible)===1?"انتخاب برای فروش":"در آلبوم",()=>{if(Number(x.market_eligible)===1){$("commerceOwnSpecimen").value=String(x.id);$("commerceSpecimenPrice").focus();}}));
  specimens.filter(x=>x.status==="listed").forEach(x=>row(myBox,x.name,x.form+" · "+Number(x.body_length_cm||0)+" cm · آگهی فعال","لغو آگهی",async()=>{
   try{await client.cancelListing(x.listing_id);status("آگهی لغو شد و نمونه به کلکسیون برگشت.");await refresh();}catch(error){status(error.message);}
  }));
  const marketBox=$("commerceMarketListings");marketBox.textContent="";
  (market.listings||[]).forEach(x=>row(marketBox,x.name,x.form+" · "+Number(x.body_length_cm||0)+" cm · فروشنده: "+(x.seller_name||"بازیکن")+(Number(x.seller_vip)===1?" ✦ VIP":"")+" · نسل "+x.generation+" · "+x.price+" توکن","خرید",async()=>{
   if(!confirm("این نمونه با قیمت "+x.price+" توکن خریداری شود؟"))return;
   try{const result=await client.buyListing(x.id);status("خرید انجام شد؛ "+result.sellerReceived+" توکن به فروشنده و "+result.creatorFee+" توکن (۵٪) به سازنده رسید.");await refresh();}catch(error){if(!routeToWalletIfInsufficient(error))status(error.message);}
  }));
  if(!(market.listings||[]).length)marketBox.textContent="فعلاً آگهی فعالی از بازیکنان دیگر وجود ندارد.";
  authView();status("حساب متصل است؛ موجودی و بازار از سرور به‌روزرسانی شدند.");
 }catch(error){authView();status(error.message);}
}
async function syncSpecimens(){
 try{
  const context=window.PlanetCommerceContext;if(!context)throw new Error("اتصال کلکسیون محلی آماده نیست.");
  const state=context.getCollection();let count=0;
  let rewardTokens=0;
  for(const specimen of state.specimens){if(specimen.source==="online")continue;
   const result=await client.registerSpecimen({clientKey:specimen.id,planetId:specimen.worldId||context.getWorldId(),name:specimen.name,form:specimen.form,dna:specimen.dna,generation:specimen.generation,fitness:specimen.fitness,bodyLengthCm:specimen.bodyLengthCm,special:specimen.special,rarityScore:specimen.rarityScore,originWorldType:specimen.originWorldType});count++;rewardTokens+=Number(result.rewardTokens||0);
  }
  await refresh();status(count+" نمونه همگام شد؛ "+rewardTokens+" توکن پاداش ورود اولیه به کلکسیون دریافت شد. برای هر موجود فقط یک‌بار.");
 }catch(error){status(error.message);}
}
$("commerceRegister").addEventListener("click",async()=>{
 try{await client.register($("commerceEmail").value.trim(),$("commercePassword").value);$("commerceVerifyPanel").hidden=false;status("حساب ساخته شد؛ کد تأیید را از ایمیل بردار و وارد کن.");}
 catch(error){status(error.message);}
});
$("commerceVerify").addEventListener("click",async()=>{
 try{const result=await client.verifyEmail($("commerceEmail").value.trim(),$("commerceVerifyCode").value.trim());authView();status("ایمیل تأیید شد؛ "+Number(result.totalTokens||140)+" توکن خوش‌آمدگویی اضافه شد.");await refresh();retryPendingBazaarToken();await notifyAccountReady();}
 catch(error){status(error.message);}
});
$("commerceForgotPassword").addEventListener("click",async()=>{
 try{await client.requestPasswordReset($("commerceEmail").value.trim());$("commerceResetPanel").hidden=false;status("اگر حساب ایمیلی واجد شرایط باشد، کد بازیابی به ایمیل ارسال می‌شود.");}
 catch(error){status(error.message);}
});
$("commerceResetPassword").addEventListener("click",async()=>{
 try{await client.resetPassword($("commerceEmail").value.trim(),$("commerceResetCode").value.trim(),$("commerceNewPassword").value);$("commerceResetPanel").hidden=true;$("commerceNewPassword").value="";$("commerceResetCode").value="";status("گذرواژه با موفقیت تغییر کرد؛ اکنون وارد حساب شو.");}
 catch(error){status(error.message);}
});
$("commerceLogin").addEventListener("click",async()=>{
 try{await client.login($("commerceEmail").value.trim(),$("commercePassword").value);authView();status("ورود موفق بود.");await refresh();retryPendingBazaarToken();await notifyAccountReady();}
 catch(error){status(error.message);}
});
$("commerceLogout").addEventListener("click",()=>{client.logout();authView();$("commerceTokenBalance").textContent="۰";status("از حساب آنلاین خارج شدی.");});
$("commerceSaveDisplayName").addEventListener("click",async()=>{
 try{const result=await client.setDisplayName($("commerceDisplayName").value);$("commerceDisplayName").value=result.displayName;$("commerceProfileHint").textContent="نام نمایشی حساب ذخیره شد؛ نام مالک کنار سیاره‌ها نمایش داده نمی‌شود.";status("نام نمایشی حساب ذخیره شد.");}
 catch(error){$("commerceProfileHint").textContent=error.message;status(error.message);}
});
$("commerceRefresh").addEventListener("click",refresh);
$("commerceWalletBack")?.addEventListener("click",()=>$("closeCollectionShop")?.click());
$("commerceSyncSpecimens").addEventListener("click",syncSpecimens);
$("commerceListSpecimen").addEventListener("click",async()=>{
 try{const id=$("commerceOwnSpecimen").value,price=Number($("commerceSpecimenPrice").value);
  if(!id)throw new Error("ابتدا نمونه‌ها را همگام‌سازی کن.");
  if(!Number.isSafeInteger(price)||price<50)throw new Error("قیمت باید عدد صحیح و حداقل ۵۰ توکن باشد؛ سقف قیمت ندارد.");
  await client.listSpecimen(id,price);status("آگهی ثبت شد؛ پس از فروش، ۹۵٪ به فروشنده و ۵٪ به سازنده می‌رسد.");await refresh();
 }catch(error){status(error.message);}
});
let activeBazaarToken="",activeVipToken="";
const tokenAmounts={planet_tokens_200:200,planet_tokens_500:500,planet_tokens_1000:1000,planet_tokens_2000:2000};
function updateNativeButtons(){
 const bridge=window.AndroidCommerceBridge,configured=!!(bridge&&bridge.isBazaarConfigured&&bridge.isBazaarConfigured());
 const google=$("commerceGoogleLogin"),serviceReady=!!client.getApiBase();
 if(google)google.hidden=!(serviceReady&&bridge&&bridge.startGoogleSignIn);
 ["commerceLogin","commerceRegister","commerceVerify"].forEach(id=>{const el=$(id);if(el)el.disabled=!serviceReady;});
 ["200","500","1000","2000"].forEach(n=>{const b=$("commerceBuyTokens"+n);if(b){b.hidden=false;b.disabled=!configured;b.title=configured?"":"خرید توکن پس از پیکربندی پرداخت کافه‌بازار فعال می‌شود.";}});
 $("commerceBuyVip").hidden=!(configured&&bridge.startBazaarVipSubscription);
}
async function verifyPendingBazaarToken(token,productId){
 if(!token||!client.hasSession()||activeBazaarToken===token)return;
 activeBazaarToken=token;productId=tokenAmounts[productId]?productId:"planet_tokens_200";
 try{
  status("در حال تأیید رسید بستهٔ "+tokenAmounts[productId]+" توکنی در سرور…");
  const result=await client.verifyBazaarReceipt(productId,token);
  if(!result.ok)throw new Error("تأیید رسید کافه‌بازار ناموفق بود.");
  const bridge=window.AndroidCommerceBridge;
  if(!bridge||!bridge.consumeBazaarPurchase)throw new Error("برای نهایی‌سازی خرید، نسخهٔ اندروید Planet را باز کن.");
  status("رسید در سرور تأیید شد؛ در حال نهایی‌سازی پرداخت…");
  bridge.consumeBazaarPurchase(token,productId);
 }catch(error){activeBazaarToken="";status(error.message);}
}
async function verifyPendingVipToken(token){
 if(!token||!client.hasSession()||activeVipToken===token)return;
 activeVipToken=token;
 try{
  status("در حال اعتبارسنجی اشتراک VIP شصت‌روزه…");
  const result=await client.verifyVipReceipt("planet_vip_60d",token);
  if(!result.ok)throw new Error("اعتبارسنجی اشتراک VIP ناموفق بود.");
  const bridge=window.AndroidCommerceBridge;
  if(bridge&&bridge.clearPendingVipSubscription)bridge.clearPendingVipSubscription(token);
  activeVipToken="";status("اشتراک VIP فعال شد؛ مزایا تا پایان اعتبار اشتراک در دسترس‌اند.");await refresh();
 }catch(error){activeVipToken="";status(error.message);}
}
function retryPendingBazaarToken(){
 const bridge=window.AndroidCommerceBridge;
 if(!bridge||!client.hasSession())return;
 if(bridge.getPendingBazaarPurchaseToken){
  const token=bridge.getPendingBazaarPurchaseToken(),product=bridge.getPendingBazaarPurchaseProductId?bridge.getPendingBazaarPurchaseProductId():"planet_tokens_200";
  if(token)verifyPendingBazaarToken(token,product);
 }
 if(bridge.getPendingVipSubscriptionToken){const vip=bridge.getPendingVipSubscriptionToken();if(vip)verifyPendingVipToken(vip);}
}
window.PlanetCommerceUI={
 openSection:function(sectionId){
  if(!client.hasSession()){$("openCollectionShop")?.click();return;}
  $("collectionOverlay").classList.add("open");authView();refresh();
  const target=$(sectionId);if(target)target.scrollIntoView({behavior:"smooth",block:"start"});
 },
 open:function(){
  authView();updateNativeButtons();
  if(!client.getApiBase()){status("سرویس حساب آنلاین هنوز در حال آماده‌سازی است. لطفاً بعداً دوباره تلاش کن.");return;}
  status("در حال اتصال امن به سرویس Planet…");
  client.health().then(result=>status(result.ok?"سرویس آنلاین آماده است.":"سرویس آنلاین فعلاً پاسخ‌گو نیست.")).catch(error=>status(error.message));
  if(client.hasSession()){refresh();retryPendingBazaarToken();}
 },
 handleGoogleIdToken:async function(token,nonce){
  try{await client.googleLogin(token,nonce);authView();status("ورود با Google موفق بود.");await refresh();retryPendingBazaarToken();await notifyAccountReady();}
  catch(error){status(error.message);}
 },
 handleGoogleError:function(message){status(message||"ورود Google انجام نشد.");},
 handleBazaarPurchaseToken:function(token,productId){
  if(!client.hasSession()){status("رسید خرید محفوظ ماند؛ ابتدا وارد حساب Planet شو تا خرید تأیید شود.");return;}
  verifyPendingBazaarToken(token,productId);
 },
 handleBazaarVipPurchaseToken:function(token){
  if(!client.hasSession()){status("رسید اشتراک VIP محفوظ ماند؛ ابتدا وارد حساب Planet شو.");return;}
  verifyPendingVipToken(token);
 },
 handleBazaarNativeError:function(message){activeBazaarToken="";activeVipToken="";status(message||"پرداخت کافه‌بازار کامل نشد.");},
 handleBazaarStatus:function(message){status(message||"");},
 onBazaarConsumed:async function(productId){
  activeBazaarToken="";status((tokenAmounts[productId]||200)+" توکن به کیف پول آنلاین اضافه شد و رسید نهایی شد.");await refresh();
 },
 onBazaarReady:function(){updateNativeButtons();retryPendingBazaarToken();}
};
$("commerceGoogleLogin").addEventListener("click",()=>{
 const bridge=window.AndroidCommerceBridge;
 if(bridge&&bridge.startGoogleSignIn)bridge.startGoogleSignIn();
 else status("ورود Google فقط در نسخهٔ اندروید فعال است.");
});
["200","500","1000","2000"].forEach(n=>$("commerceBuyTokens"+n).addEventListener("click",()=>{
 const bridge=window.AndroidCommerceBridge,productId="planet_tokens_"+n;
 if(bridge&&bridge.startBazaarPurchase)bridge.startBazaarPurchase(productId);
 else status("پرداخت کافه‌بازار فقط در نسخهٔ اندروید فعال است.");
}));
$("commerceBuyVip").addEventListener("click",()=>{
 const bridge=window.AndroidCommerceBridge;
 if(bridge&&bridge.startBazaarVipSubscription)bridge.startBazaarVipSubscription();
 else status("خرید اشتراک VIP فقط در نسخهٔ اندروید فعال است.");
});
$("commerceVipDaily").addEventListener("click",async()=>{
 try{const result=await client.claimVipDaily();status("۱۰ توکن پاداش روزانهٔ VIP دریافت شد.");$("commerceTokenBalance").textContent=Number(result.balance||0).toLocaleString("fa-IR");$("commerceVipDaily").disabled=true;}
 catch(error){status(error.message);}
});
authView();updateNativeButtons();if(client.hasSession())setTimeout(()=>refresh().catch(error=>status(error.message)),1200);
})();