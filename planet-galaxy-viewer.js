/* PLANET Galaxy Explorer
 * Interactive WebGL galaxy/system navigator connected to per-planet digital biospheres.
 * Planet surfaces remain illustrative; environmental catalog values drive the isolated simulation.
 */
(function(root,factory){
  const api=factory();
  if(typeof module!=="undefined"&&module.exports) module.exports=api;
  if(root&&root.document){
    const start=function(){api.install(root);};
    if(root.document.readyState==="loading") root.document.addEventListener("DOMContentLoaded",start,{once:true});
    else start();
  }
})(typeof globalThis!=="undefined"?globalThis:this,function(){
  "use strict";
  const SAVE_KEY="planet-galaxy-save-v1";
  const COLORS={
    terrestrial:[0.18,0.55,0.78],
    ocean:[0.12,0.48,0.88],
    ice:[0.68,0.86,0.98],
    desert:[0.83,0.57,0.28],
    volcanic:[0.9,0.27,0.13],
    "gas-giant":[0.72,0.53,0.37]
  };
  const SYSTEM_COLORS=["#8fc8ff","#ffd28a","#ff9a83","#d7b8ff","#fff0bd"];
  const clamp=(v,min,max)=>Math.max(min,Math.min(max,v));
  const hash32=function(value){let h=2166136261;const s=String(value);for(let i=0;i<s.length;i++){h^=s.charCodeAt(i);h=Math.imul(h,16777619);}return h>>>0;};
  function colorForType(type){return (COLORS[type]||[0.48,0.62,0.78]).slice();}
  const SURFACE_PALETTES={
    terrestrial:{land:[0.16,0.48,0.25],accent:[0.68,0.55,0.34],water:[0.08,0.34,0.68],pattern:1},
    ocean:{land:[0.08,0.30,0.48],accent:[0.35,0.72,0.76],water:[0.04,0.28,0.72],pattern:2},
    ice:{land:[0.68,0.82,0.91],accent:[0.94,0.98,1],water:[0.18,0.42,0.62],pattern:3},
    desert:{land:[0.68,0.39,0.17],accent:[0.91,0.68,0.39],water:[0.10,0.28,0.44],pattern:4},
    volcanic:{land:[0.22,0.12,0.12],accent:[0.96,0.24,0.06],water:[0.12,0.18,0.24],pattern:5},
    "gas-giant":{land:[0.62,0.39,0.24],accent:[0.92,0.72,0.49],water:[0.42,0.27,0.19],pattern:6}
  };
  function planetSurfaceProfile(planet){
    const palette=SURFACE_PALETTES[planet&&planet.type]||SURFACE_PALETTES.terrestrial;
    return {land:palette.land.slice(),accent:palette.accent.slice(),water:palette.water.slice(),
      waterCoverage:clamp(Number(planet&&planet.waterCoverage)||0,0,1),pattern:palette.pattern,
      atmosphere:!!(planet&&planet.atmosphere&&planet.atmosphere!=="trace-atmosphere"),
      gasGiant:!!(planet&&planet.type==="gas-giant")};
  }
  function hexColor(hex){
    const m=/^#?([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(String(hex||""));
    return m?[parseInt(m[1],16)/255,parseInt(m[2],16)/255,parseInt(m[3],16)/255]:[0.55,0.75,1];
  }
  function layoutGalaxy(galaxy){
    const systems=galaxy&&Array.isArray(galaxy.systems)?galaxy.systems:[];
    return systems.map(function(system,index){
      if(index===0)return {id:system.id,x:0,y:0,z:0,scale:1};
      const angle=(index-1)*2.399963229728653+0.62;
      const radius=8.4+index*1.35;
      return {id:system.id,x:Math.cos(angle)*radius,y:Math.sin(angle*1.7)*1.15,z:Math.sin(angle)*radius,scale:1};
    });
  }
  function layoutPlanets(system,time){
    const planets=system&&Array.isArray(system.planets)?system.planets:[];
    return planets.map(function(planet,index){
      const orbit=2.15+index*1.02;
      const angle=(Number(time)||0)*0.00012+index*2.17+hash32(planet.id)%1000/1000;
      return {id:planet.id,x:Math.cos(angle)*orbit,y:Math.sin(angle*0.73)*0.34,z:Math.sin(angle)*orbit,orbit:orbit};
    });
  }
  function install(win){
    if(win.__planetGalaxyViewerReady)return;
    const Engine=win.PlanetGalaxyEngine;
    if(!Engine||!win.document)return;
    win.__planetGalaxyViewerReady=true;
    const doc=win.document;
    const $=function(id){return doc.getElementById(id);};
    const escapeHtml=function(value){return String(value==null?"":value).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/\x27/g,"&#39;");};
    let galaxy;
    try{
      const saved=win.localStorage.getItem(SAVE_KEY);
      galaxy=saved?Engine.restore(saved):Engine.createGalaxy(0x504c414e);
    }catch(error){
      galaxy=Engine.createGalaxy(0x504c414e);
    }
    function persist(){
      try{win.localStorage.setItem(SAVE_KEY,Engine.serialize(galaxy));}
      catch(error){showNotice("ذخیرهٔ محلی در دسترس نیست: "+String(error.message||error));}
    }
    const style=doc.createElement("style");
    style.textContent=[
      ".pg-launch{border:1px solid #5bb8d9!important;background:linear-gradient(135deg,#123e59,#172b4d)!important;color:#e9faff!important}",
      ".pg-overlay{position:fixed;z-index:100700;inset:0;display:none;background:radial-gradient(ellipse at 50% 35%,#102b4a 0,#071326 53%,#020711 100%);color:#e9f4ff;font-family:Tahoma,system-ui,sans-serif}",
      ".pg-overlay.open{display:block}.pg-shell{height:100%;display:flex;flex-direction:column;min-height:0}",
      ".pg-head{position:relative;z-index:2;display:flex;align-items:center;justify-content:space-between;gap:12px;padding:16px 20px;border-bottom:1px solid #8bb5dc22;background:#061326a8;backdrop-filter:blur(16px)}",
      ".pg-brand small{display:block;color:#7bd8f3;font:10px system-ui,sans-serif;letter-spacing:2px;direction:ltr}.pg-brand h2{font-size:18px;margin:5px 0 2px}.pg-brand p{font-size:10px;color:#9db2ce;margin:0;line-height:1.7}",
      ".pg-head-actions{display:flex;gap:8px;align-items:center}.pg-btn{border:1px solid #52769866;background:#102640;color:#e7f6ff;border-radius:10px;padding:9px 12px;font:11px Tahoma,system-ui;white-space:nowrap}.pg-btn.primary{border-color:#53c4d5;background:linear-gradient(135deg,#14516a,#174263);color:#effcff}.pg-btn:disabled{opacity:.5;cursor:default}",
      ".pg-main{display:grid;grid-template-columns:minmax(0,1fr) 330px;gap:14px;padding:14px;min-height:0;flex:1}",
      ".pg-stage{position:relative;min-height:260px;overflow:hidden;border:1px solid #88b7e533;border-radius:18px;background:radial-gradient(ellipse at 50% 50%,#0e2a49 0,#07152b 52%,#030914 100%);box-shadow:inset 0 0 80px #0007}",
      ".pg-canvas{position:absolute;inset:0;width:100%;height:100%;display:block;touch-action:none;outline:none}",
      ".pg-stage-label{position:absolute;left:18px;top:16px;pointer-events:none;direction:ltr;text-align:left;max-width:min(360px,70%)}.pg-stage-label small{color:#73d4ef;font:10px system-ui,sans-serif;letter-spacing:1.8px}.pg-stage-label strong{display:block;font:300 clamp(24px,3vw,38px)/1.2 system-ui,sans-serif;color:#e8f5ff;margin-top:5px}.pg-stage-label span{display:block;color:#94abc7;font-size:10px;line-height:1.8;direction:rtl;text-align:left;margin-top:5px}",
      ".pg-canvas-note{position:absolute;left:16px;bottom:15px;color:#8fa9c8;background:#061326b8;border:1px solid #7195bd2e;border-radius:9px;padding:7px 10px;font-size:9px;pointer-events:none;max-width:75%}",
      ".pg-zoom{position:absolute;right:14px;bottom:14px;display:flex;gap:6px}.pg-zoom .pg-btn{width:36px;height:36px;padding:0;font-size:17px}",
      ".pg-side{min-height:0;overflow:auto;border:1px solid #88b7e533;border-radius:18px;background:linear-gradient(160deg,#0d2139ed,#061326ef);padding:14px;scrollbar-width:thin;scrollbar-color:#284b70 transparent}",
      ".pg-side-head{display:flex;align-items:center;justify-content:space-between;gap:8px;border-bottom:1px solid #7ea3c52a;padding-bottom:10px}.pg-side-head h3{margin:0;font-size:13px}.pg-kicker{font:9px system-ui,sans-serif;color:#78cae8;letter-spacing:1.2px;direction:ltr}",
      ".pg-stats{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:6px;margin:10px 0}.pg-stat{background:#112943;border:1px solid #79a8d125;border-radius:10px;padding:8px;text-align:center}.pg-stat b{display:block;color:#b8efff;font:600 17px system-ui,sans-serif}.pg-stat span{display:block;font-size:9px;color:#91a9c5;margin-top:3px}",
      ".pg-section-title{display:flex;justify-content:space-between;align-items:center;color:#afc6df;font-size:10px;margin:14px 0 8px}.pg-list{display:grid;gap:7px}.pg-item{border:1px solid #7ea5cb2d;background:#0c2037;border-radius:11px;padding:9px;min-width:0}.pg-item.active{border-color:#6bcde1a8;background:#123149}.pg-item-top{display:flex;align-items:center;justify-content:space-between;gap:8px}.pg-item strong{font-size:11px;overflow-wrap:anywhere}.pg-item small{display:block;color:#91a9c4;font-size:9px;line-height:1.7;margin-top:4px}.pg-tag{font-size:8px;color:#a8efff;background:#163d52;border-radius:99px;padding:4px 7px;white-space:nowrap}.pg-item-actions{display:flex;gap:6px;margin-top:7px}.pg-item-actions .pg-btn{padding:7px 9px;font-size:9px;flex:1}",
      ".pg-empty{border:1px dashed #6284a94f;border-radius:10px;padding:11px;color:#8ea6c2;font-size:10px;line-height:1.8}",
      ".pg-detail{margin-top:12px;border:1px solid #6d9abe2c;border-radius:12px;background:#08192b;padding:11px}.pg-detail h4{margin:0 0 8px;font-size:11px;color:#d6f3ff}.pg-detail-grid{display:grid;grid-template-columns:1fr 1fr;gap:6px}.pg-detail-grid div{background:#10253a;border-radius:8px;padding:7px;min-width:0}.pg-detail-grid span{display:block;color:#8da8c5;font-size:8px}.pg-detail-grid b{display:block;color:#d7ecff;font:11px system-ui,sans-serif;margin-top:4px;overflow-wrap:anywhere}.pg-notice{margin-top:10px;padding:9px;border-radius:9px;background:#102c3d;border:1px solid #63bfd52b;color:#a9dbe9;font-size:9px;line-height:1.8}",
      ".pg-foot{padding:8px 16px 10px;text-align:center;color:#7188a8;font-size:9px;line-height:1.7;border-top:1px solid #789dc321}",
      "@media(max-width:760px){.pg-head{padding:11px 12px}.pg-brand h2{font-size:15px}.pg-brand p{max-width:210px;font-size:9px}.pg-head-actions{gap:5px}.pg-btn{padding:8px 9px;font-size:10px}.pg-main{display:flex;flex-direction:column;padding:8px;gap:8px}.pg-stage{flex:0 0 47%;min-height:190px}.pg-side{flex:1;min-height:0;padding:10px}.pg-stage-label{left:11px;top:10px}.pg-stage-label strong{font-size:27px}.pg-foot{font-size:8px;padding:6px 8px}.pg-stats{margin:7px 0}.pg-section-title{margin:9px 0 6px}.pg-item{padding:7px}.pg-detail{margin-top:8px}.pg-canvas-note{left:8px;bottom:8px;max-width:68%;font-size:8px}.pg-zoom{right:8px;bottom:8px}}",
      "@media(max-width:390px){.pg-brand p{display:none}.pg-head-actions .pg-back-label{display:none}.pg-stage{flex-basis:43%}.pg-item-actions{flex-direction:column}.pg-item-actions .pg-btn{width:100%}}"
    ].join("");
    doc.head.appendChild(style);
    const launch=doc.createElement("button");
    launch.type="button";launch.id="planet-galaxy-launch";launch.className="icon-btn pg-launch";launch.textContent="🧬 بازی ژنوم";launch.setAttribute("aria-label","ورود به بازی ژنوم");launch.setAttribute("aria-haspopup","dialog");
    const topActions=doc.querySelector(".top-actions");
    if(topActions)topActions.insertBefore(launch,doc.getElementById("helpBtn")||null);
    else{launch.style.position="fixed";launch.style.zIndex="900";launch.style.top="12px";launch.style.right="12px";doc.body.appendChild(launch);}
    const overlay=doc.createElement("section");
    overlay.id="planet-galaxy-overlay";overlay.className="pg-overlay";overlay.setAttribute("role","dialog");overlay.setAttribute("aria-modal","true");overlay.setAttribute("aria-label","بازی ژنوم و جهان‌های زنده");
    overlay.innerHTML=
      '<div class="pg-shell">'+
        '<header class="pg-head"><div class="pg-brand"><small>PLANET / GENOME GAME</small><h2>بازی ژنوم</h2><p>سیاره‌ات را انتخاب کن، ژنوم‌ها را پرورش بده و موجودات منحصربه‌فرد بساز.</p></div><div class="pg-head-actions"><strong class="pg-wallet" id="pgWalletBadge">کیف پول · -- توکن</strong><button class="pg-btn" id="pgWalletBtn" type="button">کیف پول</button><button class="pg-btn" id="pgAlbumBtn" type="button">آلبوم</button><button class="pg-btn" id="pgMarketBtn" type="button">بازار</button><button class="pg-btn pg-back-label" id="pgBack" type="button">← بازگشت</button><button class="pg-btn" id="pgClose" type="button">✕ بستن</button></div></header>'+
        '<main class="pg-main"><section class="pg-stage"><canvas id="pgCanvas" class="pg-canvas" aria-label="مدل سه بعدی منظومه ها و سیارات"></canvas><div class="pg-stage-label"><small id="pgSceneKicker">GALAXY VIEW / 01</small><strong id="pgSceneTitle">THE GALAXY</strong><span id="pgSceneDesc">سه منظومهٔ آغازین در نقشهٔ اکتشافی</span></div><div id="pgCanvasNote" class="pg-canvas-note">نمای سه‌بعدی؛ کشیدن برای چرخش · چرخ یا دو انگشت برای زوم</div><div class="pg-zoom"><button class="pg-btn" id="pgZoomIn" type="button" aria-label="بزرگ‌نمایی">+</button><button class="pg-btn" id="pgZoomOut" type="button" aria-label="کوچک‌نمایی">−</button></div></section>'+
        '<aside class="pg-side"><div class="pg-side-head"><h3 id="pgSideTitle">فهرست منظومه‌ها</h3><span class="pg-kicker">NAVIGATION</span></div><div class="pg-stats" id="pgStats"></div><div class="pg-section-title"><span id="pgListLabel">منظومه‌های ثبت‌شده در نقشه</span><span class="pg-kicker" id="pgCountLabel">SYSTEMS</span></div><div class="pg-list" id="pgList"></div><div class="pg-detail" id="pgDetail"></div><div class="pg-notice" id="pgNotice">این صفحه از موتور داده‌ای کهکشان استفاده می‌کند. کشف و انتخاب ذخیره می‌شوند؛ زمین‌نما و شبیه‌سازی مستقل هر سیاره در این مرحله ساخته نمی‌شود.</div></aside></main>'+
        '<footer class="pg-foot">سیاره‌های خریداری‌شده به حساب تو تعلق دارند و قابل فروش یا انتقال نیستند. هر زیست‌کره ژنوم و مسیر تکامل اختصاصی خود را دارد.</footer>'+
      '</div>';
    doc.body.appendChild(overlay);
    const intro=doc.createElement("section");intro.id="pgGenomeIntro";intro.className="pg-intro";intro.setAttribute("role","dialog");intro.setAttribute("aria-modal","true");
    intro.innerHTML='<div class="pg-intro-card"><div class="pg-intro-emblem">🧬</div><small>PLANET · GENOME GAME</small><h2>به بازی ژنوم خوش آمدی</h2><p>اینجا می‌توانی موجودات تازه بسازی، آن‌ها را در کلکسیون شخصی‌ات نگه داری و حتی در بازار با بازیکنان دیگر خریدوفروش کنی.</p><p>پس با دقت سیاره‌ات را انتخاب کن؛ ژنوم‌های به‌دست‌آمده از زمین مادر را به جهان تازه ببر، ژنتیک آن‌ها را ترکیب کن و مسیر پیدایش موجودات منحصربه‌فرد خودت را بساز.</p><p>هر بازیکن و هر سیاره، بذر ژنتیکی و مسیر تکامل مخصوص خود را دارد؛ نتیجه از پیش قابل پیش‌بینی نیست.</p><button class="pg-btn primary" id="pgGenomeIntroContinue" type="button">ورود به بازی ژنوم</button><small>برای ذخیرهٔ سیاره و دارایی‌ها، ورود یا ثبت‌نام لازم است.</small></div></section>';
    doc.body.appendChild(intro);
    const genomeIntroStyle=doc.createElement("style");genomeIntroStyle.textContent=".pg-intro{position:fixed;inset:0;z-index:100800;display:none;align-items:center;justify-content:center;padding:16px;background:radial-gradient(ellipse at 50% 25%,#153d5b,#040b18 70%);color:#eaf7ff;font-family:Tahoma,system-ui}.pg-intro.open{display:flex}.pg-intro-card{width:min(560px,100%);border:1px solid #55c6dc66;border-radius:22px;background:linear-gradient(155deg,#102b45f5,#071321f8);padding:24px;box-shadow:0 20px 70px #000b;text-align:center}.pg-intro-emblem{font-size:48px}.pg-intro-card small{color:#82dff0}.pg-intro-card h2{font-size:23px}.pg-intro-card p{font-size:13px;line-height:2.1;color:#c4d7e9;text-align:right}.pg-intro-card button{width:100%;margin:12px 0}.pg-wallet{color:#a8f0e0;font-size:11px;border:1px solid #4fc4ae66;padding:8px;border-radius:10px;white-space:nowrap}.pg-genome-panel{border:1px solid #53b9c977;border-radius:14px;background:linear-gradient(155deg,#0d2b3d,#081a2d);padding:12px;margin-top:12px}.pg-genome-panel h4{margin:12px 0 8px;color:#d7f8ff;font-size:11px}.pg-genome-note{color:#a4bfd3;font-size:10px;line-height:1.8}.pg-genome-list{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:6px}.pg-genome-chip{background:#102a42;border:1px solid #51758d66;border-radius:9px;padding:8px;color:#d9edff;text-align:right}.pg-genome-chip.chosen{border-color:#63ddc7;background:#15483f}.pg-genome-chip b,.pg-genome-chip small{display:block}.pg-genome-chip small{font:9px monospace;direction:ltr;margin-top:5px}.pg-genome-controls{display:flex;flex-wrap:wrap;gap:7px;align-items:center;margin:10px 0}.pg-genome-controls select{flex:1;min-width:100px;background:#071321;color:#eff8ff;border:1px solid #35516d;border-radius:8px;padding:8px;font:10px Tahoma}.pg-genome-controls label{font-size:10px}.pg-genome-controls input{width:90px}.pg-genome-progress{height:7px;background:#20384d;border-radius:9px;overflow:hidden}.pg-genome-progress i{display:block;height:100%;width:0;background:#56d3bd}.pg-creature-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(130px,1fr));gap:7px}.pg-creature-card{background:#0c2035;border:1px solid #42637c66;border-radius:10px;padding:7px}.pg-creature-card canvas{display:block;width:100%;height:72px;background:#0a1828;border-radius:7px}.pg-creature-card b,.pg-creature-card small{display:block;margin:5px 0;font-size:10px}.pg-creature-card small{color:#a9c1d7}.pg-creature-card button{width:100%;white-space:normal}.pg-album-list{display:grid;gap:5px}.pg-album-item{padding:7px;border-radius:8px;background:#10243a;color:#bad3e7;font-size:10px}@media(max-width:650px){.pg-head-actions{flex-wrap:wrap;justify-content:flex-end}.pg-wallet{font-size:9px}.pg-intro-card{padding:18px}}";doc.head.appendChild(genomeIntroStyle);
    $("pgGenomeIntroContinue").addEventListener("click",continueIntoGenomeGame);
    $("pgWalletBtn").addEventListener("click",()=>openAccountSection("commerceWalletSection"));
    $("pgAlbumBtn").addEventListener("click",()=>openAccountSection("commerceGallerySection"));
    $("pgMarketBtn").addEventListener("click",()=>openAccountSection("commerceMarketSection"));
    const canvas=$("pgCanvas"),ctxNote=$("pgCanvasNote");
    let mode="galaxy",selectedSystemId=galaxy.activeSystemId,selectedPlanetId=galaxy.activePlanetId,open=false,raf=0,renderer=null,lastNotice="";
    let ownedCommerceIds=new Set();
    let camera={yaw:-0.65,pitch:0.58,distance:25,target:[0,0,0]};
    let pointerState=null,lastFrame=0;
    const activeSystem=function(){return galaxy.systems.find(s=>s.id===selectedSystemId)||galaxy.systems[0];};
    function showNotice(message){lastNotice=String(message||"");const node=$("pgNotice");if(node)node.textContent=lastNotice;}
    function findPlanet(planetId){
      for(const system of galaxy.systems){const planet=system.planets.find(p=>p.id===planetId);if(planet)return {system:system,planet:planet};}
      return null;
    }
    function planetTitle(planet,index){return planet.discovered?planet.name:("سیارهٔ ناشناختهٔ "+(index+1));}
    function systemTitle(system,index){return system.discovered?system.name:("منظومهٔ ناشناختهٔ "+(index+1));}
    let genomeTicker=0,playerProfile=null,playerTokenBalance=null;
    const genomeSessions=new Map(),genomePanelLoads=new Set();
    function updateWalletBadge(value){
      if(Number.isFinite(Number(value)))playerTokenBalance=Number(value);
      const el=$("pgWalletBadge");if(el)el.textContent="کیف پول · "+(playerTokenBalance==null?"--":playerTokenBalance.toLocaleString("fa-IR"))+" توکن";
    }
    async function refreshAccountSnapshot(){
      const c=win.PlanetCommerceClient;if(!c||!c.hasSession())return;
      const r=await Promise.all([c.wallet(),c.ownedPlanets(),c.profile(),c.planets()]);
      playerTokenBalance=Number(r[0].balance||0);playerProfile=r[2]||null;
      ownedCommerceIds=new Set((r[1].planets||[]).map(x=>x.galaxyPlanetId).filter(Boolean));
      const catalog=Array.isArray(r[3].planets)?r[3].planets:[];
      const byId=new Map(catalog.map(x=>[x.galaxyPlanetId,x]));
      for(const system of (galaxy.systems||[]))for(const planet of (system.planets||[])){
        const server=byId.get(planet.commercePlanetId);
        if(server){planet.priceTokens=Number(server.price);planet.serverCatalogName=server.name;}
      }
      updateWalletBadge(playerTokenBalance);if(open)renderUI();
    }
    function openAccountSection(id){
      if(win.PlanetCommerceUI&&win.PlanetCommerceUI.openSection)win.PlanetCommerceUI.openSection(id);
      else $("openCollectionShop")?.click();
    }
    function gameSessionKey(p){return String(playerProfile&&playerProfile.id||"local")+":"+String(p.commercePlanetId||p.id);}
    function localDayKey(){const parts=new Intl.DateTimeFormat("en-CA",{year:"numeric",month:"2-digit",day:"2-digit"}).formatToParts(new Date());const part=type=>parts.find(x=>x.type===type).value;return part("year")+"-"+part("month")+"-"+part("day");}
    function saveGenomeSession(s){
      try{win.localStorage.setItem("planet-genome-game:v1:"+s.storageKey,JSON.stringify({state:s.state?win.PlanetGenomeGame.save(s.state):null,seed:s.seed,daily:s.daily,dailyDay:s.dailyDay,
        selected:Array.from(s.selected),started:s.started,completed:s.completed,elapsedSeconds:s.elapsedSeconds,simulatedYears:s.simulatedYears,
        speed:s.speed,lastWall:Date.now(),specimens:s.specimens||[]}));}catch(e){}
    }
    async function ensureGenomeSession(p){
      const c=win.PlanetCommerceClient,g=win.PlanetGenomeGame;
      if(!c||!c.hasSession()||!g)throw new Error("برای ساخت زیست‌کره ابتدا وارد حساب شو.");
      playerProfile=playerProfile||await c.profile();
      const key=gameSessionKey(p);if(genomeSessions.has(key))return genomeSessions.get(key);
      const [seedInfo,collection]=await Promise.all([c.worldSeed("planet-"+String(p.commercePlanetId).slice(-3)),c.collection()]);
      let earth=[];try{
        const home=win.PlanetWorldState&&win.PlanetWorldState.getHomeWorldId(win.localStorage,win.PlanetGalaxyEngine);
        if(home)earth=win.PlanetWorldState.getGenomePool(win.localStorage,home)||[];
      }catch(e){}
      const dailyDay=localDayKey(),daily=g.createDailyPool(seedInfo.seed,dailyDay,earth);
      const storageKey=key;let saved=null;try{saved=JSON.parse(win.localStorage.getItem("planet-genome-game:v1:"+storageKey)||"null");}catch(e){}
      const previousSelection=saved&&saved.dailyDay===dailyDay?Array.from(saved.selected||[]).filter(id=>daily.some(x=>x.id===id)):[];
      const s={planet:p,seed:seedInfo.seed,daily,dailyDay,storageKey,accountId:String(playerProfile.id||"local"),
        selected:new Set(previousSelection.length>=2?previousSelection:daily.slice(0,2).map(x=>x.id)),state:saved&&saved.state?g.restore(saved.state):null,
        started:!!(saved&&saved.started),completed:!!(saved&&saved.completed),elapsedSeconds:Number(saved&&saved.elapsedSeconds)||0,
        simulatedYears:Number(saved&&saved.simulatedYears)||0,speed:Math.max(1,Math.min(8,Number(saved&&saved.speed)||1)),
        lastWall:Date.now(),specimens:collection.specimens||[]};
      if(s.started&&!s.completed&&saved&&saved.lastWall){
        s.elapsedSeconds=Math.min(180,s.elapsedSeconds+Math.max(0,(Date.now()-Number(saved.lastWall))/1000));
        const target=Math.floor(s.elapsedSeconds*s.speed*4);
        if(s.state&&target>s.simulatedYears){g.advance(s.state,target-s.simulatedYears);s.simulatedYears=target;}
        if(s.elapsedSeconds>=180)s.completed=true;
      }
      genomeSessions.set(key,s);saveGenomeSession(s);return s;
    }
    function renderGenomePanel(s){
      const daily=$("pgGenomeDaily"),status=$("pgGenomeStatus"),progress=$("pgGenomeProgress"),stats=$("pgGenomeStats"),grid=$("pgGenomeSpecies");
      if(!daily||!status)return;
      daily.innerHTML=s.daily.map((x,i)=>'<button class="pg-genome-chip '+(s.selected.has(x.id)?"chosen":"")+'" data-pg-action="select-genome" data-pg-id="'+escapeHtml(x.id)+'" type="button"><b>ژنوم زمین · '+(i+1)+'</b><small>'+escapeHtml(x.dna.slice(0,21))+'…</small></button>').join("");
      $("pgPlantGenomes").disabled=s.selected.size<2||s.selected.size>3||s.started;
      $("pgGenomeSpeed").value=String(s.speed);$("pgGenomeSpeedLabel").textContent="×"+s.speed;
      if(!s.started){status.textContent="دو یا سه ژنوم از زمین مادر را انتخاب کن و برای آغاز وارد سیاره کن.";progress.style.width="0%";stats.textContent="آمادهٔ آغاز";}
      else{
        progress.style.width=Math.min(100,s.elapsedSeconds/180*100)+"%";
        status.textContent=s.completed?"تکامل کامل شد؛ موجودات تازه آماده‌اند.":"در حال تکامل · "+Math.ceil(180-s.elapsedSeconds).toLocaleString("fa-IR")+" ثانیه باقی‌مانده";
        stats.textContent=s.simulatedYears.toLocaleString("fa-IR")+" سال مدل · "+(s.state?s.state.species.length:0).toLocaleString("fa-IR")+" گونه";
      }
      if(grid){
        grid.innerHTML="";
        (s.state&&s.state.species||[]).filter(x=>!x.extinct).slice(-24).forEach(x=>{
          const card=doc.createElement("article");card.className="pg-creature-card";
          const canvas=doc.createElement("canvas");canvas.width=260;canvas.height=140;
          const ctx=canvas.getContext("2d");if(ctx&&win.PlanetEvolutionModel)win.PlanetEvolutionModel.drawOrganism(ctx,x,{traits:x.traits,angle:0},130,72,23,1,1);
          const name=doc.createElement("b");name.textContent=x.name||"گونهٔ دیجیتال";
          const meta=doc.createElement("small");meta.textContent=Number(x.bodyLengthCm||0).toLocaleString("fa-IR")+" سانتی‌متر · "+win.PlanetGenomeGame.sizeLabel(Number(x.bodyLengthCm)||3)+" · نسل "+Number(x.generation||0).toLocaleString("fa-IR");
          const button=doc.createElement("button");button.className="pg-btn";button.type="button";
          button.textContent=(s.specimens||[]).some(y=>y.client_key==="genome:"+s.seed+":"+x.id)?"ثبت‌شده در آلبوم":"ثبت در آلبوم · +۱۰ توکن";
          button.disabled=(s.specimens||[]).some(y=>y.client_key==="genome:"+s.seed+":"+x.id);
          button.setAttribute("data-pg-action","collect-creature");button.setAttribute("data-pg-id",String(x.id));
          card.append(canvas,name,meta,button);grid.append(card);
        });
      }
      const a=$("pgBreedParentA"),b=$("pgBreedParentB");
      if(a&&b&&s.state){
        const opts=s.state.species.filter(x=>x.dna).map(x=>({id:"world:"+x.id,label:x.name+" · نسل "+x.generation}));
        (s.specimens||[]).filter(x=>x.dna).forEach(x=>opts.push({id:"online:"+x.id,label:x.name+" · "+x.form}));
        [a,b].forEach(sel=>{const old=sel.value;sel.innerHTML=opts.map(x=>'<option value="'+escapeHtml(x.id)+'">'+escapeHtml(x.label)+'</option>').join("");if(opts.some(x=>x.id===old))sel.value=old;});
        if(!b.value&&opts.length>1)b.selectedIndex=1;
      }
      const album=$("pgGenomeAlbum");if(album){
        album.textContent="";(s.specimens||[]).slice(0,12).forEach(x=>{const el=doc.createElement("div");el.className="pg-album-item";el.textContent=x.name+" · "+x.form+" · نسل "+x.generation;album.append(el);});
        if(!s.specimens.length)album.textContent="هنوز موجودی ثبت نشده است.";
      }
    }
    async function attachOwnedGenomePanel(p){
      const detail=$("pgDetail"),key=p&&p.commercePlanetId;
      if(!detail||!key||!ownedCommerceIds.has(key)||$("pgGenomeGameBox")||genomePanelLoads.has(key))return;
      genomePanelLoads.add(key);
      const panel=doc.createElement("section");panel.id="pgGenomeGameBox";panel.className="pg-genome-panel";
      panel.innerHTML='<h4>🧬 زیست‌کرهٔ اختصاصی سیاره</h4><p class="pg-genome-note">ژنوم‌های روز و امروز از زمین مادر می‌آیند؛ هر حساب و هر سیاره بذر و مسیر تکامل تصادفی مخصوص خود را دارد.</p>'+
        '<div id="pgGenomeDaily" class="pg-genome-list">در حال دریافت ژنوم‌های امروز…</div>'+
        '<div class="pg-genome-controls"><button class="pg-btn primary" id="pgPlantGenomes" data-pg-action="plant-genomes" type="button" disabled>ورود ژنوم‌ها به سیاره</button><label>سرعت تکامل <input id="pgGenomeSpeed" type="range" min="1" max="8" value="1"><b id="pgGenomeSpeedLabel">×۱</b></label></div>'+
        '<div class="pg-genome-progress"><i id="pgGenomeProgress"></i></div><p id="pgGenomeStatus" class="pg-genome-note">در حال آماده‌سازی…</p><small id="pgGenomeStats" class="pg-genome-note"></small>'+
        '<h4>موجودات پدیدآمده · اندازه از موش‌مانند تا فیل‌مانند</h4><div id="pgGenomeSpecies" class="pg-creature-grid"></div>'+
        '<h4>ترکیب دو موجود و ساخت نسل تازه</h4><div class="pg-genome-controls"><select id="pgBreedParentA" aria-label="والد اول"></select><select id="pgBreedParentB" aria-label="والد دوم"></select><button class="pg-btn primary" data-pg-action="breed-creature" type="button">ترکیب تصادفی ژنوم‌ها</button></div>'+
        '<h4>آلبوم شخصی این سیاره</h4><div id="pgGenomeAlbum" class="pg-album-list"></div><p class="pg-genome-note">اندازه، فرم و صفات موجودات در این بخش شبیه‌سازی دیجیتال‌اند.</p>';
      detail.appendChild(panel);
      try{
        const s=await ensureGenomeSession(p);
        if(!panel.isConnected){genomePanelLoads.delete(key);if(open)renderUI();return;}
        renderGenomePanel(s);startGenomeTicker();
      }catch(e){const n=panel.querySelector("#pgGenomeStatus");if(n)n.textContent=e.message||"بارگذاری زیست‌کره ناموفق بود.";}
      finally{genomePanelLoads.delete(key);}
      const speed=$("pgGenomeSpeed");if(speed)speed.addEventListener("input",function(){
        const s=genomeSessions.get(gameSessionKey(p));if(!s)return;s.speed=Number(speed.value)||1;
        const label=$("pgGenomeSpeedLabel");if(label)label.textContent="×"+s.speed;saveGenomeSession(s);
      });
    }
    function renderOwnedPlanetGenomePanel(){
      const found=findPlanet(selectedPlanetId),p=found&&found.planet;
      if(mode==="galaxy"||!p||!p.commercePlanetId||!ownedCommerceIds.has(p.commercePlanetId)||$("pgGenomeGameBox"))return;
      attachOwnedGenomePanel(p);
    }
    function startGenomeTicker(){
      if(genomeTicker)return;
      genomeTicker=win.setInterval(function(){
        if(!open)return;
        for(const s of genomeSessions.values()){
          if(!s.started||s.completed||!s.state||String(s.accountId)!==String(playerProfile&&playerProfile.id||"local"))continue;
          const now=Date.now(),delta=Math.max(0,(now-s.lastWall)/1000);s.lastWall=now;s.elapsedSeconds=Math.min(180,s.elapsedSeconds+delta);
          const target=Math.floor(s.elapsedSeconds*s.speed*4);
          if(target>s.simulatedYears){win.PlanetGenomeGame.advance(s.state,target-s.simulatedYears);s.simulatedYears=target;}
          if(s.elapsedSeconds>=180)s.completed=true;saveGenomeSession(s);
          const selected=findPlanet(selectedPlanetId),matches=selected&&selected.planet.commercePlanetId===s.planet.commercePlanetId;
          if(matches){
            const st=$("pgGenomeStatus"),pr=$("pgGenomeProgress"),stats=$("pgGenomeStats");
            if(pr)pr.style.width=Math.min(100,s.elapsedSeconds/180*100)+"%";
            if(st)st.textContent=s.completed?"تکامل کامل شد؛ موجودات تازه آماده‌اند.":"در حال تکامل · "+Math.ceil(180-s.elapsedSeconds).toLocaleString("fa-IR")+" ثانیه باقی‌مانده";
            if(stats)stats.textContent=s.simulatedYears.toLocaleString("fa-IR")+" سال مدل · "+s.state.species.length.toLocaleString("fa-IR")+" گونه";
            if(s.completed&&!s.completionRendered){s.completionRendered=true;renderGenomePanel(s);}
          }
        }
      },1000);
    }
    async function registerGenomeCreature(s,x){
      const clientKey="genome:"+s.seed+":"+x.id;
      if((s.specimens||[]).some(y=>y.client_key===clientKey)){showNotice("این موجود قبلاً در آلبوم ثبت شده است.");return;}
      try{
        const result=await win.PlanetCommerceClient.registerSpecimen({clientKey,planetId:"planet-"+String(s.planet.commercePlanetId).slice(-3),
          name:x.name,form:x.form,dna:x.dna,generation:x.generation,fitness:x.fitness,bodyLengthCm:x.bodyLengthCm,special:x.special,rarityScore:x.rarityScore});
        const [collection,wallet]=await Promise.all([win.PlanetCommerceClient.collection(),win.PlanetCommerceClient.wallet()]);
        s.specimens=collection.specimens||[];updateWalletBadge(wallet.balance);
        showNotice(result.rewardTokens?("موجود به آلبوم افزوده شد؛ "+result.rewardTokens+" توکن گرفتی."):"موجود قبلاً در آلبوم ثبت شده است.");
        saveGenomeSession(s);renderGenomePanel(s);
      }catch(e){showNotice(e.message||"ثبت موجود ناموفق بود.");}
    }
    async function handleGenomeAction(action,id){
      const found=findPlanet(selectedPlanetId),p=found&&found.planet;if(!p||!p.commercePlanetId)return;
      const s=await ensureGenomeSession(p);
      if(action==="select-genome"){
        if(s.selected.has(id))s.selected.delete(id);else if(s.selected.size<3)s.selected.add(id);
        saveGenomeSession(s);renderGenomePanel(s);
      }else if(action==="plant-genomes"){
        const chosen=s.daily.filter(x=>s.selected.has(x.id));if(chosen.length<2||chosen.length>3)throw new Error("دو یا سه ژنوم انتخاب کن.");
        s.state=win.PlanetGenomeGame.createWorld(s.seed,p,chosen.map(x=>x.dna));
        s.started=true;s.completed=false;s.completionRendered=false;s.elapsedSeconds=0;s.simulatedYears=0;
        s.speed=Number($("pgGenomeSpeed").value)||1;s.lastWall=Date.now();saveGenomeSession(s);renderGenomePanel(s);startGenomeTicker();
      }else if(action==="collect-creature"){
        const x=s.state&&s.state.species.find(y=>String(y.id)===String(id));if(!x)throw new Error("موجود پیدا نشد.");await registerGenomeCreature(s,x);
      }else if(action==="breed-creature"){
        const resolve=value=>{
          if(String(value).startsWith("world:"))return s.state.species.find(x=>String(x.id)===String(value).slice(6));
          const x=(s.specimens||[]).find(y=>String(y.id)===String(value).slice(7));
          return x?{id:"online-"+x.id,dna:x.dna,generation:Number(x.generation)||1,bodyLengthCm:Number(x.body_length_cm)||20,form:x.form,habitat:"land"}:null;
        };
        const a=resolve($("pgBreedParentA").value),b=resolve($("pgBreedParentB").value);
        if(!a||!b)throw new Error("برای ترکیب، دو والد معتبر انتخاب کن.");
        const child=win.PlanetGenomeGame.breed(s.state,a,b);saveGenomeSession(s);renderGenomePanel(s);await registerGenomeCreature(s,child);
      }
    }
    function showIntro(){const el=$("pgGenomeIntro");if(el)el.classList.add("open");}
    function continueIntoGenomeGame(){
      const intro=$("pgGenomeIntro");if(intro)intro.classList.remove("open");
      const c=win.PlanetCommerceClient;if(c&&c.hasSession()){openExplorer();return;}
      $("openCollectionShop")?.click();
    }
    win.addEventListener("planet:account-ready",async function(){
      try{await refreshAccountSnapshot();const modal=$("collectionOverlay");if(modal)modal.classList.remove("open");openExplorer();}
      catch(e){showNotice(e.message||"حساب آماده نشد.");}
    });
    win.addEventListener("planet:wallet-updated",event=>updateWalletBadge(event.detail&&event.detail.balance));
    function renderUI(){
      const summary=Engine.getSummary(galaxy);
      $("pgStats").innerHTML=
        '<div class="pg-stat"><b>'+summary.systems+'</b><span>منظومه</span></div>'+
        '<div class="pg-stat"><b>'+summary.planets+'</b><span>سیاره در کاتالوگ</span></div>'+
        '<div class="pg-stat"><b>'+summary.discovered+'</b><span>سیاره کشف‌شده</span></div>';
      const list=$("pgList"),detail=$("pgDetail");
      if(mode==="galaxy"){
        $("pgSideTitle").textContent="فهرست منظومه‌ها";
        $("pgListLabel").textContent="برای ورود به هر منظومه انتخاب کن";
        $("pgCountLabel").textContent="SYSTEMS";
        $("pgBack").disabled=true;
        $("pgBack").style.opacity=".35";
        $("pgSceneKicker").textContent="GALAXY VIEW / 01";
        $("pgSceneTitle").textContent="THE GALAXY";
        $("pgSceneDesc").textContent="نقشهٔ فضایی سه‌بعدی منظومه‌های آغازین";
        list.innerHTML=galaxy.systems.map(function(system,index){
          const discovered=system.discovered;
          return '<article class="pg-item '+(system.id===selectedSystemId?"active":"")+'"><div class="pg-item-top"><strong>'+escapeHtml(systemTitle(system,index))+'</strong><span class="pg-tag">'+(discovered?"شناخته‌شده":"ناکاوش‌شده")+'</span></div><small>'+(discovered?"ستارهٔ ردهٔ "+system.star.type+" · "+system.planets.length+" سیاره":"اطلاعات سیاره‌ها پس از ورود و کشف نمایش داده می‌شود")+'</small><div class="pg-item-actions"><button class="pg-btn primary" data-pg-action="open-system" data-pg-id="'+escapeHtml(system.id)+'" type="button">ورود به منظومه</button></div></article>';
        }).join("");
        const active=findPlanet(galaxy.activePlanetId);
        detail.innerHTML='<h4>جهان فعال فعلی</h4><div class="pg-detail-grid"><div><span>سیاره</span><b>'+(active?escapeHtml(active.planet.name):"نامشخص")+'</b></div><div><span>شناسهٔ پایدار</span><b>'+escapeHtml(galaxy.activePlanetId)+'</b></div></div>';
      }else if(mode==="planet"){
        const found=findPlanet(selectedPlanetId),p=found&&found.planet,system=found&&found.system;
        $("pgSideTitle").textContent="نمای اختصاصی سیاره";
        $("pgListLabel").textContent="مشخصات جهان انتخاب‌شده";$("pgCountLabel").textContent="PLANET VIEW";
        $("pgBack").disabled=false;$("pgBack").style.opacity="1";$("pgBack").textContent="← بازگشت به منظومه";
        $("pgSceneKicker").textContent="PLANET SURFACE / "+(p?String(p.id).toUpperCase():"UNKNOWN");
        $("pgSceneTitle").textContent=p?escapeHtml(p.name.toUpperCase()):"PLANET";
        $("pgSceneDesc").textContent=p?escapeHtml(p.typeLabel)+" · نمای سطحی رویه‌ای و قابل چرخش":"سیاره‌ای انتخاب نشده";
        list.innerHTML=p?'<article class="pg-item active"><div class="pg-item-top"><strong>'+escapeHtml(p.name)+'</strong><span class="pg-tag">'+(galaxy.activePlanetId===p.id?"جهان فعال":"کشف‌شده")+'</span></div><small>منظومه: '+escapeHtml(system.name)+' · شناسه: '+escapeHtml(p.id)+'</small><div class="pg-item-actions"><button class="pg-btn primary" data-pg-action="select-planet" data-pg-id="'+escapeHtml(p.id)+'" type="button">انتخاب به‌عنوان جهان فعال</button></div></article>':'<div class="pg-empty">سیاره پیدا نشد.</div>';
        detail.innerHTML=p?'<h4>ارزش و مشخصات زیستی سیاره</h4><div class="pg-detail-grid"><div><span>رده</span><b>'+escapeHtml(p.typeLabel)+'</b></div><div><span>زیست‌پذیری</span><b>'+Number(p.lifePotential).toLocaleString("fa-IR")+'%</b></div><div><span>پتانسیل گونه‌های خاص</span><b>'+Number(p.specialSpeciesPotential).toLocaleString("fa-IR")+'%</b></div><div><span>ظرفیت</span><b>۲ موجود</b></div><div><span>قیمت</span><b>'+Number(p.priceTokens).toLocaleString("fa-IR")+' توکن</b></div><div><span>شعاع</span><b>'+Number(p.radiusKm).toLocaleString("fa-IR")+' km</b></div><div><span>گرانش</span><b>'+escapeHtml(p.gravity)+' g</b></div><div><span>دما</span><b>'+escapeHtml(p.meanTemperatureC)+' °C</b></div><div><span>آب</span><b>'+Math.round(p.waterCoverage*100)+'%</b></div><div><span>جو</span><b>'+escapeHtml(p.atmosphere)+'</b></div><div><span>زیست‌بوم‌ها</span><b>'+escapeHtml((p.biomes||[]).join("، ")) +'</b></div></div>'+(p.commercePlanetId?(ownedCommerceIds.has(p.commercePlanetId)?'<p>این سیاره را خریده‌ای.</p>':'<button class="pg-btn primary" data-pg-action="buy-planet" data-pg-id="'+escapeHtml(p.commercePlanetId)+'" type="button">خرید این سیاره · '+Number(p.priceTokens).toLocaleString("fa-IR")+' توکن</button>'):''):'<div class="pg-empty">سیاره انتخاب نشده است.</div>';
      }else{
        const system=activeSystem(),index=galaxy.systems.indexOf(system);
        $("pgBack").textContent="← بازگشت به کهکشان";
        $("pgSideTitle").textContent="سیارات منظومه";
        $("pgListLabel").textContent="سیاره را کشف یا انتخاب کن";
        $("pgCountLabel").textContent=system.planets.length+" WORLDS";
        $("pgBack").disabled=false;
        $("pgBack").style.opacity="1";
        $("pgSceneKicker").textContent="STAR SYSTEM / "+String(index+1).padStart(2,"0");
        $("pgSceneTitle").textContent=system.discovered?system.name.toUpperCase():"UNKNOWN SYSTEM";
        $("pgSceneDesc").textContent="ستارهٔ ردهٔ "+system.star.type+" · نمایش مداری سیاره‌های این منظومه";
        list.innerHTML=system.planets.map(function(planet,pIndex){
          const isActive=galaxy.activePlanetId===planet.id;
          const known=planet.discovered;
          return '<article class="pg-item '+(selectedPlanetId===planet.id?"active":"")+'"><div class="pg-item-top"><strong>'+escapeHtml(planetTitle(planet,pIndex))+'</strong><span class="pg-tag">'+(isActive?"جهان فعال":(known?"کشف‌شده":"ناشناخته"))+'</span></div><small>'+(escapeHtml(planet.typeLabel)+" · زیست‌پذیری "+Number(planet.lifePotential).toLocaleString("fa-IR")+"% · "+Number(planet.priceTokens).toLocaleString("fa-IR")+" توکن")+'</small><div class="pg-item-actions">'+(known?'<button class="pg-btn primary" data-pg-action="select-planet" data-pg-id="'+escapeHtml(planet.id)+'" type="button">'+(isActive?"جهان فعال":"انتخاب این جهان")+'</button><button class="pg-btn" data-pg-action="view-planet" data-pg-id="'+escapeHtml(planet.id)+'" type="button">نمای سه‌بعدی سیاره</button>':'<button class="pg-btn primary" data-pg-action="discover-planet" data-pg-id="'+escapeHtml(planet.id)+'" type="button">کاوش و کشف سیاره</button>')+'<button class="pg-btn" data-pg-action="focus-planet" data-pg-id="'+escapeHtml(planet.id)+'" type="button">تمرکز دوربین</button></div></article>';
        }).join("");
        const chosen=findPlanet(selectedPlanetId);
        if(chosen){
          const p=chosen.planet;
          detail.innerHTML='<h4>مشخصات زیستی و قیمت سیاره</h4><div class="pg-detail-grid"><div><span>رده</span><b>'+escapeHtml(p.typeLabel)+'</b></div><div><span>زیست‌پذیری</span><b>'+Number(p.lifePotential).toLocaleString("fa-IR")+'%</b></div><div><span>پتانسیل گونهٔ خاص</span><b>'+Number(p.specialSpeciesPotential).toLocaleString("fa-IR")+'%</b></div><div><span>ظرفیت</span><b>۲ موجود</b></div><div><span>قیمت</span><b>'+Number(p.priceTokens).toLocaleString("fa-IR")+' توکن</b></div><div><span>شعاع</span><b>'+p.radiusKm.toLocaleString("fa-IR")+' km</b></div><div><span>گرانش</span><b>'+p.gravity+' g</b></div><div><span>دما</span><b>'+p.meanTemperatureC+' °C</b></div><div><span>آب</span><b>'+Math.round(p.waterCoverage*100)+'%</b></div><div><span>جو</span><b>'+escapeHtml(p.atmosphere)+'</b></div></div>';
          if(p.commercePlanetId)detail.innerHTML+=(ownedCommerceIds.has(p.commercePlanetId)?"<p>این سیاره متعلق به حساب توست.</p>":'<button class="pg-btn primary" data-pg-action="buy-planet" data-pg-id="'+escapeHtml(p.commercePlanetId)+'" type="button">خرید این سیاره · '+Number(p.priceTokens).toLocaleString("fa-IR")+' توکن</button>');
        }else{
          detail.innerHTML='<h4>سیارهٔ انتخاب‌شده</h4><p style="margin:0;color:#8ea7c2;font-size:9px;line-height:1.8">برای مشاهدهٔ فراداده، ابتدا گزینهٔ «کاوش و کشف سیاره» را بزن. کشف فقط وضعیت و اطلاعات کاتالوگ را ثبت می‌کند.</p>';
        }
      }
      renderOwnedPlanetGenomePanel();
    }
    function openSystem(id){
      const system=galaxy.systems.find(s=>s.id===id);if(!system)return;
      mode="system";selectedSystemId=id;selectedPlanetId=system.planets.some(p=>p.id===galaxy.activePlanetId)?galaxy.activePlanetId:system.planets[0].id;
      camera.target=[0,0,0];camera.distance=13;camera.yaw=-0.7;camera.pitch=0.52;
      renderUI();if(renderer)renderer.invalidate();
    }
    function backToGalaxy(){
      mode="galaxy";camera.target=[0,0,0];camera.distance=25;camera.yaw=-0.65;camera.pitch=0.58;renderUI();if(renderer)renderer.invalidate();
    }
    function focusPlanet(id){
      const found=findPlanet(id);if(!found)return;
      selectedSystemId=found.system.id;selectedPlanetId=id;
      if(mode!=="system"||activeSystem().id!==found.system.id)openSystem(found.system.id);
      else renderUI();
      if(renderer)renderer.invalidate();
    }
    function viewPlanet(id){
      const found=findPlanet(id);if(!found||!found.planet.discovered)return;
      selectedSystemId=found.system.id;selectedPlanetId=id;mode="planet";
      camera.target=[0,0,0];camera.distance=4.6;camera.yaw=-0.72;camera.pitch=0.38;
      renderUI();if(renderer)renderer.invalidate();
      showNotice("نمای سطح سیاره هنوز تصویرسازی رویه‌ای است؛ اما دما، آب، گرانش و جؤ ثبت‌شدهٔ آن در زیست‌کرهٔ دیجیتال مستقل اثر می‌گذارند.");
    }
    function discover(id){
      const found=findPlanet(id);if(!found)return;
      if(!found.planet.discovered){
        Engine.discoverPlanet(galaxy,id);persist();
        selectedPlanetId=id;
        showNotice("سیاره کشف شد؛ با انتخاب آن، زیست‌کرهٔ دیجیتال اختصاصی و شرایط محیطی ثبت‌شده‌اش فعال می‌شود.");
      }else showNotice("این سیاره قبلاً کشف شده است.");
      renderUI();if(renderer)renderer.invalidate();
    }
    function select(id){
      const found=findPlanet(id);if(!found||!found.planet.discovered)return;
      if(Engine.selectPlanet(galaxy,id)){
        selectedSystemId=found.system.id;selectedPlanetId=id;persist();
        win.dispatchEvent(new win.CustomEvent("planet:active-world-changed",{detail:{planetId:id,planet:Engine.getPlanet(galaxy,id)}}));
        showNotice("جهان فعال انتخاب شد؛ زیست‌کرهٔ دیجیتال مستقل این سیاره بارگذاری یا ساخته می‌شود و ذخیرهٔ جهان‌های دیگر دست‌نخورده می‌ماند.");
        renderUI();if(renderer)renderer.invalidate();
      }
    }
    async function buyCommercePlanet(commercePlanetId){
      const client=win.PlanetCommerceClient;
      if(!client||!client.hasSession()){showNotice("برای خرید سیاره ابتدا وارد حساب بازیکن شو.");const account=$("openCollectionShop");if(account)account.click();return;}
      try{const result=await client.buyPlanet("planet-"+String(commercePlanetId).slice(-3));ownedCommerceIds.add(commercePlanetId);showNotice("سیارهٔ "+result.planet.name+" خریداری شد؛ زیست‌کرهٔ اختصاصی آمادهٔ راه‌اندازی است.");await refreshAccountSnapshot();renderUI();persist();}
      catch(error){showNotice(String(error&&error.message||error));}
    }
    overlay.addEventListener("click",function(event){
      const button=event.target.closest("[data-pg-action]");if(!button)return;
      const action=button.getAttribute("data-pg-action"),id=button.getAttribute("data-pg-id");
      if(action==="open-system")openSystem(id);
      else if(action==="view-planet")viewPlanet(id);
      else if(action==="discover-planet")discover(id);
      else if(action==="select-planet")select(id);
      else if(action==="focus-planet")focusPlanet(id);
      else if(action==="buy-planet")buyCommercePlanet(id);
      else if(["select-genome","plant-genomes","collect-creature","breed-creature"].includes(action))handleGenomeAction(action,id).catch(error=>showNotice(error.message||"عملیات ژنوم انجام نشد."));
    });
    $("pgBack").addEventListener("click",function(){if(mode==="planet"){mode="system";camera.distance=13;camera.yaw=-0.7;camera.pitch=0.52;renderUI();if(renderer)renderer.invalidate();}else backToGalaxy();});
    $("pgClose").addEventListener("click",close);
    $("pgZoomIn").addEventListener("click",function(){camera.distance=clamp(camera.distance*.82,mode==="galaxy"?10:5,55);if(renderer)renderer.invalidate();});
    $("pgZoomOut").addEventListener("click",function(){camera.distance=clamp(camera.distance*1.22,mode==="galaxy"?10:5,55);if(renderer)renderer.invalidate();});
    overlay.addEventListener("click",function(event){if(event.target===overlay)close();});
    doc.addEventListener("keydown",function(event){if(event.key==="Escape"&&open)close();});
    launch.addEventListener("click",showIntro);
    function openExplorer(){
      open=true;overlay.classList.add("open");renderUI();
      const commerce=win.PlanetCommerceClient;
      if(commerce&&commerce.hasSession())refreshAccountSnapshot().catch(error=>showNotice(error.message||"کیف پول به‌روزرسانی نشد."));
      if(renderer){renderer.resize();renderer.start();}
      else{
        try{renderer=createRenderer(win,canvas);renderer.setState(function(){return {mode:mode,galaxy:galaxy,system:activeSystem(),camera:camera};},function(id){if(mode==="galaxy")openSystem(id);else focusPlanet(id);});}
        catch(error){ctxNote.textContent="نمای سه‌بعدی در این مرورگر فعال نشد؛ فهرست کاوش همچنان در دسترس است.";ctxNote.style.borderColor="#d19d5b88";}
      }
      if(renderer){renderer.invalidate();renderer.start();}
    }
    function close(){open=false;overlay.classList.remove("open");if(genomeTicker){win.clearInterval(genomeTicker);genomeTicker=0;}if(raf){win.cancelAnimationFrame(raf);raf=0;}if(renderer)renderer.stop();}
    function createRenderer(win,canvas){
      const gl=canvas.getContext("webgl",{alpha:true,antialias:true,depth:true})||canvas.getContext("experimental-webgl");
      if(!gl)throw new Error("WebGL unavailable");
      const compile=function(type,source){
        const shader=gl.createShader(type);gl.shaderSource(shader,source);gl.compileShader(shader);
        if(!gl.getShaderParameter(shader,gl.COMPILE_STATUS)){const message=gl.getShaderInfoLog(shader)||"Shader compile failed";gl.deleteShader(shader);throw new Error(message);}
        return shader;
      };
      const link=function(vs,fs){
        const program=gl.createProgram();gl.attachShader(program,compile(gl.VERTEX_SHADER,vs));gl.attachShader(program,compile(gl.FRAGMENT_SHADER,fs));gl.linkProgram(program);
        if(!gl.getProgramParameter(program,gl.LINK_STATUS))throw new Error(gl.getProgramInfoLog(program)||"Shader link failed");
        return program;
      };
      const sphereProgram=link(
        "attribute vec3 aPosition;attribute vec3 aNormal;uniform mat4 uMvp;uniform mat4 uModel;varying vec3 vNormal;varying vec3 vWorld;void main(){vec4 w=uModel*vec4(aPosition,1.0);vWorld=w.xyz;vNormal=mat3(uModel)*aNormal;gl_Position=uMvp*vec4(aPosition,1.0);}",
        "precision mediump float;uniform vec3 uColor;uniform vec3 uLight;uniform vec3 uCamera;uniform float uEmissive;uniform vec3 uSurfaceA;uniform vec3 uSurfaceB;uniform vec3 uWaterColor;uniform float uWater;uniform float uPattern;uniform float uSurfaceOn;varying vec3 vNormal;varying vec3 vWorld;void main(){vec3 n=normalize(vNormal);vec3 l=normalize(uLight-vWorld);vec3 v=normalize(uCamera-vWorld);float d=max(dot(n,l),0.0);float rim=pow(1.0-max(dot(n,v),0.0),2.2);float noise=sin(n.x*31.0+sin(n.z*19.0))*cos(n.y*27.0+n.z*11.0);float bands=sin((n.y+noise*0.035)*uPattern*18.0);float landMask=smoothstep(-0.18,0.18,noise+bands*0.12);float waterMask=step(0.5-uWater*0.72,n.y*0.12+noise*0.34);vec3 surface=mix(uSurfaceA,uSurfaceB,landMask);surface=mix(surface,uWaterColor,waterMask*(1.0-step(5.5,uPattern)));vec3 base=mix(uColor,surface,uSurfaceOn)*(0.2+d*0.82)+uColor*rim*0.28+vec3(1.0)*pow(max(dot(reflect(-l,n),v),0.0),18.0)*0.12;gl_FragColor=vec4(mix(base,uColor*1.5,uEmissive),1.0);}"
      );
      const lineProgram=link(
        "attribute vec3 aPosition;uniform mat4 uMvp;void main(){gl_Position=uMvp*vec4(aPosition,1.0);}",
        "precision mediump float;uniform vec4 uColor;void main(){gl_FragColor=uColor;}"
      );
      const starProgram=link(
        "attribute vec3 aPosition;attribute float aSize;uniform mat4 uVp;void main(){gl_Position=uVp*vec4(aPosition,1.0);gl_PointSize=aSize;}",
        "precision mediump float;void main(){vec2 p=gl_PointCoord-vec2(0.5);float d=length(p);float a=(1.0-smoothstep(0.05,0.5,d));gl_FragColor=vec4(0.72,0.86,1.0,a);}"
      );
      const sphere=buildSphere(gl),lineBuffer=gl.createBuffer(),starBuffer=gl.createBuffer();
      const starData=[];let seed=0x504c414e;
      for(let i=0;i<1100;i++){
        seed=(Math.imul(seed,1664525)+1013904223)>>>0;
        const x=((seed/4294967296)-.5)*110;
        seed=(Math.imul(seed,1664525)+1013904223)>>>0;
        const y=((seed/4294967296)-.5)*65;
        seed=(Math.imul(seed,1664525)+1013904223)>>>0;
        const z=((seed/4294967296)-.5)*110;
        seed=(Math.imul(seed,1664525)+1013904223)>>>0;
        const size=1.1+(seed/4294967296)*1.8;
        starData.push(x,y,z,size);
      }
      gl.bindBuffer(gl.ARRAY_BUFFER,starBuffer);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(starData),gl.STATIC_DRAW);
      let stateProvider=function(){return {mode:"galaxy",galaxy:galaxy,system:activeSystem(),camera:camera};};
      let selectHandler=function(){};
      let width=1,height=1,frame=0,lastTime=0,dirty=true;
      const resize=function(){
        const rect=canvas.getBoundingClientRect(),dpr=Math.min(2,win.devicePixelRatio||1);
        width=Math.max(1,Math.floor(rect.width*dpr));height=Math.max(1,Math.floor(rect.height*dpr));
        if(canvas.width!==width||canvas.height!==height){canvas.width=width;canvas.height=height;}
        gl.viewport(0,0,width,height);dirty=true;
      };
      function perspective(fovy,aspect,near,far){
        const f=1/Math.tan(fovy/2),out=new Float32Array(16);
        out[0]=f/aspect;out[5]=f;out[10]=(far+near)/(near-far);out[11]=-1;out[14]=(2*far*near)/(near-far);return out;
      }
      function normalize(v){const l=Math.hypot(v[0],v[1],v[2])||1;return [v[0]/l,v[1]/l,v[2]/l];}
      function cross(a,b){return [a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];}
      function lookAt(eye,center,up){
        const z=normalize([eye[0]-center[0],eye[1]-center[1],eye[2]-center[2]]),x=normalize(cross(up,z)),y=cross(z,x),out=new Float32Array(16);
        out[0]=x[0];out[1]=y[0];out[2]=z[0];out[3]=0;
        out[4]=x[1];out[5]=y[1];out[6]=z[1];out[7]=0;
        out[8]=x[2];out[9]=y[2];out[10]=z[2];out[11]=0;
        out[12]=-(x[0]*eye[0]+x[1]*eye[1]+x[2]*eye[2]);out[13]=-(y[0]*eye[0]+y[1]*eye[1]+y[2]*eye[2]);out[14]=-(z[0]*eye[0]+z[1]*eye[1]+z[2]*eye[2]);out[15]=1;return out;
      }
      function multiply(a,b){
        const out=new Float32Array(16);
        for(let c=0;c<4;c++)for(let r=0;r<4;r++)out[c*4+r]=a[r]*b[c*4]+a[4+r]*b[c*4+1]+a[8+r]*b[c*4+2]+a[12+r]*b[c*4+3];
        return out;
      }
      function transform(x,y,z,s){
        const out=new Float32Array(16);out[0]=s;out[5]=s;out[10]=s;out[12]=x;out[13]=y;out[14]=z;out[15]=1;return out;
      }
      function cameraMatrices(){
        const c=stateProvider().camera||camera,dist=c.distance;
        const cp=Math.cos(c.pitch),sp=Math.sin(c.pitch),sy=Math.sin(c.yaw),cy=Math.cos(c.yaw);
        const eye=[c.target[0]+sy*dist*cp,c.target[1]+sp*dist,c.target[2]+cy*dist*cp];
        const projection=perspective(0.72,width/Math.max(1,height),0.1,180);
        const view=lookAt(eye,c.target,[0,1,0]);
        return {vp:multiply(projection,view),eye:eye};
      }
      function drawSphere(mvp,model,color,emissive,eye,surface){
        gl.useProgram(sphereProgram);
        gl.bindBuffer(gl.ARRAY_BUFFER,sphere.vertices);
        const p=gl.getAttribLocation(sphereProgram,"aPosition"),n=gl.getAttribLocation(sphereProgram,"aNormal");
        gl.enableVertexAttribArray(p);gl.vertexAttribPointer(p,3,gl.FLOAT,false,24,0);
        gl.enableVertexAttribArray(n);gl.vertexAttribPointer(n,3,gl.FLOAT,false,24,12);
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,sphere.indices);
        gl.uniformMatrix4fv(gl.getUniformLocation(sphereProgram,"uMvp"),false,mvp);
        gl.uniformMatrix4fv(gl.getUniformLocation(sphereProgram,"uModel"),false,model);
        gl.uniform3fv(gl.getUniformLocation(sphereProgram,"uColor"),color);
        gl.uniform3f(gl.getUniformLocation(sphereProgram,"uLight"),0,8,0);
        gl.uniform3fv(gl.getUniformLocation(sphereProgram,"uCamera"),eye);
        gl.uniform1f(gl.getUniformLocation(sphereProgram,"uEmissive"),emissive||0);
        const profile=surface||null;
        gl.uniform1f(gl.getUniformLocation(sphereProgram,"uSurfaceOn"),profile?1:0);
        gl.uniform3fv(gl.getUniformLocation(sphereProgram,"uSurfaceA"),profile?profile.land:[0,0,0]);
        gl.uniform3fv(gl.getUniformLocation(sphereProgram,"uSurfaceB"),profile?profile.accent:[0,0,0]);
        gl.uniform3fv(gl.getUniformLocation(sphereProgram,"uWaterColor"),profile?profile.water:[0,0,0]);
        gl.uniform1f(gl.getUniformLocation(sphereProgram,"uWater"),profile?profile.waterCoverage:0);
        gl.uniform1f(gl.getUniformLocation(sphereProgram,"uPattern"),profile?profile.pattern:1);
        gl.drawElements(gl.TRIANGLES,sphere.count,gl.UNSIGNED_SHORT,0);
      }
      function drawOrbit(vp,x,y,z,r,color){
        const pts=[];for(let i=0;i<=96;i++){const a=i/96*Math.PI*2;pts.push(x+Math.cos(a)*r,y,z+Math.sin(a)*r);}
        drawLine(vp,pts,color);
      }
      function drawLine(vp,points,color){
        gl.useProgram(lineProgram);gl.bindBuffer(gl.ARRAY_BUFFER,lineBuffer);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(points),gl.DYNAMIC_DRAW);
        const p=gl.getAttribLocation(lineProgram,"aPosition");gl.enableVertexAttribArray(p);gl.vertexAttribPointer(p,3,gl.FLOAT,false,0,0);
        gl.uniformMatrix4fv(gl.getUniformLocation(lineProgram,"uMvp"),false,vp);
        gl.uniform4fv(gl.getUniformLocation(lineProgram,"uColor"),color);
        gl.drawArrays(gl.LINE_STRIP,0,points.length/3);
      }
      function drawStars(vp){
        gl.useProgram(starProgram);gl.bindBuffer(gl.ARRAY_BUFFER,starBuffer);
        const p=gl.getAttribLocation(starProgram,"aPosition"),s=gl.getAttribLocation(starProgram,"aSize");
        gl.enableVertexAttribArray(p);gl.vertexAttribPointer(p,3,gl.FLOAT,false,16,0);
        gl.enableVertexAttribArray(s);gl.vertexAttribPointer(s,1,gl.FLOAT,false,16,12);
        gl.uniformMatrix4fv(gl.getUniformLocation(starProgram,"uVp"),false,vp);
        gl.enable(gl.BLEND);gl.blendFunc(gl.SRC_ALPHA,gl.ONE);gl.depthMask(false);gl.drawArrays(gl.POINTS,0,starData.length/4);gl.depthMask(true);gl.disable(gl.BLEND);
      }
      function project(vp,point){
        const x=point[0],y=point[1],z=point[2];
        const cx=vp[0]*x+vp[4]*y+vp[8]*z+vp[12],cy=vp[1]*x+vp[5]*y+vp[9]*z+vp[13],cz=vp[2]*x+vp[6]*y+vp[10]*z+vp[14],cw=vp[3]*x+vp[7]*y+vp[11]*z+vp[15];
        if(cw<=0)return null;
        return {x:(cx/cw*.5+.5)*width,y:(1-(cy/cw*.5+.5))*height,z:cz/cw};
      }
      function buildSphere(gl){
        const data=[],indices=[],lat=18,long=28;
        for(let y=0;y<=lat;y++){const v=y/lat,theta=v*Math.PI;for(let x=0;x<=long;x++){const u=x/long,phi=u*Math.PI*2,nx=-Math.cos(phi)*Math.sin(theta),ny=Math.cos(theta),nz=Math.sin(phi)*Math.sin(theta);data.push(nx,ny,nz,nx,ny,nz);}}
        for(let y=0;y<lat;y++)for(let x=0;x<long;x++){const a=y*(long+1)+x,b=a+long+1;indices.push(a,b,a+1,b,b+1,a+1);}
        const vertices=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,vertices);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(data),gl.STATIC_DRAW);
        const indexBuffer=gl.createBuffer();gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,indexBuffer);gl.bufferData(gl.ELEMENT_ARRAY_BUFFER,new Uint16Array(indices),gl.STATIC_DRAW);
        return {vertices:vertices,indices:indexBuffer,count:indices.length};
      }
      function render(now){
        if(!open)return;
        const elapsed=now-(lastTime||now);lastTime=now;
        if(elapsed>0)dirty=true;
        resize();
        gl.enable(gl.DEPTH_TEST);gl.depthFunc(gl.LEQUAL);gl.clearColor(0.012,0.027,0.058,1);gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);
        const matrices=cameraMatrices(),vp=matrices.vp;
        drawStars(vp);
        const state=stateProvider();
        if(state.mode==="galaxy"){
          const layout=layoutGalaxy(state.galaxy);
          const armColors=[[0.24,0.53,0.82,0.34],[0.36,0.65,0.88,0.24],[0.55,0.42,0.83,0.22]];
          for(let arm=0;arm<3;arm++){
            const pts=[];for(let i=0;i<=65;i++){const t=i/65,angle=t*5.2+arm*2.094,r=.55+t*11;pts.push(Math.cos(angle)*r,Math.sin(angle*1.9)*.22,Math.sin(angle)*r);}
            drawLine(vp,pts,armColors[arm]);
          }
          layout.forEach(function(pos,index){
            const system=state.galaxy.systems[index];const starColor=hexColor(system.star.color||SYSTEM_COLORS[index%SYSTEM_COLORS.length]);
            drawSphere(multiply(vp,transform(pos.x,pos.y,pos.z,.58)),transform(pos.x,pos.y,pos.z,.58),starColor,.9,matrices.eye);
            for(let p=0;p<Math.min(system.planets.length,5);p++){
              const orbit=.82+p*.22,a=now*.00012+p*2.15;
              drawOrbit(vp,pos.x,pos.y,pos.z,orbit,[.34,.64,.82,.25]);
              const px=pos.x+Math.cos(a)*orbit,pz=pos.z+Math.sin(a)*orbit;
              drawSphere(multiply(vp,transform(px,pos.y,pz,.085)),transform(px,pos.y,pz,.085),colorForType(system.planets[p].type),.05,matrices.eye);
            }
            const center=project(vp,[pos.x,pos.y,pos.z]);
            if(center){canvas.dataset["pgSystem"+index]=Math.round(center.x)+","+Math.round(center.y);}
          });
        }else if(state.mode==="planet"){
          const found=findPlanet(selectedPlanetId),planet=found&&found.planet;
          if(planet){
            const surface=planetSurfaceProfile(planet),radius=1.72,model=transform(0,0,0,radius);
            drawSphere(multiply(vp,model),model,colorForType(planet.type),0,matrices.eye,surface);
            if(surface.gasGiant){
              const ring=[];for(let i=0;i<=120;i++){const a=i/120*Math.PI*2;ring.push(Math.cos(a)*2.35,Math.sin(a)*0.28,Math.sin(a)*2.35);}
              drawLine(vp,ring,[0.82,0.66,0.48,0.68]);
            }
          }
        }else{
          const system=state.system;
          if(system){
            const star=hexColor(system.star.color||"#ffdb9a");
            drawSphere(multiply(vp,transform(0,0,0,.82)),transform(0,0,0,.82),star,.82,matrices.eye);
            const positions=layoutPlanets(system,now);
            positions.forEach(function(pos,index){
              drawOrbit(vp,0,0,0,pos.orbit,[.36,.63,.81,.35]);
              const planet=system.planets[index];
              const selected=planet.id===selectedPlanetId;
              const radius=selected?.33:.24;
              const model=transform(pos.x,pos.y,pos.z,radius);
              drawSphere(multiply(vp,model),model,colorForType(planet.type),selected?.18:.03,matrices.eye);
              const center=project(vp,[pos.x,pos.y,pos.z]);if(center)canvas.dataset["pgPlanet"+index]=Math.round(center.x)+","+Math.round(center.y);
            });
          }
        }
        if(open)frame=win.requestAnimationFrame(render);
      }
      function pick(clientX,clientY){
        const rect=canvas.getBoundingClientRect(),px=(clientX-rect.left)*(width/Math.max(1,rect.width)),py=(clientY-rect.top)*(height/Math.max(1,rect.height));
        const matrices=cameraMatrices(),vp=matrices.vp;let best=null,bestDistance=52;
        if(stateProvider().mode==="galaxy"){
          layoutGalaxy(galaxy).forEach(function(pos){const p=project(vp,[pos.x,pos.y,pos.z]);if(!p||p.z>1)return;const d=Math.hypot(p.x-px,p.y-py);if(d<bestDistance){bestDistance=d;best=pos.id;}});
        }else if(stateProvider().mode==="system"){
          const positions=layoutPlanets(activeSystem(),win.performance.now());
          positions.forEach(function(pos){const p=project(vp,[pos.x,pos.y,pos.z]);if(!p||p.z>1)return;const d=Math.hypot(p.x-px,p.y-py);if(d<bestDistance){bestDistance=d;best=pos.id;}});
        }
        if(best)selectHandler(best);
      }
      function pointerDown(event){
        canvas.setPointerCapture&&canvas.setPointerCapture(event.pointerId);
        pointerState=pointerState||{points:new Map(),dragging:false,lastX:0,lastY:0,startX:0,startY:0,pinch:0};
        pointerState.points.set(event.pointerId,{x:event.clientX,y:event.clientY});
        if(pointerState.points.size===1){pointerState.lastX=event.clientX;pointerState.lastY=event.clientY;pointerState.startX=event.clientX;pointerState.startY=event.clientY;pointerState.dragging=false;}
        if(pointerState.points.size===2){const a=Array.from(pointerState.points.values());pointerState.pinch=Math.hypot(a[0].x-a[1].x,a[0].y-a[1].y);}
      }
      function pointerMove(event){
        if(!pointerState||!pointerState.points.has(event.pointerId))return;
        const prev=pointerState.points.get(event.pointerId);pointerState.points.set(event.pointerId,{x:event.clientX,y:event.clientY});
        if(pointerState.points.size>=2){
          const a=Array.from(pointerState.points.values()),d=Math.hypot(a[0].x-a[1].x,a[0].y-a[1].y);
          if(pointerState.pinch>0){camera.distance=clamp(camera.distance*(pointerState.pinch/d),mode==="galaxy"?10:5,55);pointerState.pinch=d;}
          pointerState.dragging=true;
        }else{
          const dx=event.clientX-pointerState.lastX,dy=event.clientY-pointerState.lastY;
          if(Math.hypot(event.clientX-pointerState.startX,event.clientY-pointerState.startY)>4)pointerState.dragging=true;
          if(pointerState.dragging){camera.yaw+=dx*.006;camera.pitch=clamp(camera.pitch+dy*.005,-.18,1.25);}
          pointerState.lastX=event.clientX;pointerState.lastY=event.clientY;
        }
        pointerState.points.set(event.pointerId,{x:event.clientX,y:event.clientY});dirty=true;
      }
      function pointerUp(event){
        if(!pointerState)return;
        const click=!pointerState.dragging&&pointerState.points.size===1;
        pointerState.points.delete(event.pointerId);
        if(pointerState.points.size<2)pointerState.pinch=0;
        if(pointerState.points.size===0){if(click)pick(event.clientX,event.clientY);pointerState=null;}
      }
      canvas.addEventListener("pointerdown",pointerDown);
      canvas.addEventListener("pointermove",pointerMove);
      canvas.addEventListener("pointerup",pointerUp);
      canvas.addEventListener("pointercancel",function(){pointerState=null;});
      canvas.addEventListener("wheel",function(event){event.preventDefault();camera.distance=clamp(camera.distance*(event.deltaY>0?1.1:.9),mode==="galaxy"?10:5,55);dirty=true;},{passive:false});
      win.addEventListener("resize",resize);
      return {
        setState:function(provider,handler){stateProvider=provider;selectHandler=handler;},
        resize:resize,invalidate:function(){dirty=true;},
        start:function(){if(!frame){lastTime=0;resize();frame=win.requestAnimationFrame(render);}},
        stop:function(){if(frame){win.cancelAnimationFrame(frame);frame=0;}}
      };
    }
    renderUI();
  }
  return {install:install,layoutGalaxy:layoutGalaxy,layoutPlanets:layoutPlanets,colorForType:colorForType,hexColor:hexColor,planetSurfaceProfile:planetSurfaceProfile};
});
