/**
 * PLANET account, wallet, Bazaar billing and player marketplace API.
 * Deploy as a dedicated Worker with the D1 schema in schema.sql.
 * All balances and specimen ownership are server-authoritative.
 */
const JSON_HEADERS = { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" };
const TOKEN_PRODUCT = "planet_tokens_200";
const TOKEN_GRANT = 200;
const WELCOME_GRANT = 20;
const CATALOG = [
  ["آوید","سنگی",180],["رایا","اقیانوسی",320],["هیراد","یخی",260],["مانا","جنگلی",240],
  ["ویرا","آتشفشانی",520],["آترین","بیابانی",210],["دانا","سنگی",190],["آریو","اقیانوسی",390],
  ["نیوا","یخی",280],["هانا","جنگلی",300],["آرکا","غول گازی",850],["سایا","سنگی",220],
  ["مهرآسا","اقیانوسی",450],["تابان","آتشفشانی",720],["پگاه","یخی",340],["سپهر","غول گازی",1000],
  ["باران","جنگلی",360],["کیهان","بیابانی",250],["روشنا","سنگی",170],["نیلوفر","اقیانوسی",410]
];
const clamp = (n, a, b) => Math.max(a, Math.min(b, n));
function response(data, status=200, cors={}) {
  return new Response(JSON.stringify(data), { status, headers: { ...JSON_HEADERS, ...cors } });
}
function corsFor(req, env) {
  const origin = req.headers.get("Origin") || "";
  const allowed = String(env.ALLOWED_ORIGINS || "https://karafarin12800-del.github.io,https://appassets.androidplatform.net")
    .split(",").map(x=>x.trim()).filter(Boolean);
  const ok = allowed.includes("*") || allowed.includes(origin);
  return { "access-control-allow-origin": ok ? (allowed.includes("*") ? "*" : origin) : "",
    "access-control-allow-methods":"GET,POST,OPTIONS",
    "access-control-allow-headers":"Content-Type,Authorization",
    "vary":"Origin" };
}
async function sha256(value) {
  const bytes = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return [...new Uint8Array(bytes)].map(x=>x.toString(16).padStart(2,"0")).join("");
}
function b64url(bytes) {
  let s=""; for(const b of new Uint8Array(bytes)) s+=String.fromCharCode(b);
  return btoa(s).replace(/\+/g,"-").replace(/\//g,"_").replace(/=+$/,"");
}
async function passwordHash(password, salt) {
  const material = await crypto.subtle.importKey("raw",new TextEncoder().encode(password),"PBKDF2",false,["deriveBits"]);
  const bits = await crypto.subtle.deriveBits({name:"PBKDF2",salt:new TextEncoder().encode(salt),iterations:120000,hash:"SHA-256"},material,256);
  return b64url(bits);
}
async function signToken(user, env) {
  const head=b64url(new TextEncoder().encode(JSON.stringify({alg:"HS256",typ:"JWT"})));
  const body=b64url(new TextEncoder().encode(JSON.stringify({sub:user.id,email:user.email,exp:Math.floor(Date.now()/1000)+604800})));
  const input=head+"."+body;
  const key=await crypto.subtle.importKey("raw",new TextEncoder().encode(env.AUTH_SECRET),{name:"HMAC",hash:"SHA-256"},false,["sign"]);
  const sig=await crypto.subtle.sign("HMAC",key,new TextEncoder().encode(input));
  return input+"."+b64url(sig);
}
async function authenticate(req, env) {
  const token=(req.headers.get("Authorization")||"").replace(/^Bearer\s+/i,"");
  const parts=token.split(".");
  if(parts.length!==3||!env.AUTH_SECRET) return null;
  try {
    const key=await crypto.subtle.importKey("raw",new TextEncoder().encode(env.AUTH_SECRET),{name:"HMAC",hash:"SHA-256"},false,["verify"]);
    const sig=Uint8Array.from(atob(parts[2].replace(/-/g,"+").replace(/_/g,"/")+"===".slice((parts[2].length+3)%4)),c=>c.charCodeAt(0));
    if(!await crypto.subtle.verify("HMAC",key,sig,new TextEncoder().encode(parts[0]+"."+parts[1]))) return null;
    const payload=JSON.parse(new TextDecoder().decode(Uint8Array.from(atob(parts[1].replace(/-/g,"+").replace(/_/g,"/")+"===".slice((parts[1].length+3)%4)),c=>c.charCodeAt(0))));
    if(!payload.sub||payload.exp<Date.now()/1000) return null;
    return await env.DB.prepare("SELECT id,email,verified_at FROM users WHERE id=? AND verified_at IS NOT NULL").bind(payload.sub).first();
  } catch { return null; }
}
function planets() {
  const rows=[];
  for(let i=0;i<100;i++){
    const base=CATALOG[i%CATALOG.length], tier=Math.floor(i/CATALOG.length);
    const price=clamp(base[2]+tier*17+(i%7)*9,150,1000);
    rows.push({id:"planet-"+String(i+1).padStart(3,"0"),name:base[0]+(tier?(" "+(tier+1)):""),type:base[1],price,features:["زیست‌بوم مستقل","قابل کاوش","ذخیرهٔ پایدار"],catalogVersion:1});
  }
  return rows;
}
async function jsonBody(req) { try { return await req.json(); } catch { return null; } }
async function sendVerification(email, code, env) {
  if(!env.RESEND_API_KEY||!env.VERIFY_FROM_EMAIL) throw new Error("EMAIL_SERVICE_NOT_CONFIGURED");
  const r=await fetch("https://api.resend.com/emails",{method:"POST",headers:{"authorization":"Bearer "+env.RESEND_API_KEY,"content-type":"application/json"},
    body:JSON.stringify({from:env.VERIFY_FROM_EMAIL,to:[email],subject:"کد تأیید حساب Planet",text:"کد تأیید شما: "+code+"\\nاین کد ۱۵ دقیقه اعتبار دارد."})});
  if(!r.ok) throw new Error("EMAIL_DELIVERY_FAILED");
}
async function grantWelcome(db,userId) {
  const results=await db.batch([
    db.prepare("UPDATE users SET welcome_granted_at=datetime('now') WHERE id=? AND welcome_granted_at IS NULL AND verified_at IS NOT NULL").bind(userId),
    db.prepare("INSERT INTO wallets(user_id,balance) SELECT ?,? WHERE changes()=1").bind(userId,WELCOME_GRANT),
    db.prepare("INSERT INTO wallet_ledger(user_id,delta,kind,reference) SELECT ?,?,'welcome',? WHERE changes()=1").bind(userId,WELCOME_GRANT,"welcome:"+userId)
  ]);
  return !!results[0].meta.changes;
}
async function route(req, env, url) {
  if(!env.DB) return response({error:"DATABASE_NOT_CONFIGURED"},503);
  const path=url.pathname, method=req.method;
  if(method==="GET"&&path==="/health") return response({ok:true,service:"PLANET commerce API",database:true,bazaarConfigured:!!env.BAZAAR_ACCESS_TOKEN,emailConfigured:!!env.RESEND_API_KEY});
  if(method==="GET"&&path==="/catalog/planets") return response({version:1,count:100,planets:planets()});
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
    await grantWelcome(env.DB,user.id);
    const account={id:user.id,email};
    return response({ok:true,token:await signToken(account,env),welcomeTokens:WELCOME_GRANT});
  }
  if(method==="POST"&&path==="/auth/login"){
    const b=await jsonBody(req),email=String(b?.email||"").trim().toLowerCase(),password=String(b?.password||"");
    const user=await env.DB.prepare("SELECT id,email,password_salt,password_hash,verified_at FROM users WHERE email=?").bind(email).first();
    if(!user||!user.verified_at||await passwordHash(password,user.password_salt)!==user.password_hash) return response({error:"INVALID_CREDENTIALS_OR_UNVERIFIED"},401);
    return response({token:await signToken(user,env),email:user.email});
  }
  if(method==="POST"&&path==="/auth/google"){
    const b=await jsonBody(req),idToken=String(b?.idToken||"");
    if(!idToken||!env.GOOGLE_CLIENT_ID) return response({error:"GOOGLE_LOGIN_NOT_CONFIGURED"},503);
    const check=await fetch("https://oauth2.googleapis.com/tokeninfo?id_token="+encodeURIComponent(idToken));
    const claims=await check.json().catch(()=>({}));
    if(!check.ok||claims.aud!==env.GOOGLE_CLIENT_ID||claims.email_verified!=="true"||!claims.sub||!claims.email) return response({error:"INVALID_GOOGLE_TOKEN"},401);
    let user=await env.DB.prepare("SELECT id,email,verified_at FROM users WHERE google_sub=? OR email=?").bind(claims.sub,String(claims.email).toLowerCase()).first();
    if(!user){
      const id=crypto.randomUUID();
      await env.DB.prepare("INSERT INTO users(id,email,google_sub,verified_at,created_at) VALUES(?,?,?,datetime('now'),datetime('now'))").bind(id,String(claims.email).toLowerCase(),claims.sub).run();
      user={id,email:String(claims.email).toLowerCase(),verified_at:1};
    } else if(!user.verified_at) {
      await env.DB.prepare("UPDATE users SET google_sub=?,verified_at=datetime('now') WHERE id=?").bind(claims.sub,user.id).run();
      user.verified_at=1;
    }
    await grantWelcome(env.DB,user.id);
    return response({token:await signToken(user,env),email:user.email,welcomeTokens:WELCOME_GRANT});
  }
  const user=await authenticate(req,env);
  if(!user) return response({error:"UNAUTHORIZED"},401);
  if(method==="GET"&&path==="/wallet"){
    const w=await env.DB.prepare("SELECT balance FROM wallets WHERE user_id=?").bind(user.id).first();
    const ledger=await env.DB.prepare("SELECT delta,kind,reference,created_at FROM wallet_ledger WHERE user_id=? ORDER BY id DESC LIMIT 50").bind(user.id).all();
    return response({balance:w?.balance||0,ledger:ledger.results||[]});
  }
  if(method==="POST"&&path==="/billing/bazaar/verify"){
    const b=await jsonBody(req),purchaseToken=String(b?.purchaseToken||""),productId=String(b?.productId||"");
    if(!purchaseToken||productId!==TOKEN_PRODUCT) return response({error:"INVALID_PRODUCT_OR_TOKEN"},400);
    if(!env.BAZAAR_ACCESS_TOKEN||!env.BAZAAR_PACKAGE_NAME) return response({error:"BAZAAR_SERVER_VALIDATION_NOT_CONFIGURED"},503);
    const endpoint="https://api.cafebazaar.ir/api/v2/payments/"+encodeURIComponent(env.BAZAAR_PACKAGE_NAME)+"/tokens/"+encodeURIComponent(purchaseToken)+"/?access_token="+encodeURIComponent(env.BAZAAR_ACCESS_TOKEN);
    const check=await fetch(endpoint,{headers:{accept:"application/json"}});
    const receipt=await check.json().catch(()=>({}));
    if(!check.ok||Number(receipt.purchaseState)!==0||receipt.productId!==TOKEN_PRODUCT) return response({error:"BAZAAR_RECEIPT_INVALID"},402);
    const tokenHash=await sha256(purchaseToken);
    const grant=await env.DB.batch([
      env.DB.prepare("INSERT OR IGNORE INTO purchases(user_id,provider,product_id,receipt_hash,token_amount,created_at) VALUES(?,?,?,?,?,datetime('now'))").bind(user.id,"cafebazaar",TOKEN_PRODUCT,tokenHash,TOKEN_GRANT),
      env.DB.prepare("INSERT INTO wallets(user_id,balance) SELECT ?,? WHERE changes()=1 ON CONFLICT(user_id) DO UPDATE SET balance=balance+excluded.balance").bind(user.id,TOKEN_GRANT),
      env.DB.prepare("INSERT INTO wallet_ledger(user_id,delta,kind,reference) SELECT ?,?,'bazaar_purchase',? WHERE changes()=1").bind(user.id,TOKEN_GRANT,tokenHash)
    ]);
    if(!grant[0].meta.changes) return response({ok:true,alreadyCredited:true,tokenAmount:TOKEN_GRANT});
    return response({ok:true,tokenAmount:TOKEN_GRANT});
  }
  if(method==="GET"&&path==="/market/listings"){
    const rows=await env.DB.prepare("SELECT l.id,l.specimen_id,l.seller_id,l.price,l.created_at,s.name,s.form,s.generation,s.fitness,s.planet_id FROM listings l JOIN specimens s ON s.id=l.specimen_id WHERE l.status='active' ORDER BY l.created_at DESC LIMIT 100").all();
    return response({listings:(rows.results||[]).filter(x=>x.seller_id!==user.id)});
  }
  if(method==="POST"&&path==="/market/list"){
    const b=await jsonBody(req),specimenId=String(b?.specimenId||""),price=Number(b?.price);
    if(!specimenId||!Number.isSafeInteger(price)||price<1||price>1000000) return response({error:"INVALID_LISTING"},400);
    const owned=await env.DB.prepare("SELECT id FROM specimens WHERE id=? AND owner_id=? AND status='owned'").bind(specimenId,user.id).first();
    if(!owned) return response({error:"SPECIMEN_NOT_OWNED"},404);
    const id=crypto.randomUUID();
    const result=await env.DB.batch([
      env.DB.prepare("UPDATE specimens SET status='listed' WHERE id=? AND owner_id=? AND status='owned'").bind(specimenId,user.id),
      env.DB.prepare("INSERT INTO listings(id,specimen_id,seller_id,price,status,created_at) SELECT ?,?,?,?,'active',datetime('now') WHERE changes()=1").bind(id,specimenId,user.id,price)
    ]);
    if(!result[0].meta.changes||!result[1].meta.changes) return response({error:"LISTING_CONFLICT"},409);
    return response({ok:true,listingId:id},201);
  }
  if(method==="POST"&&path==="/market/buy"){
    const b=await jsonBody(req),listingId=String(b?.listingId||"");
    const listing=await env.DB.prepare("SELECT id,specimen_id,seller_id,price FROM listings WHERE id=? AND status='active'").bind(listingId).first();
    if(!listing||listing.seller_id===user.id) return response({error:"LISTING_UNAVAILABLE"},404);
    const balance=await env.DB.prepare("SELECT balance FROM wallets WHERE user_id=?").bind(user.id).first();
    if((balance?.balance||0)<listing.price) return response({error:"INSUFFICIENT_TOKENS"},402);
    const tx=crypto.randomUUID();
    const results=await env.DB.batch([
      env.DB.prepare("UPDATE listings SET status='sold',buyer_id=?,sold_at=datetime('now') WHERE id=? AND status='active' AND EXISTS(SELECT 1 FROM wallets WHERE user_id=? AND balance>=?) AND EXISTS(SELECT 1 FROM wallets WHERE user_id=?) AND EXISTS(SELECT 1 FROM specimens WHERE id=? AND owner_id=? AND status='listed')").bind(user.id,listingId,user.id,listing.price,listing.seller_id,listing.specimen_id,listing.seller_id),
      env.DB.prepare("UPDATE wallets SET balance=balance-? WHERE user_id=? AND balance>=? AND changes()=1").bind(listing.price,user.id,listing.price),
      env.DB.prepare("UPDATE wallets SET balance=balance+? WHERE user_id=? AND changes()=1").bind(listing.price,listing.seller_id),
      env.DB.prepare("UPDATE specimens SET owner_id=?,status='owned' WHERE id=? AND owner_id=? AND status='listed' AND changes()=1").bind(user.id,listing.specimen_id,listing.seller_id),
      env.DB.prepare("INSERT INTO wallet_ledger(user_id,delta,kind,reference) SELECT ?,?,'market_buy',? WHERE changes()=1").bind(user.id,-listing.price,tx),
      env.DB.prepare("INSERT INTO wallet_ledger(user_id,delta,kind,reference) SELECT ?,?,'market_sale',? WHERE changes()=1").bind(listing.seller_id,listing.price,tx)
    ]);
    if(results.some(r=>!r.meta.changes)) return response({error:"PURCHASE_CONFLICT"},409);
    return response({ok:true,specimenId:listing.specimen_id,paid:listing.price,fee:0});
  }
  if(method==="POST"&&path==="/specimens/register"){
    const b=await jsonBody(req),id=String(b?.id||""),planetId=String(b?.planetId||""),name=String(b?.name||"موجود دیجیتال").slice(0,100),form=String(b?.form||"").slice(0,80),dna=String(b?.dna||"").toUpperCase();
    if(!id||!planetId||!/^[ACGT]{1,100000}$/.test(dna)) return response({error:"INVALID_SPECIMEN"},400);
    await env.DB.prepare("INSERT INTO specimens(id,owner_id,planet_id,name,form,dna,generation,fitness,status,created_at) VALUES(?,?,?,?,?,?,?,?, 'owned',datetime('now'))")
      .bind(id,user.id,planetId,name,form,await sha256(dna),clamp(Number(b.generation)||0,0,1e9),clamp(Number(b.fitness)||0,0,1)).run();
    return response({ok:true,specimenId:id},201);
  }
  if(method==="GET"&&path==="/collection"){
    const rows=await env.DB.prepare("SELECT id,planet_id,name,form,generation,fitness,status,created_at FROM specimens WHERE owner_id=? ORDER BY created_at DESC LIMIT 250").bind(user.id).all();
    return response({specimens:rows.results||[]});
  }
  return response({error:"NOT_FOUND"},404);
}
export default { async fetch(req,env) {
  const cors=corsFor(req,env);
  if(req.method==="OPTIONS") return new Response(null,{status:204,headers:cors});
  if(!cors["access-control-allow-origin"]) return response({error:"ORIGIN_NOT_ALLOWED"},403,cors);
  try { return await route(req,env,new URL(req.url)).then(r=>{const h=new Headers(r.headers);for(const [k,v] of Object.entries(cors))if(v)h.set(k,v);return new Response(r.body,{status:r.status,headers:h});}); }
  catch(e) { return response({error:"INTERNAL_ERROR"},500,cors); }
}};
export { planets, TOKEN_PRODUCT, TOKEN_GRANT, WELCOME_GRANT };
