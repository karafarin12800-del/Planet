/**
 * PLANET account, wallet, Bazaar billing and player marketplace API.
 * Deploy as a dedicated Worker with the D1 schema in schema.sql.
 * All balances and specimen ownership are server-authoritative.
 */
const JSON_HEADERS = { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" };
const encoder = new TextEncoder();
const decoder = new TextDecoder();
function bytesToB64Url(bytes) {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g,"-").replace(/\//g,"_").replace(/=+$/,"");
}
function textToB64Url(value) { return bytesToB64Url(encoder.encode(String(value))); }
const b64url=bytesToB64Url;
function b64UrlToBytes(value) {
  const normalized=String(value||"").replace(/-/g,"+").replace(/_/g,"/");
  const binary=atob(normalized+"=".repeat((4-normalized.length%4)%4));
  return Uint8Array.from(binary,c=>c.charCodeAt(0));
}
async function sha256(value) {
  const digest=await crypto.subtle.digest("SHA-256",encoder.encode(String(value)));
  return Array.from(new Uint8Array(digest),b=>b.toString(16).padStart(2,"0")).join("");
}
async function passwordHash(password,salt) {
  const key=await crypto.subtle.importKey("raw",encoder.encode(String(password)),"PBKDF2",false,["deriveBits"]);
  const bits=await crypto.subtle.deriveBits({name:"PBKDF2",hash:"SHA-256",salt:b64UrlToBytes(salt),iterations:120000},key,256);
  return Array.from(new Uint8Array(bits),b=>b.toString(16).padStart(2,"0")).join("");
}
function response(payload,status=200,extraHeaders={}) {
  const headers=new Headers(JSON_HEADERS);
  for(const [key,value] of Object.entries(extraHeaders||{})) if(value) headers.set(key,value);
  return new Response(JSON.stringify(payload),{status,headers});
}
function corsFor(req,env) {
  const origin=req.headers.get("Origin");
  const allowed=String(env.ALLOWED_ORIGINS||"https://appassets.androidplatform.net,https://karafarin12800-del.github.io,https://toonplay.ir,https://www.toonplay.ir")
    .split(",").map(x=>x.trim()).filter(Boolean);
  const headers={"access-control-allow-methods":"GET,POST,OPTIONS","access-control-allow-headers":"authorization,content-type","access-control-max-age":"86400","vary":"Origin"};
  if(origin&&allowed.includes(origin)) headers["access-control-allow-origin"]=origin;
  return headers;
}
async function tokenKey(env) {
  if(!env.AUTH_SECRET||String(env.AUTH_SECRET).length<32) throw new Error("AUTH_SECRET_NOT_CONFIGURED");
  return crypto.subtle.importKey("raw",encoder.encode(String(env.AUTH_SECRET)),{name:"HMAC",hash:"SHA-256"},false,["sign","verify"]);
}
async function signToken(account,env) {
  const head=textToB64Url(JSON.stringify({alg:"HS256",typ:"JWT"}));
  const body=textToB64Url(JSON.stringify({sub:account.id,email:account.email,iat:Math.floor(Date.now()/1000),exp:Math.floor(Date.now()/1000)+30*24*60*60}));
  const content=head+"."+body;
  const signature=await crypto.subtle.sign("HMAC",await tokenKey(env),encoder.encode(content));
  return content+"."+bytesToB64Url(new Uint8Array(signature));
}
async function authenticate(req,env) {
  const header=req.headers.get("Authorization")||"";
  const match=header.match(/^Bearer\s+([A-Za-z0-9_.-]+)$/);
  if(!match) return null;
  const parts=match[1].split(".");
  if(parts.length!==3) return null;
  try {
    const key=await tokenKey(env),content=parts[0]+"."+parts[1],signature=b64UrlToBytes(parts[2]);
    if(!await crypto.subtle.verify("HMAC",key,signature,encoder.encode(content))) return null;
    const claims=JSON.parse(decoder.decode(b64UrlToBytes(parts[1])));
    if(!claims.sub||!Number.isFinite(claims.exp)||claims.exp<=Math.floor(Date.now()/1000)) return null;
    const user=await env.DB.prepare("SELECT id,email,verified_at FROM users WHERE id=?").bind(claims.sub).first();
    if(!user||!user.verified_at) return null;
    return {id:user.id,email:user.email};
  } catch { return null; }
}

const TOKEN_PRODUCTS = Object.freeze({planet_tokens_200:200,planet_tokens_500:500,planet_tokens_1000:1000,planet_tokens_2000:2000});
const VIP_PRODUCT = "planet_vip_60d";
const VIP_DAILY_GRANT = 10;
const WELCOME_GRANT = 120;
const STARTER_GRANT = 20;
const GALLERY_ENTRY_GRANT = 10;
const CREATOR_COMMISSION_RATE = 0.05;
const clamp = (n, a, b) => Math.max(a, Math.min(b, n));
const PLANET_TYPES=[
{id:"terrestrial",label:"سنگی",biomes:["دشت","کوهستان","بیابان","جنگل"],radius:[4200,8200],water:[0.05,0.65],temp:[-25,42]},
{id:"ocean",label:"اقیانوسی",biomes:["اقیانوس","جزیره","آب‌های کم‌عمق"],radius:[5000,10500],water:[0.72,0.99],temp:[-5,35]},
{id:"ice",label:"یخی",biomes:["یخزار","اقیانوس زیرسطحی","شکاف یخی"],radius:[2500,7800],water:[0.35,0.95],temp:[-150,-5]},
{id:"desert",label:"بیابانی",biomes:["تپه‌های شنی","درهٔ سنگی","دشت نمکی"],radius:[3000,9000],water:[0,0.12],temp:[15,95]},
{id:"volcanic",label:"آتشفشانی",biomes:["دشت گدازه","کوه آتشفشانی","غار معدنی"],radius:[3500,9500],water:[0,0.18],temp:[80,450]},
{id:"gas-giant",label:"غول گازی",biomes:["ابرهای فوقانی","کمربندهای طوفانی"],radius:[30000,85000],water:[0,0.03],temp:[-180,30]}];
const PLANET_NAMES=["آوید","رایا","هیراد","مانا","ویرا","آترین","دانا","آریو","نیوا","هانا","آرکا","سایا"];
const hash32=v=>{let h=2166136261;const s=String(v);for(let i=0;i<s.length;i++){h^=s.charCodeAt(i);h=Math.imul(h,16777619);}return h>>>0;};
const random=seed=>{let s=seed>>>0;return()=>{s=(Math.imul(s,1664525)+1013904223)>>>0;return s/4294967296;}};
const pick=(r,a)=>a[Math.floor(r()*a.length)],range=(r,p)=>p[0]+r()*(p[1]-p[0]);
function planetEconomy(p){
 const temp=Number(p.meanTemperatureC)||0,water=clamp(p.waterCoverage,0,1),gravity=clamp(p.gravity||1,.05,10);
 const thermal=clamp(1-Math.max(0,Math.abs(temp-18)-18)/260,.08,1),waterFit=clamp(1-Math.abs(water-.52)*1.15,.12,1),gravityFit=clamp(1-Math.abs(Math.log2(gravity))*.24,.18,1);
 const atmosphere=({"nitrogen-oxygen":1,"nitrogen-rich":.94,"thin-carbon-dioxide":.82,"dense-carbon-dioxide":.64,"hydrogen-helium":.52,"trace-atmosphere":.45}[p.atmosphere]||.62);
 const surface=p.type==="gas-giant"?.42:p.type==="volcanic"?.58:p.type==="ice"?.76:p.type==="desert"?.72:1;
 const life=clamp(Math.round((thermal*.28+waterFit*.24+gravityFit*.16+atmosphere*.18+surface*.14)*100),5,100);
 const extreme=clamp(Math.abs(temp-18)/180,0,1),diversity=clamp((p.biomes||[]).length/5,0,1);
 const special=clamp(Math.round(25+life*.36+extreme*18+diversity*18+(p.type==="volcanic"||p.type==="gas-giant"?12:0)),10,100);
 p.lifePotential=life;p.specialSpeciesPotential=special;p.priceTokens=clamp(150+Math.round(850*(life*.72+special*.28)/100),150,1000);p.creatureCapacity=2;return p;
}
function makePlanet(systemId,index,rng,home){
 const type=home?PLANET_TYPES[0]:pick(rng,PLANET_TYPES),id=systemId+"-p"+(index+1);
 const water=home?0.71:range(rng,type.water),temperature=home?15:range(rng,type.temp);
 return planetEconomy({id,name:home?"زمین":pick(rng,PLANET_NAMES),systemId,seed:hash32(id+"|"+Math.floor(rng()*4294967295)),
 type:type.id,typeLabel:type.label,radiusKm:Math.round(range(rng,type.radius)),gravity:Math.round((home?1:range(rng,[.25,2.4]))*100)/100,
 meanTemperatureC:Math.round(temperature),waterCoverage:Math.round(water*1000)/1000,
 atmosphere:home?"nitrogen-oxygen":pick(rng,["thin-carbon-dioxide","dense-carbon-dioxide","nitrogen-rich","hydrogen-helium","trace-atmosphere"]),
 biomes:home?["اقیانوس","جنگل","دشت","بیابان","کوهستان"]:type.biomes.slice(),home:!!home});
}
function planets(){
 const rows=[],seed=0x504c414e;
 for(let si=0;si<17&&rows.length<100;si++){
  const rng=random(hash32(seed+"|system|"+si)),systemId="system-"+String(si+1).padStart(2,"0"),count=si===0?8:6+Math.floor(rng()*3);
  for(let i=0;i<count&&rows.length<100;i++){
   const p=makePlanet(systemId,i,rng,si===0&&i===0);if(p.home)continue;
   const n=rows.length+1;
   rows.push({id:"planet-"+String(n).padStart(3,"0"),galaxyPlanetId:"market-world-"+String(n).padStart(3,"0"),galaxyId:p.id,
    name:p.name+" "+String(n).padStart(3,"0"),type:p.typeLabel,typeId:p.type,price:p.priceTokens,lifePotential:p.lifePotential,specialSpeciesPotential:p.specialSpeciesPotential,
    creatureCapacity:p.creatureCapacity,radiusKm:p.radiusKm,gravity:p.gravity,meanTemperatureC:p.meanTemperatureC,waterCoverage:p.waterCoverage,
    atmosphere:p.atmosphere,biomes:p.biomes,features:p.biomes});
  }
 }
 const starterSystems=new Set(),starters=new Set();
 for(const planet of rows){const system=planet.galaxyId.split("-p")[0];if(!starterSystems.has(system)){starterSystems.add(system);starters.add(planet.galaxyPlanetId);planet.price=75;planet.creatureCapacity=1;planet.features=(planet.biomes||[]).slice(0,1);planet.starterTier="trial";}}
 const score=p=>Number(p.lifePotential||0)*.72+Number(p.specialSpeciesPotential||0)*.28;
 const regular=rows.filter(p=>!starters.has(p.galaxyPlanetId)).sort((a,b)=>score(a)-score(b)||a.galaxyPlanetId.localeCompare(b.galaxyPlanetId));
 regular.forEach((planet,rank)=>{planet.price=100+Math.round(rank*900/Math.max(1,regular.length-1));});
 return rows;
}
async function jsonBody(req) { try { return await req.json(); } catch { return null; } }
async function sendTransactionalEmail(email,subject,text,env) {
  if(!env.RESEND_API_KEY||!env.VERIFY_FROM_EMAIL) throw new Error("EMAIL_SERVICE_NOT_CONFIGURED");
  const r=await fetch("https://api.resend.com/emails",{method:"POST",headers:{"authorization":"Bearer "+env.RESEND_API_KEY,"content-type":"application/json"},
    body:JSON.stringify({from:env.VERIFY_FROM_EMAIL,to:[email],subject,text})});
  if(!r.ok) throw new Error("EMAIL_DELIVERY_FAILED");
}
async function sendVerification(email,code,env) {
  await sendTransactionalEmail(email,"کد تأیید حساب Planet","کد تأیید شما: "+code+"\nاین کد ۱۵ دقیقه اعتبار دارد.",env);
}
async function sendPasswordReset(email,code,env) {
  await sendTransactionalEmail(email,"بازیابی گذرواژه حساب Planet","کد بازیابی گذرواژه شما: "+code+"\nاین کد ۱۵ دقیقه اعتبار دارد و فقط یک‌بار قابل استفاده است.",env);
}
async function grantWelcome(db,userId) {
  // New email accounts receive 20 starter tokens plus a 120-token welcome grant (140 total).
  const results=await db.batch([
    db.prepare("UPDATE users SET welcome_granted_at=datetime('now') WHERE id=? AND welcome_granted_at IS NULL AND verified_at IS NOT NULL").bind(userId),
    db.prepare("INSERT INTO wallets(user_id,balance) SELECT ?,? WHERE changes()=1 ON CONFLICT(user_id) DO UPDATE SET balance=balance+excluded.balance").bind(userId,STARTER_GRANT),
    db.prepare("INSERT INTO wallet_ledger(user_id,delta,kind,reference) SELECT ?,?,'starter',? WHERE changes()=1").bind(userId,STARTER_GRANT,"starter:"+userId),
    db.prepare("UPDATE wallets SET balance=balance+? WHERE user_id=? AND changes()=1").bind(WELCOME_GRANT,userId),
    db.prepare("INSERT INTO wallet_ledger(user_id,delta,kind,reference) SELECT ?,?,'welcome',? WHERE changes()=1").bind(userId,WELCOME_GRANT,"welcome:"+userId)
  ]);
  return !!results[0].meta.changes;
}
async function route(req, env, url) {
  if(!env.DB) return response({error:"DATABASE_NOT_CONFIGURED"},503);
  const path=url.pathname, method=req.method;
  if(method==="GET"&&path==="/health") return response({ok:true,service:"PLANET commerce API",database:!!env.DB,bazaarConfigured:!!(env.BAZAAR_CLIENT_ID&&env.BAZAAR_CLIENT_SECRET&&env.BAZAAR_REFRESH_TOKEN&&env.BAZAAR_PACKAGE_NAME),emailConfigured:!!(env.RESEND_API_KEY&&env.VERIFY_FROM_EMAIL)});
  if(method==="GET"&&path==="/catalog/planets") return response({version:1,count:100,planets:planets()});
  if(method==="GET"&&path==="/planets/owners"){
    const ids=String(url.searchParams.get("ids")||"").split(",").filter(x=>/^[a-zA-Z0-9_-]{1,80}$/.test(x)).slice(0,100);
    if(!ids.length) return response({owners:{}});
    const marks=ids.map(()=>"?").join(",");
    const rows=await env.DB.prepare("SELECT o.galaxy_planet_id,u.display_name FROM planet_ownership o JOIN users u ON u.id=o.user_id WHERE o.galaxy_planet_id IN ("+marks+") AND u.display_name IS NOT NULL").bind(...ids).all();
    const owners={};for(const row of rows.results||[])owners[row.galaxy_planet_id]=row.display_name;
    return response({owners});
  }
  if(method==="GET"&&path==="/genome/leaderboard"){
    const rows=await env.DB.prepare("SELECT u.display_name AS displayName,SUM(g.score) AS score,SUM(g.species_count) AS speciesCount,SUM(g.special_count) AS specialCount,COUNT(*) AS planetsPlayed FROM genome_scores g JOIN users u ON u.id=g.user_id GROUP BY g.user_id,u.display_name ORDER BY score DESC,speciesCount DESC,specialCount DESC LIMIT 10").all();
    return response({entries:rows.results||[]});
  }
  if(method==="POST"&&path==="/auth/register"){
    const b=await jsonBody(req), email=String(b?.email||"").trim().toLowerCase(), password=String(b?.password||"");
    if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)||password.length<10||password.length>200) return response({error:"INVALID_EMAIL_OR_PASSWORD"},400);
    const id=crypto.randomUUID(),salt=b64url(crypto.getRandomValues(new Uint8Array(16))),hash=await passwordHash(password,salt),code=String(crypto.getRandomValues(new Uint32Array(1))[0]%1000000).padStart(6,"0");
    try {
      await env.DB.prepare("INSERT INTO users(id,email,password_salt,password_hash,created_at) VALUES(?,?,?,?,datetime('now'))").bind(id,email,salt,hash).run();
      await env.DB.prepare("INSERT INTO email_verifications(user_id,code_hash,expires_at) VALUES(?,?,datetime('now','+15 minutes'))").bind(id,await sha256(id+":"+code)).run();
      await sendVerification(email,code,env);
    } catch(e) {
      if(String(e).includes("UNIQUE")) return response({error:"EMAIL_ALREADY_REGISTERED"},409);
      await env.DB.prepare("DELETE FROM users WHERE id=? AND verified_at IS NULL").bind(id).run().catch(()=>{});
      return response({error:String(e).includes("EMAIL_")?String(e):"REGISTRATION_FAILED"},503);
    }
    return response({ok:true,verificationRequired:true},201);
  }
  if(method==="POST"&&path==="/auth/verify-email"){
    const b=await jsonBody(req),email=String(b?.email||"").trim().toLowerCase(),code=String(b?.code||"");
    const user=await env.DB.prepare("SELECT id FROM users WHERE email=?").bind(email).first();
    if(!user) return response({error:"INVALID_OR_EXPIRED_CODE"},400);
    const v=await env.DB.prepare("SELECT code_hash FROM email_verifications WHERE user_id=? AND expires_at>datetime('now')").bind(user.id).first();
    if(!v||v.code_hash!==await sha256(user.id+":"+code)) return response({error:"INVALID_OR_EXPIRED_CODE"},400);
    await env.DB.prepare("UPDATE users SET verified_at=datetime('now') WHERE id=?").bind(user.id).run();
    await env.DB.prepare("DELETE FROM email_verifications WHERE user_id=?").bind(user.id).run();
    const granted=await grantWelcome(env.DB,user.id);
    const account={id:user.id,email};
    return response({ok:true,token:await signToken(account,env),welcomeTokens:granted?WELCOME_GRANT:0,starterTokens:granted?STARTER_GRANT:0,totalTokens:granted?WELCOME_GRANT+STARTER_GRANT:0});
  }
  if(method==="POST"&&path==="/auth/forgot-password"){
    const b=await jsonBody(req),email=String(b?.email||"").trim().toLowerCase();
    if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return response({error:"INVALID_EMAIL_OR_PASSWORD"},400);
    const user=await env.DB.prepare("SELECT id,email,password_hash FROM users WHERE email=?").bind(email).first();
    if(user&&user.password_hash){
      const code=String(crypto.getRandomValues(new Uint32Array(1))[0]%1000000).padStart(6,"0");
      await env.DB.prepare("INSERT INTO password_resets(user_id,code_hash,expires_at,attempts,created_at) VALUES(?,?,datetime('now','+15 minutes'),0,datetime('now')) ON CONFLICT(user_id) DO UPDATE SET code_hash=excluded.code_hash,expires_at=excluded.expires_at,attempts=0,created_at=datetime('now')").bind(user.id,await sha256(user.id+":"+code+":reset")).run();
      try { await sendPasswordReset(email,code,env); }
      catch(e) { await env.DB.prepare("DELETE FROM password_resets WHERE user_id=?").bind(user.id).run(); return response({error:String(e).includes("EMAIL_")?String(e):"EMAIL_DELIVERY_FAILED"},503); }
    }
    return response({ok:true,message:"اگر حساب ایمیلی واجد شرایط باشد، کد بازیابی ارسال می‌شود."});
  }
  if(method==="POST"&&path==="/auth/reset-password"){
    const b=await jsonBody(req),email=String(b?.email||"").trim().toLowerCase(),code=String(b?.code||""),password=String(b?.password||"");
    if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)||!/^[0-9]{6}$/.test(code)||password.length<10||password.length>200) return response({error:"INVALID_EMAIL_OR_PASSWORD"},400);
    const user=await env.DB.prepare("SELECT id FROM users WHERE email=? AND password_hash IS NOT NULL").bind(email).first();
    if(!user) return response({error:"INVALID_OR_EXPIRED_CODE"},400);
    const reset=await env.DB.prepare("SELECT code_hash,attempts FROM password_resets WHERE user_id=? AND expires_at>datetime('now')").bind(user.id).first();
    if(!reset||Number(reset.attempts)>=5) return response({error:"INVALID_OR_EXPIRED_CODE"},400);
    if(reset.code_hash!==await sha256(user.id+":"+code+":reset")){
      await env.DB.prepare("UPDATE password_resets SET attempts=attempts+1 WHERE user_id=?").bind(user.id).run();
      return response({error:"INVALID_OR_EXPIRED_CODE"},400);
    }
    const salt=bytesToB64Url(crypto.getRandomValues(new Uint8Array(16))),hash=await passwordHash(password,salt);
    await env.DB.batch([
      env.DB.prepare("UPDATE users SET password_salt=?,password_hash=? WHERE id=?").bind(salt,hash,user.id),
      env.DB.prepare("DELETE FROM password_resets WHERE user_id=?").bind(user.id)
    ]);
    return response({ok:true});
  }
  if(method==="POST"&&path==="/auth/login"){
    const b=await jsonBody(req),email=String(b?.email||"").trim().toLowerCase(),password=String(b?.password||"");
    const user=await env.DB.prepare("SELECT id,email,password_salt,password_hash,verified_at FROM users WHERE email=?").bind(email).first();
    if(!user||!user.verified_at||await passwordHash(password,user.password_salt)!==user.password_hash) return response({error:"INVALID_CREDENTIALS_OR_UNVERIFIED"},401);
    return response({token:await signToken(user,env),email:user.email});
  }
  if(method==="POST"&&path==="/auth/google"){
    const b=await jsonBody(req),idToken=String(b?.idToken||""),nonce=String(b?.nonce||"");
    if(!idToken||!nonce||nonce.length<20||nonce.length>200||!env.GOOGLE_CLIENT_ID) return response({error:"GOOGLE_LOGIN_NOT_CONFIGURED"},503);
    const check=await fetch("https://oauth2.googleapis.com/tokeninfo?id_token="+encodeURIComponent(idToken));
    const claims=await check.json().catch(()=>({}));
    if(!check.ok||claims.aud!==env.GOOGLE_CLIENT_ID||claims.email_verified!=="true"||claims.nonce!==nonce||!claims.sub||!claims.email) return response({error:"INVALID_GOOGLE_TOKEN"},401);
    let user=await env.DB.prepare("SELECT id,email,verified_at FROM users WHERE google_sub=? OR email=?").bind(claims.sub,String(claims.email).toLowerCase()).first();
    if(!user){
      const id=crypto.randomUUID();
      await env.DB.prepare("INSERT INTO users(id,email,google_sub,verified_at,created_at) VALUES(?,?,?,datetime('now'),datetime('now'))").bind(id,String(claims.email).toLowerCase(),claims.sub).run();
      user={id,email:String(claims.email).toLowerCase(),verified_at:1};
    } else if(!user.verified_at) {
      await env.DB.prepare("UPDATE users SET google_sub=?,verified_at=datetime('now') WHERE id=?").bind(claims.sub,user.id).run();
      user.verified_at=1;
    }
    const granted=await grantWelcome(env.DB,user.id);
    return response({token:await signToken(user,env),email:user.email,welcomeTokens:granted?WELCOME_GRANT:0,starterTokens:granted?STARTER_GRANT:0,totalTokens:granted?WELCOME_GRANT+STARTER_GRANT:0});
  }
  const user=await authenticate(req,env);
  if(!user) return response({error:"UNAUTHORIZED"},401);
  if(method==="POST"&&path==="/genome/score"){
    const b=await jsonBody(req);
    const planetId=String(b?.planetId||"").trim();
    const speciesCount=Number(b?.speciesCount),specialCount=Number(b?.specialCount);
    if(!planetId||planetId.length>180||!Number.isSafeInteger(speciesCount)||!Number.isSafeInteger(specialCount)||
       speciesCount<0||speciesCount>100000||specialCount<0||specialCount>speciesCount){
      return response({error:"INVALID_GENOME_SCORE"},400);
    }
    const score=speciesCount*10+specialCount*25;
    await env.DB.prepare("INSERT INTO genome_scores(user_id,planet_id,score,species_count,special_count,updated_at) VALUES(?,?,?,?,?,datetime('now')) ON CONFLICT(user_id,planet_id) DO UPDATE SET score=MAX(genome_scores.score,excluded.score),species_count=CASE WHEN excluded.score>genome_scores.score THEN excluded.species_count ELSE genome_scores.species_count END,special_count=CASE WHEN excluded.score>genome_scores.score THEN excluded.special_count ELSE genome_scores.special_count END,updated_at=CASE WHEN excluded.score>genome_scores.score THEN datetime('now') ELSE genome_scores.updated_at END")
      .bind(user.id,planetId,score,speciesCount,specialCount).run();
    return response({ok:true,score});
  }
  if(method==="GET"&&path==="/world-seed"){
    const planetId=String(url.searchParams.get("planetId")||""),planet=planets().find(p=>p.id===planetId);
    if(!planet)return response({error:"PLANET_NOT_FOUND"},404);
    const owned=await env.DB.prepare("SELECT 1 AS owned FROM planet_ownership WHERE user_id=? AND galaxy_planet_id=?").bind(user.id,planet.galaxyPlanetId).first();
    if(!owned)return response({error:"PLANET_NOT_OWNED"},403);
    let row=await env.DB.prepare("SELECT seed FROM planet_world_seeds WHERE user_id=? AND galaxy_planet_id=?").bind(user.id,planet.galaxyPlanetId).first();
    if(!row){
      const seed=b64url(crypto.getRandomValues(new Uint8Array(32)));
      await env.DB.prepare("INSERT OR IGNORE INTO planet_world_seeds(user_id,galaxy_planet_id,seed,created_at) VALUES(?,?,?,datetime('now'))").bind(user.id,planet.galaxyPlanetId,seed).run();
      row=await env.DB.prepare("SELECT seed FROM planet_world_seeds WHERE user_id=? AND galaxy_planet_id=?").bind(user.id,planet.galaxyPlanetId).first();
    }
    return response({planetId:planet.id,galaxyPlanetId:planet.galaxyPlanetId,seed:row.seed});
  }
  if(method==="GET"&&path==="/profile"){
    const vip=await env.DB.prepare("SELECT expires_at,last_daily_claim_date=date('now') AS daily_claimed_today FROM vip_entitlements WHERE user_id=?").bind(user.id).first();
    const vipActive=!!vip&&Date.parse(String(vip.expires_at).replace(" ","T")+"Z")>Date.now();
    return response({id:user.id,email:user.email,displayName:user.display_name||"",vipActive,vipExpiresAt:vip?.expires_at||null,vipDailyClaimedToday:!!vip?.daily_claimed_today});
  }
  if(method==="POST"&&path==="/profile"){
    const b=await jsonBody(req),displayName=String(b?.displayName||"").normalize("NFC").trim();
    if(displayName.length<3||displayName.length>24||!/^[\\p{L}\\p{N}_ -]+$/u.test(displayName)||displayName.startsWith(" ")||displayName.endsWith(" "))
      return response({error:"INVALID_DISPLAY_NAME"},400);
    try{await env.DB.prepare("UPDATE users SET display_name=? WHERE id=?").bind(displayName,user.id).run();}
    catch(e){if(String(e).includes("UNIQUE"))return response({error:"DISPLAY_NAME_TAKEN"},409);throw e;}
    return response({ok:true,displayName});
  }
  if(method==="GET"&&path==="/planets/owned"){
    const rows=await env.DB.prepare("SELECT planet_id,galaxy_planet_id,price,created_at FROM planet_ownership WHERE user_id=? ORDER BY created_at DESC").bind(user.id).all();
    const catalog=new Map(planets().map(p=>[p.id,p]));
    return response({planets:(rows.results||[]).map(row=>({...catalog.get(row.planet_id),galaxyPlanetId:row.galaxy_planet_id,purchasedPrice:row.price,purchasedAt:row.created_at})).filter(Boolean)});
  }
  if(method==="POST"&&path==="/planets/buy"){
    const b=await jsonBody(req),planetId=String(b?.planetId||""),planet=planets().find(p=>p.id===planetId);
    if(!planet) return response({error:"PLANET_NOT_FOUND"},404);
    const vip=await env.DB.prepare("SELECT expires_at FROM vip_entitlements WHERE user_id=? AND expires_at>datetime('now')").bind(user.id).first();
    const effectivePrice=vip?Math.max(1,Math.round(planet.price*0.9)):planet.price;
    const owned=await env.DB.prepare("SELECT planet_id FROM planet_ownership WHERE planet_id=?").bind(planetId).first();
    if(owned) return response({error:"PLANET_ALREADY_OWNED"},409);
    const tx=crypto.randomUUID();
    const results=await env.DB.batch([
      env.DB.prepare("INSERT OR IGNORE INTO planet_ownership(user_id,planet_id,galaxy_planet_id,price,created_at) SELECT ?,?,?,?,datetime('now') WHERE EXISTS(SELECT 1 FROM wallets WHERE user_id=? AND balance>=?) AND NOT EXISTS(SELECT 1 FROM planet_ownership WHERE user_id=? AND planet_id=?)").bind(user.id,planetId,planet.galaxyPlanetId,effectivePrice,user.id,effectivePrice,user.id,planetId),
      env.DB.prepare("UPDATE wallets SET balance=balance-? WHERE user_id=? AND balance>=? AND changes()=1").bind(effectivePrice,user.id,effectivePrice),
      env.DB.prepare("INSERT INTO wallet_ledger(user_id,delta,kind,reference) SELECT ?,?,'planet_purchase',? WHERE changes()=1").bind(user.id,-effectivePrice,tx)
    ]);
    if(!results[0].meta.changes){
      const already=await env.DB.prepare("SELECT planet_id FROM planet_ownership WHERE planet_id=?").bind(planetId).first();
      return response({error:already?"PLANET_ALREADY_OWNED":"INSUFFICIENT_TOKENS"},already?409:402);
    }
    if(results.some(r=>!r.meta.changes)) return response({error:"PURCHASE_CONFLICT"},409);
    return response({ok:true,planet,basePrice:planet.price,paid:effectivePrice,discountPercent:vip?10:0,fee:0},201);
  }
  if(method==="GET"&&path==="/wallet"){
    const w=await env.DB.prepare("SELECT balance FROM wallets WHERE user_id=?").bind(user.id).first();
    const vip=await env.DB.prepare("SELECT expires_at FROM vip_entitlements WHERE user_id=?").bind(user.id).first();
    const vipActive=!!vip&&Date.parse(String(vip.expires_at).replace(" ","T")+"Z")>Date.now();
    const ledger=await env.DB.prepare("SELECT delta,kind,reference,created_at FROM wallet_ledger WHERE user_id=? ORDER BY id DESC LIMIT 50").bind(user.id).all();
    return response({balance:w?.balance||0,vipActive,vipExpiresAt:vip?.expires_at||null,ledger:ledger.results||[]});
  }
  if(method==="POST"&&path==="/billing/bazaar/verify"){
    const b=await jsonBody(req),purchaseToken=String(b?.purchaseToken||""),productId=String(b?.productId||"");
    const tokenAmount=TOKEN_PRODUCTS[productId];
    if(!purchaseToken||purchaseToken.length>2048||!tokenAmount) return response({error:"INVALID_PRODUCT_OR_TOKEN"},400);
    if(!env.BAZAAR_CLIENT_ID||!env.BAZAAR_CLIENT_SECRET||!env.BAZAAR_REFRESH_TOKEN||!env.BAZAAR_PACKAGE_NAME) return response({error:"BAZAAR_SERVER_VALIDATION_NOT_CONFIGURED"},503);
    const tokenHash=await sha256(purchaseToken);
    const prior=await env.DB.prepare("SELECT user_id FROM purchases WHERE provider='cafebazaar' AND receipt_hash=?").bind(tokenHash).first();
    if(prior){
      if(prior.user_id!==user.id) return response({error:"BAZAAR_RECEIPT_ALREADY_USED"},409);
      return response({ok:true,alreadyCredited:true,tokenAmount});
    }
    const tokenBody=new URLSearchParams({
      grant_type:"refresh_token",
      client_id:env.BAZAAR_CLIENT_ID,
      client_secret:env.BAZAAR_CLIENT_SECRET,
      refresh_token:env.BAZAAR_REFRESH_TOKEN
    });
    const tokenResponse=await fetch("https://pardakht.cafebazaar.ir/devapi/v2/auth/token/",{
      method:"POST",
      headers:{"content-type":"application/x-www-form-urlencoded","accept":"application/json"},
      body:tokenBody.toString()
    });
    const tokenData=await tokenResponse.json().catch(()=>({}));
    if(!tokenResponse.ok||!tokenData.access_token) return response({error:"BAZAAR_SERVER_VALIDATION_NOT_CONFIGURED"},503);
    const endpoint="https://pardakht.cafebazaar.ir/devapi/v2/api/validate/"
      +encodeURIComponent(env.BAZAAR_PACKAGE_NAME)+"/inapp/"+encodeURIComponent(productId)
      +"/purchases/"+encodeURIComponent(purchaseToken)+"/";
    const check=await fetch(endpoint,{headers:{accept:"application/json",authorization:"Bearer "+tokenData.access_token}});
    const receipt=await check.json().catch(()=>({}));
    if(!check.ok||receipt.error||Number(receipt.purchaseState)!==0) return response({error:"BAZAAR_RECEIPT_INVALID"},402);
    const grant=await env.DB.batch([
      env.DB.prepare("INSERT OR IGNORE INTO purchases(user_id,provider,product_id,receipt_hash,token_amount,created_at) VALUES(?,?,?,?,?,datetime('now'))").bind(user.id,"cafebazaar",productId,tokenHash,tokenAmount),
      env.DB.prepare("INSERT INTO wallets(user_id,balance) SELECT ?,? WHERE changes()=1 ON CONFLICT(user_id) DO UPDATE SET balance=balance+excluded.balance").bind(user.id,tokenAmount),
      env.DB.prepare("INSERT INTO wallet_ledger(user_id,delta,kind,reference) SELECT ?,?,'bazaar_purchase',? WHERE changes()=1").bind(user.id,tokenAmount,tokenHash)
    ]);
    if(!grant[0].meta.changes){
      const priorOwner=await env.DB.prepare("SELECT user_id FROM purchases WHERE provider='cafebazaar' AND receipt_hash=?").bind(tokenHash).first();
      if(!priorOwner||priorOwner.user_id!==user.id) return response({error:"BAZAAR_RECEIPT_ALREADY_USED"},409);
      return response({ok:true,alreadyCredited:true,tokenAmount});
    }
    return response({ok:true,tokenAmount});
  }
  if(method==="POST"&&path==="/billing/bazaar/vip/verify"){
    const b=await jsonBody(req),purchaseToken=String(b?.purchaseToken||""),productId=String(b?.productId||"");
    if(!purchaseToken||purchaseToken.length>2048||productId!==VIP_PRODUCT) return response({error:"INVALID_PRODUCT_OR_TOKEN"},400);
    if(!env.BAZAAR_CLIENT_ID||!env.BAZAAR_CLIENT_SECRET||!env.BAZAAR_REFRESH_TOKEN||!env.BAZAAR_PACKAGE_NAME) return response({error:"BAZAAR_SERVER_VALIDATION_NOT_CONFIGURED"},503);
    const tokenHash=await sha256(purchaseToken);
    const prior=await env.DB.prepare("SELECT user_id FROM vip_subscriptions WHERE provider='cafebazaar' AND receipt_hash=?").bind(tokenHash).first();
    if(prior&&prior.user_id!==user.id) return response({error:"BAZAAR_RECEIPT_ALREADY_USED"},409);
    const tokenBody=new URLSearchParams({grant_type:"refresh_token",client_id:env.BAZAAR_CLIENT_ID,client_secret:env.BAZAAR_CLIENT_SECRET,refresh_token:env.BAZAAR_REFRESH_TOKEN});
    const tokenResponse=await fetch("https://pardakht.cafebazaar.ir/devapi/v2/auth/token/",{method:"POST",headers:{"content-type":"application/x-www-form-urlencoded","accept":"application/json"},body:tokenBody.toString()});
    const tokenData=await tokenResponse.json().catch(()=>({}));
    if(!tokenResponse.ok||!tokenData.access_token) return response({error:"BAZAAR_SERVER_VALIDATION_NOT_CONFIGURED"},503);
    const endpoint="https://pardakht.cafebazaar.ir/devapi/v2/api/applications/"+encodeURIComponent(env.BAZAAR_PACKAGE_NAME)+"/subscriptions/"+encodeURIComponent(VIP_PRODUCT)+"/purchases/"+encodeURIComponent(purchaseToken)+"/";
    const check=await fetch(endpoint,{headers:{accept:"application/json",authorization:"Bearer "+tokenData.access_token}});
    const receipt=await check.json().catch(()=>({}));
    const validUntil=Number(receipt.validUntilTimestampMsec||0);
    if(!check.ok||receipt.error||!Number.isFinite(validUntil)||validUntil<=Date.now()) return response({error:"BAZAAR_SUBSCRIPTION_INVALID"},402);
    const expiresAt=new Date(validUntil).toISOString().slice(0,19).replace("T"," ");
    const startedAt=Number(receipt.initiationTimestampMsec||Date.now());
    const writes=await env.DB.batch([
      env.DB.prepare("INSERT OR IGNORE INTO vip_subscriptions(user_id,provider,product_id,receipt_hash,started_at,expires_at,auto_renewing,created_at) VALUES(?,?,?,?,?,?,?,datetime('now'))").bind(user.id,"cafebazaar",VIP_PRODUCT,tokenHash,new Date(startedAt).toISOString().slice(0,19).replace("T"," "),expiresAt,receipt.autoRenewing?1:0),
      env.DB.prepare("INSERT INTO vip_entitlements(user_id,expires_at) SELECT ?,? WHERE EXISTS(SELECT 1 FROM vip_subscriptions WHERE receipt_hash=? AND user_id=?) ON CONFLICT(user_id) DO UPDATE SET expires_at=MAX(vip_entitlements.expires_at,excluded.expires_at)").bind(user.id,expiresAt,tokenHash,user.id)
    ]);
    if(!writes[0].meta.changes&&!prior){
      const owner=await env.DB.prepare("SELECT user_id FROM vip_subscriptions WHERE provider='cafebazaar' AND receipt_hash=?").bind(tokenHash).first();
      if(!owner||owner.user_id!==user.id) return response({error:"BAZAAR_RECEIPT_ALREADY_USED"},409);
    }
    const vip=await env.DB.prepare("SELECT expires_at FROM vip_entitlements WHERE user_id=?").bind(user.id).first();
    return response({ok:true,vipActive:true,vipExpiresAt:vip?.expires_at||expiresAt,alreadyVerified:!!prior});
  }
  if(method==="POST"&&path==="/vip/daily-claim"){
    const writes=await env.DB.batch([
      env.DB.prepare("UPDATE vip_entitlements SET last_daily_claim_date=date('now') WHERE user_id=? AND expires_at>datetime('now') AND (last_daily_claim_date IS NULL OR last_daily_claim_date<date('now'))").bind(user.id),
      env.DB.prepare("INSERT INTO wallets(user_id,balance) SELECT ?,? WHERE changes()=1 ON CONFLICT(user_id) DO UPDATE SET balance=balance+excluded.balance").bind(user.id,VIP_DAILY_GRANT),
      env.DB.prepare("INSERT INTO wallet_ledger(user_id,delta,kind,reference) SELECT ?,?,'vip_daily',? WHERE changes()=1").bind(user.id,VIP_DAILY_GRANT,"vip-daily:"+user.id+":"+new Date().toISOString().slice(0,10))
    ]);
    if(!writes[0].meta.changes) return response({error:"VIP_DAILY_NOT_AVAILABLE"},403);
    const wallet=await env.DB.prepare("SELECT balance FROM wallets WHERE user_id=?").bind(user.id).first();
    return response({ok:true,tokenAmount:VIP_DAILY_GRANT,balance:wallet?.balance||0});
  }
  if(method==="GET"&&path==="/market/listings"){
    const rows=await env.DB.prepare("SELECT l.id,l.specimen_id,l.price,l.created_at,s.name,s.form,s.generation,s.fitness,s.planet_id,s.body_length_cm,s.rarity_score,u.display_name AS seller_name,CASE WHEN v.expires_at>datetime('now') THEN 1 ELSE 0 END AS seller_vip FROM listings l JOIN specimens s ON s.id=l.specimen_id JOIN users u ON u.id=l.seller_id LEFT JOIN vip_entitlements v ON v.user_id=l.seller_id WHERE l.status='active' AND s.market_eligible=1 AND l.seller_id<>? ORDER BY CASE WHEN v.expires_at>datetime('now') THEN 0 ELSE 1 END,l.created_at DESC LIMIT 100").bind(user.id).all();
    return response({listings:rows.results||[]});
  }
  if(method==="POST"&&path==="/market/list"){
    const b=await jsonBody(req),specimenId=String(b?.specimenId||""),price=Number(b?.price);
    if(!specimenId||!Number.isSafeInteger(price)||price<50) return response({error:"INVALID_LISTING"},400);
    const owned=await env.DB.prepare("SELECT id,market_eligible FROM specimens WHERE id=? AND owner_id=? AND status='owned'").bind(specimenId,user.id).first();
    if(!owned) return response({error:"SPECIMEN_NOT_OWNED"},404);
    if(Number(owned.market_eligible)!==1) return response({error:"SPECIMEN_NOT_MARKET_ELIGIBLE"},403);
    const id=crypto.randomUUID();
    const result=await env.DB.batch([
      env.DB.prepare("UPDATE specimens SET status='listed' WHERE id=? AND owner_id=? AND status='owned'").bind(specimenId,user.id),
      env.DB.prepare("INSERT INTO listings(id,specimen_id,seller_id,price,status,created_at) SELECT ?,?,?,?,'active',datetime('now') WHERE changes()=1").bind(id,specimenId,user.id,price)
    ]);
    if(!result[0].meta.changes||!result[1].meta.changes) return response({error:"LISTING_CONFLICT"},409);
    return response({ok:true,listingId:id},201);
  }
  if(method==="POST"&&path==="/market/cancel"){
    const b=await jsonBody(req),listingId=String(b?.listingId||"");
    const listing=await env.DB.prepare("SELECT specimen_id FROM listings WHERE id=? AND seller_id=? AND status='active'").bind(listingId,user.id).first();
    if(!listing) return response({error:"LISTING_UNAVAILABLE"},404);
    const results=await env.DB.batch([
      env.DB.prepare("UPDATE listings SET status='cancelled' WHERE id=? AND seller_id=? AND status='active'").bind(listingId,user.id),
      env.DB.prepare("UPDATE specimens SET status='owned' WHERE id=? AND owner_id=? AND status='listed' AND changes()=1").bind(listing.specimen_id,user.id)
    ]);
    if(results.some(r=>!r.meta.changes)) return response({error:"LISTING_CONFLICT"},409);
    return response({ok:true,listingId});
  }
  if(method==="POST"&&path==="/market/buy"){
    const b=await jsonBody(req),listingId=String(b?.listingId||"");
    const listing=await env.DB.prepare("SELECT l.id,l.specimen_id,l.seller_id,l.price FROM listings l JOIN specimens s ON s.id=l.specimen_id WHERE l.id=? AND l.status='active' AND l.price>=50 AND s.market_eligible=1").bind(listingId).first();
    if(!listing||listing.seller_id===user.id) return response({error:"LISTING_UNAVAILABLE"},404);
    if(!env.CREATOR_USER_ID) return response({error:"CREATOR_ACCOUNT_NOT_CONFIGURED"},503);
    const creator=await env.DB.prepare("SELECT id FROM users WHERE id=?").bind(String(env.CREATOR_USER_ID)).first();
    const creatorWallet=creator?await env.DB.prepare("SELECT user_id FROM wallets WHERE user_id=?").bind(creator.id).first():null;
    if(!creator||!creatorWallet) return response({error:"CREATOR_ACCOUNT_NOT_CONFIGURED"},503);
    const balance=await env.DB.prepare("SELECT balance FROM wallets WHERE user_id=?").bind(user.id).first();
    if((balance?.balance||0)<listing.price) return response({error:"INSUFFICIENT_TOKENS"},402);
    const fee=Math.round(listing.price*CREATOR_COMMISSION_RATE),sellerNet=listing.price-fee,tx=crypto.randomUUID();
    const results=await env.DB.batch([
      env.DB.prepare("UPDATE listings SET status='sold',buyer_id=?,sold_at=datetime('now') WHERE id=? AND status='active' AND price>=50 AND EXISTS(SELECT 1 FROM wallets WHERE user_id=? AND balance>=?) AND EXISTS(SELECT 1 FROM wallets WHERE user_id=?) AND EXISTS(SELECT 1 FROM wallets WHERE user_id=?) AND EXISTS(SELECT 1 FROM specimens WHERE id=? AND owner_id=? AND status='listed')").bind(user.id,listingId,user.id,listing.price,listing.seller_id,creator.id,listing.specimen_id,listing.seller_id),
      env.DB.prepare("UPDATE wallets SET balance=balance-? WHERE user_id=? AND balance>=? AND changes()=1").bind(listing.price,user.id,listing.price),
      env.DB.prepare("UPDATE wallets SET balance=balance+? WHERE user_id=? AND changes()=1").bind(sellerNet,listing.seller_id),
      env.DB.prepare("UPDATE wallets SET balance=balance+? WHERE user_id=? AND changes()=1").bind(fee,creator.id),
      env.DB.prepare("UPDATE specimens SET owner_id=?,status='owned' WHERE id=? AND owner_id=? AND status='listed' AND changes()=1").bind(user.id,listing.specimen_id,listing.seller_id),
      env.DB.prepare("INSERT INTO wallet_ledger(user_id,delta,kind,reference) SELECT ?,?,'market_buy',? WHERE changes()=1").bind(user.id,-listing.price,tx+":buyer"),
      env.DB.prepare("INSERT INTO wallet_ledger(user_id,delta,kind,reference) SELECT ?,?,'market_sale',? WHERE changes()=1").bind(listing.seller_id,sellerNet,tx+":seller"),
      env.DB.prepare("INSERT INTO wallet_ledger(user_id,delta,kind,reference) SELECT ?,?,'market_creator_fee',? WHERE changes()=1").bind(creator.id,fee,tx+":creator")
    ]);
    if(results.some(r=>!r.meta.changes)) return response({error:"PURCHASE_CONFLICT"},409);
    return response({ok:true,specimenId:listing.specimen_id,paid:listing.price,sellerReceived:sellerNet,creatorFee:fee,feePercent:5});
  }
  if(method==="POST"&&path==="/specimens/register"){
    const b=await jsonBody(req),clientKey=String(b?.clientKey||"").slice(0,180),planetId=String(b?.planetId||""),name=String(b?.name||"موجود دیجیتال").slice(0,100),form=String(b?.form||"").slice(0,80),dna=String(b?.dna||"").toUpperCase();
    const bodyLengthCm=clamp(Number(b?.bodyLengthCm)||0,0,6000),generation=clamp(Number(b?.generation)||0,0,1e9),special=b?.special===true,originWorldType=(planetId==="earth"||planetId==="system-01-p1")?"earth":"alien",rarityScore=clamp(Number(b?.rarityScore)||0,0,100);
    const marketEligible=special&&(originWorldType==="earth"?(generation>=18&&bodyLengthCm>=45):(generation>=1&&bodyLengthCm>5));
    if(!marketEligible) return response({error:"SPECIMEN_NOT_MARKET_ELIGIBLE"},400);
    if(!clientKey||!planetId||!/^[ACGT]{1,100000}$/.test(dna)||!Number.isFinite(Number(b?.bodyLengthCm))) return response({error:"INVALID_SPECIMEN"},400);
    if(originWorldType==="alien"){
      const world=planets().find(p=>p.id===planetId||p.galaxyId===planetId);
      if(!world)return response({error:"INVALID_SPECIMEN"},400);
      const ownedWorld=await env.DB.prepare("SELECT 1 AS owned FROM planet_ownership WHERE user_id=? AND galaxy_planet_id=?").bind(user.id,world.galaxyPlanetId).first();
      if(!ownedWorld)return response({error:"PLANET_NOT_OWNED"},403);
    }
    const existing=await env.DB.prepare("SELECT id FROM specimens WHERE owner_id=? AND client_key=?").bind(user.id,clientKey).first();
    if(existing) return response({ok:true,specimenId:existing.id,alreadyRegistered:true});
    const id=crypto.randomUUID();
    const registration=await env.DB.batch([
      env.DB.prepare("INSERT OR IGNORE INTO specimens(id,owner_id,client_key,planet_id,name,form,dna,generation,fitness,body_length_cm,is_special,origin_world_type,rarity_score,market_eligible,status,created_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,'owned',datetime('now'))")
        .bind(id,user.id,clientKey,planetId,name,form,dna,generation,clamp(Number(b.fitness)||0,0,1),bodyLengthCm,special?1:0,originWorldType,rarityScore,marketEligible?1:0),
      env.DB.prepare("INSERT INTO wallets(user_id,balance) SELECT ?,? WHERE changes()=1 ON CONFLICT(user_id) DO UPDATE SET balance=balance+excluded.balance").bind(user.id,GALLERY_ENTRY_GRANT),
      env.DB.prepare("INSERT INTO wallet_ledger(user_id,delta,kind,reference) SELECT ?,?,'gallery_entry_reward',? WHERE changes()=1").bind(user.id,GALLERY_ENTRY_GRANT,"gallery-entry:"+id)
    ]);
    const saved=await env.DB.prepare("SELECT id FROM specimens WHERE owner_id=? AND client_key=?").bind(user.id,clientKey).first();
    if(!saved) return response({error:"SPECIMEN_REGISTER_FAILED"},409);
    const rewardTokens=registration[0].meta.changes?GALLERY_ENTRY_GRANT:0;
    return response({ok:true,specimenId:saved.id,alreadyRegistered:!registration[0].meta.changes,rewardTokens},201);
  }
  if(method==="GET"&&path==="/collection"){
    const rows=await env.DB.prepare("SELECT s.id,s.client_key,s.planet_id,s.name,s.form,s.dna,s.generation,s.fitness,s.body_length_cm,s.is_special,s.origin_world_type,s.rarity_score,s.market_eligible,s.status,s.created_at,l.id AS listing_id FROM specimens s LEFT JOIN listings l ON l.specimen_id=s.id AND l.status='active' WHERE s.owner_id=? ORDER BY created_at DESC LIMIT 250").bind(user.id).all();
    return response({specimens:rows.results||[]});
  }
  return response({error:"NOT_FOUND"},404);
}
export default { async fetch(req,env) {
  const cors=corsFor(req,env);
  if(req.method==="OPTIONS") return new Response(null,{status:204,headers:cors});
  if(req.headers.has("Origin")&&!cors["access-control-allow-origin"]) return response({error:"ORIGIN_NOT_ALLOWED"},403,cors);
  try { return await route(req,env,new URL(req.url)).then(r=>{const h=new Headers(r.headers);for(const [k,v] of Object.entries(cors))if(v)h.set(k,v);return new Response(r.body,{status:r.status,headers:h});}); }
  catch(e) { return response({error:"INTERNAL_ERROR"},500,cors); }
}};
export { planets, TOKEN_PRODUCTS, VIP_PRODUCT, WELCOME_GRANT, STARTER_GRANT };
