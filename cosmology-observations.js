/* Published observational constraints and a small local table viewer.
 * This is a provenance-led evidence panel, not a substitute for full CMB/BAO likelihoods.
 */
(function(){
'use strict';
const $=id=>document.getElementById(id);
let lang=document.documentElement.lang==='en'?'en':'fa';
let uploaded=[];
let uploadedName='';
const EVIDENCE={
 cmb:{
  title:{fa:'Planck 2018 — تابش زمینهٔ کیهانی',en:'Planck 2018 — cosmic microwave background'},
  description:{
   fa:'ترکیب طیف دما و قطبش TT/TE/EE، قطبش کم‌چندقطبی و بازسازی عدسی گرانشی. پارامترهای زیر از برازش مدل پایهٔ تخت ΛCDM به داده‌های Planck به‌دست آمده‌اند و مستقل از مدل نیستند.',
   en:'Temperature and polarization spectra TT/TE/EE, low-multipole polarization, and CMB lensing reconstruction. The parameters below are inferred by fitting the base flat ΛCDM model to Planck data and are not model-independent.'
  },
  metrics:[
   {label:{fa:'ثابت هابل H₀ — برازش Planck',en:'Hubble constant H₀ — Planck fit'},value:67.36,minus:.54,plus:.54,unit:'km s⁻¹ Mpc⁻¹',display:'67.36 ± 0.54',group:'H0'},
   {label:{fa:'چگالی ماده Ωm — در ΛCDM تخت',en:'Matter density Ωm — flat ΛCDM'},value:.3153,minus:.0073,plus:.0073,unit:'dimensionless',display:'0.3153 ± 0.0073',group:'Om'}
  ],
  conclusion:{
   fa:'این داده‌ها الگوی دقیق قله‌های آکوستیکی CMB و پارامترهای مدل مرجع را محدود می‌کنند. برای جهان جهشی یا چرخه‌ای باید طیف CMB مخصوص همان مدل محاسبه و با likelihood منتشرشده مقایسه شود؛ این پنل چنین برازش کاملی اجرا نمی‌کند.',
   en:'These data constrain the CMB acoustic-peak pattern and parameters of the baseline model. A bounce or cyclic model needs its own predicted CMB spectrum and comparison with a released likelihood; this panel does not run that full fit.'
  },
  links:[
   ['Planck 2018 results VI — cosmological parameters','https://doi.org/10.1051/0004-6361/201833910'],
   ['ESA Planck PR3 cosmology data products','https://esdcdoi.esac.esa.int/doi/html/data/astronomy/planck/Cosmology.html']
  ],
  method:'published-fit'
 },
 expansion:{
  title:{fa:'انبساط جهان — Planck، DESI DR2 و GW170817',en:'Cosmic expansion — Planck, DESI DR2 and GW170817'},
  description:{
   fa:'این نمودار سه برآورد از H₀ را کنار هم می‌گذارد. آن‌ها ورودی‌ها و فرضیات یکسان ندارند: مقدار Planck بر مدل پایهٔ ΛCDM تکیه دارد، مقدار DESI در تحلیل گزارش‌شده با فرض ΛCDM و پیشین BBN آمده، و مقدار GW170817 یک اندازه‌گیری مستقلِ «شمع استاندارد» از یک رویداد است.',
   en:'This plot places three estimates of H₀ side by side. They do not share identical inputs or assumptions: Planck relies on base ΛCDM, the cited DESI estimate assumes ΛCDM and a BBN prior, and GW170817 is an independent standard-siren measurement from one event.'
  },
  metrics:[
   {label:{fa:'Planck CMB + عدسی؛ مدل پایهٔ ΛCDM',en:'Planck CMB + lensing; base ΛCDM'},value:67.36,minus:.54,plus:.54,unit:'km s⁻¹ Mpc⁻¹',display:'67.36 ± 0.54',group:'H0'},
   {label:{fa:'DESI DR2 Lyα + پیشین BBN؛ در ΛCDM',en:'DESI DR2 Lyα + BBN prior; in ΛCDM'},value:66.5,minus:1.3,plus:1.3,unit:'km s⁻¹ Mpc⁻¹',display:'66.5 ± 1.3',group:'H0'},
   {label:{fa:'شمع استاندارد GW170817؛ بازهٔ ۶۸٪',en:'GW170817 standard siren; 68% interval'},value:75.46,minus:5.39,plus:5.34,unit:'km s⁻¹ Mpc⁻¹',display:'75.46 −5.39 / +5.34',group:'H0'}
  ],
  conclusion:{
   fa:'این‌ها سه سنجهٔ مفید با عدم‌قطعیت و فرضیات متفاوت‌اند، نه اندازه‌گیری‌های کاملاً همسان. این پنل اختلاف یا تنش آماری را دوباره محاسبه نمی‌کند؛ برای آن، کوواریانس‌ها، انتخاب نمونه، پیشین‌ها و likelihood هر مجموعه لازم است.',
   en:'These are useful estimates with different uncertainties and assumptions, not perfectly identical measurements. This panel does not recompute statistical tension; that requires each dataset likelihood, covariance, sample selection and priors.'
  },
  links:[
   ['DESI DR2 Results IV (2026 preprint)','https://arxiv.org/abs/2607.27410'],
   ['Official DESI DR2 cosmology chains and documentation','https://data.desi.lbl.gov/public/papers/y3/bao-cosmo-params/'],
   ['GW170817 standard-siren paper (2024)','https://doi.org/10.1103/PhysRevD.109.063508']
  ],
  method:'H0-comparison'
 },
 bao:{
  title:{fa:'DESI DR2 — خط‌کش آکوستیکی باریونی',en:'DESI DR2 — baryon acoustic ruler'},
  description:{
   fa:'تحلیل DESI DR2 در z مؤثر ۲٫۳۳ نسبت فاصلهٔ هابل و فاصلهٔ هم‌رو را به افق صوتی اندازه می‌گیرد. عددها در زیر همان مقادیر منتشرشده در پیش‌چاپ نتایج IV در سال ۲۰۲۶ هستند.',
   en:'DESI DR2 at effective redshift 2.33 measures the Hubble distance and transverse comoving distance relative to the sound horizon. The values below are those reported in the 2026 preprint for Results IV.'
  },
  metrics:[
   {label:{fa:'Dₕ/rᵈ در z = 2.33',en:'Dₕ/rᵈ at z = 2.33'},value:8.600,minus:.066,plus:.066,unit:'dimensionless',display:'8.600 ± 0.066',group:'DH'},
   {label:{fa:'Dₘ/rᵈ در z = 2.33',en:'Dₘ/rᵈ at z = 2.33'},value:39.32,minus:.33,plus:.33,unit:'dimensionless',display:'39.32 ± 0.33',group:'DM'},
   {label:{fa:'H₀ در ΛCDM + پیشین BBN',en:'H₀ in ΛCDM + BBN prior'},value:66.5,minus:1.3,plus:1.3,unit:'km s⁻¹ Mpc⁻¹',display:'66.5 ± 1.3',group:'H0'},
   {label:{fa:'Ωm در ΛCDM',en:'Ωm in ΛCDM'},value:.325,minus:.018,plus:.018,unit:'dimensionless',display:'0.325 ± 0.018',group:'Om'}
  ],
  conclusion:{
   fa:'همان تحلیل گزارش می‌کند که مدل w₀wₐ با انرژی تاریک وابسته به زمان نسبت به ΛCDM در ترکیب DESI+CMB به ۲٫۷σ و با افزودن داده‌های ابرنواختر به ۳٫۲σ ترجیح داده شده است. این میزان به مدل و ترکیب داده‌ها وابسته است و به‌تنهایی «کشف قطعی انرژی تاریک متغیر» نیست.',
   en:'The analysis reports a preference for time-varying dark energy (w₀wₐ) over ΛCDM at 2.7σ for DESI+CMB and 3.2σ after adding supernova data. The significance depends on the parameterization and data combination; it is not by itself a definitive discovery of evolving dark energy.'
  },
  links:[
   ['DESI DR2 Results IV (2026 preprint)','https://arxiv.org/abs/2607.27410'],
   ['Official DESI DR2 chains and documentation','https://data.desi.lbl.gov/public/papers/y3/bao-cosmo-params/'],
   ['DESI DR2 Results II — BAO constraints','https://doi.org/10.1103/tr6y-kpc6']
  ],
  method:'published-fit'
 },
 tensor:{
  title:{fa:'قطبش B در CMB — قید موج گرانشی آغازین',en:'CMB B-mode polarization — primordial tensor bound'},
  description:{
   fa:'تحلیل BICEP/Keck تا فصل رصدی ۲۰۱۸، با داده‌های Planck و WMAP و مدل‌سازی غبار و سینکروترون، نسبت تانسوری به اسکالر را محدود می‌کند. این کمیت r در مقیاس k = 0.05 Mpc⁻¹ تعریف می‌شود.',
   en:'The BICEP/Keck analysis through the 2018 observing season, combined with Planck and WMAP and foreground modelling for dust and synchrotron, constrains the tensor-to-scalar ratio at k = 0.05 Mpc⁻¹.'
  },
  metrics:[
   {label:{fa:'حد بالای r₀.₀₅ — سطح اطمینان ۹۵٪',en:'Upper limit on r₀.₀₅ — 95% confidence'},value:.036,minus:0,plus:0,limit:true,unit:'dimensionless',display:'r₀.₀₅ < 0.036',group:'r'}
  ],
  conclusion:{
   fa:'این حد، دامنهٔ موج‌های گرانشی آغازین را در مدل‌های تورمی محدود می‌کند؛ عدم تشخیص قطبش B آغازین به معنی نبودِ موج گرانشی نیست. مدل تورم باید طیف r و شکل طیفی قابل مقایسه با همین likelihood را پیش‌بینی کند.',
   en:'This bound limits primordial tensor amplitudes in inflation models; failure to detect a primordial B-mode is not proof that gravitational waves do not exist. An inflation model must predict r and a spectrum that can be compared with this likelihood.'
  },
  links:[
   ['BICEP/Keck XIII paper','https://arxiv.org/abs/2110.00483'],
   ['NASA LAMBDA — BK18 r likelihood download page','https://lambda.gsfc.nasa.gov/product/bicepkeck/bicep2k_r_likelihood21_get.html'],
   ['NASA LAMBDA — BK18 bandpower data page','https://lambda.gsfc.nasa.gov/product/bicepkeck/bicep2k_bandpowers21_get.html'],
   ['Direct BK18 bandpower table (TXT; columns 2, 3 and 4 can be imported)','https://lambda.gsfc.nasa.gov/data/suborbital/BICEPK_2021/BK18_bandpowers_20210607.txt']
  ],
  method:'upper-limit'
 },
 stochastic:{
  title:{fa:'پس‌زمینهٔ تصادفی موج گرانشی — LVK',en:'Stochastic gravitational-wave background — LVK'},
  description:{
   fa:'جست‌وجوی LIGO–Virgo–KAGRA با داده‌های اجراهای O1 تا بخش گزارش‌شدهٔ O4 تا ۱ آوریل ۲۰۲۵، سیگنال زمینهٔ تصادفی کیهانی را پیدا نکرد و حدهای بالای وابسته به طیف گزارش کرد.',
   en:'The LIGO–Virgo–KAGRA search using runs O1 through the reported portion of O4 up to 1 April 2025 found no stochastic-background signal and reported spectrum-dependent upper limits.'
  },
  metrics:[
   {label:{fa:'طیف هم‌مقیاس؛ ΩGW در ۲۵ Hz',en:'Scale-invariant spectrum; ΩGW at 25 Hz'},value:2.8e-9,minus:0,plus:0,limit:true,unit:'95% credible upper limit',display:'≤ 2.8 × 10⁻⁹',group:'GW'},
   {label:{fa:'طیف با شاخص ۲/۳؛ ΩGW در ۲۵ Hz',en:'Spectral index 2/3; ΩGW at 25 Hz'},value:2.0e-9,minus:0,plus:0,limit:true,unit:'95% credible upper limit',display:'≤ 2.0 × 10⁻⁹',group:'GW'}
  ],
  conclusion:{
   fa:'این محدودیت‌ها در باند فرکانسی آشکارسازهای زمینی‌اند و مستقیم معادل محدودیت B-mode در CMB نیستند. برای آزمودن تورم، رشته‌های کیهانی یا گذار فازی باید طیف پیش‌بینی‌شدهٔ هر مدل را به فرکانس‌های قابل مشاهده منتقل کرد؛ این تبدیل در این صفحه محاسبه نمی‌شود.',
   en:'These limits apply in ground-based detector frequency bands and are not interchangeable with CMB B-mode limits. Testing inflation, cosmic strings or phase transitions requires each model’s predicted spectrum to be propagated into the observable band; this page does not calculate that transfer.'
  },
  links:[
   ['LVK updated isotropic-background limits (through April 2025)','https://dcc-llo.ligo.org/LIGO-P2600217/public'],
   ['LIGO Scientific Collaboration summary','https://ligo.org/science-summaries/o4bc1_stoch_isotropic/']
  ],
  method:'upper-limit'
 }
};
const MODEL_TESTS={
 lcdm:{
  fa:'مدل مرجع ΛCDM: داده‌های CMB و BAO محدودیت‌های اصلی چگالی‌ها و تاریخچهٔ انبساط را می‌دهند. این صفحه مقدارهای منتشرشده را نمایش می‌دهد، اما برازش مشترک CMB+BAO+ابرنواختر یا محاسبهٔ χ² را اجرا نمی‌کند.',
  en:'Baseline ΛCDM: CMB and BAO constrain densities and expansion history. This page shows published constraints but does not run a joint CMB+BAO+supernova fit or calculate χ².'
 },
 inflation:{
  fa:'تورم: مستقیم‌ترین آزمون‌های این فهرست، طیف قطبش B و حد r در CMB و نیز پس‌زمینهٔ موج گرانشی‌اند. برای مقایسهٔ کمی، شکل پتانسیل تورم و طیف تانسوری پیش‌بینی‌شده باید مشخص شود.',
  en:'Inflation: the most direct tests here are CMB B-mode polarization and the bound on r, plus gravitational-wave background limits. Quantitative comparison requires a specified inflation potential and predicted tensor spectrum.'
 },
 bounce:{
  fa:'جهان جهشی: باید یک مدل دینامیکی مشخص، طیف نوسان‌های آغازین و اثر جهش بر CMB/موج‌های گرانشی تعریف شود. منحنی آموزشی این صفحه چنین پیش‌بینی‌هایی ندارد؛ پس فعلاً امتیاز سازگاری عددی معتبر قابل گزارش نیست.',
  en:'Bouncing universe: a specific dynamical model, primordial fluctuation spectrum and bounce imprint on the CMB/gravitational waves are required. The schematic curve here supplies none of these, so no valid numerical compatibility score is available yet.'
 },
 cyclic:{
  fa:'کیهان چرخه‌ای: مدل‌های چرخه‌ای جزئیات فیزیکی متفاوت دارند و باید جداگانه پیش‌بینی رصدی تولید کنند. داده‌های BAO، طیف CMB و جست‌وجوی موج گرانشی ابزار آزمون‌اند، نه شاهد تأیید یا رد همهٔ مدل‌های چرخه‌ای به‌طور کلی.',
  en:'Cyclic cosmology: cyclic models have different physical details and must make distinct observational predictions. BAO, the CMB spectrum and gravitational-wave searches are tests, not universal proof or disproof of all cyclic models.'
 },
 emergent:{
  fa:'جهان برآمده از حالت شبه‌ایستا: برای آزمودن آن لازم است مدت و پایداری مرحلهٔ پیشین و امضای آن در نوسان‌های CMB/تاریخچهٔ انبساط مشخص شود. انتخاب این گزینه در حال حاضر فقط برچسب مدل مفهومی است.',
  en:'Emergent quasi-static universe: its pre-expansion duration and stability, plus signatures in CMB perturbations or expansion history, must be specified. Selecting this option currently labels a conceptual model only.'
 }
};
function textFor(obj){return obj&&obj[lang]!==undefined?obj[lang]:String(obj||'')}
function getRows(key){if(key==='imported')return uploaded.map((p,i)=>({label:{fa:'ردیف '+(i+1),en:'Row '+(i+1)},value:p.y,minus:p.sigma,plus:p.sigma,unit:'imported table units',display:p.yText+(p.sigma!==null?' ± '+p.sigmaText:''),group:'imported',x:p.x}));return (EVIDENCE[key]||EVIDENCE.cmb).metrics}
function fmt(n){if(!Number.isFinite(n))return '—';if(Math.abs(n)>=1000||Math.abs(n)<.001&&n!==0)return n.toExponential(2);return Number(n.toPrecision(5)).toString()}
function renderMetrics(key){
 const host=$('evidenceMetrics');if(!host)return;host.innerHTML='';
 const data=EVIDENCE[key]||EVIDENCE.cmb;
 (key==='imported'?getRows(key).slice(0,6):data.metrics).forEach(m=>{
  const el=document.createElement('div');el.className='metric';
  const lab=document.createElement('span');lab.textContent=textFor(m.label);
  const val=document.createElement('strong');val.textContent=m.display||fmt(m.value);
  const unit=document.createElement('span');unit.textContent=m.unit||'';
  el.append(lab,val,unit);host.appendChild(el);
 });
}
function plotIntervals(key){
 const c=$('evidenceChart');if(!c)return;const ctx=c.getContext('2d');const W=c.width,H=c.height;ctx.clearRect(0,0,W,H);
 ctx.fillStyle='#06111f';ctx.fillRect(0,0,W,H);ctx.font='14px system-ui';ctx.fillStyle='#b9cde3';
 if(key==='imported'){plotImported(ctx,W,H);return}
 const rows=getRows(key);const top=38,rowH=Math.max(50,Math.floor((H-80)/rows.length)),left=240,right=W-30;
 ctx.font='13px system-ui';ctx.fillStyle='#a7bbd8';ctx.fillText(lang==='fa'?'بازهٔ عدم‌قطعیت منتشرشده':'Published uncertainty interval',18,22);
 rows.forEach((r,i)=>{
  const y=top+i*rowH+Math.floor(rowH*.45);
  ctx.strokeStyle='#1b3149';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(left,y);ctx.lineTo(right,y);ctx.stroke();
  ctx.fillStyle='#d2e2f4';ctx.font='13px system-ui';const label=textFor(r.label);ctx.fillText(label.slice(0,35),15,y-7);
  let min,max,lo,hi;
  if(r.limit){min=0;max=r.value*2.1;lo=0;hi=r.value}
  else{
   const spread=Math.max(r.minus||0,r.plus||0,Math.abs(r.value)*.01,1e-12);
   min=r.value-(r.minus||spread)*2.6;max=r.value+(r.plus||spread)*2.6;
   if(r.group==='H0'&&key==='expansion'){min=55;max=90;}
   lo=r.value-(r.minus||0);hi=r.value+(r.plus||0);
  }
  const x=v=>left+Math.max(0,Math.min(1,(v-min)/(max-min)))*(right-left);
  ctx.strokeStyle='#29425e';ctx.lineWidth=1;for(let t=0;t<=4;t++){const xt=left+(right-left)*t/4;ctx.beginPath();ctx.moveTo(xt,y-12);ctx.lineTo(xt,y+12);ctx.stroke()}
  ctx.strokeStyle=r.limit?'#f7cb7b':'#71e2f3';ctx.lineWidth=4;ctx.beginPath();ctx.moveTo(x(lo),y);ctx.lineTo(x(hi),y);ctx.stroke();
  ctx.fillStyle=r.limit?'#f7cb7b':'#71e2f3';ctx.beginPath();ctx.arc(x(r.value),y,5,0,Math.PI*2);ctx.fill();
  ctx.fillStyle='#829ab6';ctx.font='10px system-ui';ctx.fillText(fmt(min),left,y+24);ctx.fillText(fmt(max),right-38,y+24);
 });
 ctx.font='11px system-ui';ctx.fillStyle='#8fa7c4';
 const footer=lang==='fa'?'محورها برای هر ردیف جداگانه‌اند، مگر مقایسهٔ H₀؛ واحد و مقدار دقیق در کارت بالا آمده است.':'Axes are row-specific except for the H₀ comparison; exact values and units are shown in the cards above.';
 ctx.fillText(footer.slice(0,125),15,H-8);
}
function plotImported(ctx,W,H){
 const data=uploaded;if(!data.length){ctx.fillStyle='#9db4d0';ctx.fillText(lang==='fa'?'برای دیدن نقاط، یک جدول عددی وارد کن.':'Import a numeric table to plot data points.',24,55);return}
 const L=72,R=25,T=25,B=50,pw=W-L-R,ph=H-T-B;
 const xMin=Math.min(...data.map(p=>p.x)),xMax=Math.max(...data.map(p=>p.x));
 const yMin=Math.min(...data.map(p=>p.y-(p.sigma||0))),yMax=Math.max(...data.map(p=>p.y+(p.sigma||0)));
 const xd=(xMax-xMin)||1,yd=(yMax-yMin)||1;
 const x=v=>L+(v-xMin)/xd*pw,y=v=>T+ph-(v-yMin)/yd*ph;
 ctx.strokeStyle='#223b57';ctx.lineWidth=1;ctx.fillStyle='#93aac5';ctx.font='11px system-ui';
 for(let i=0;i<=4;i++){const yy=T+ph*i/4;ctx.beginPath();ctx.moveTo(L,yy);ctx.lineTo(W-R,yy);ctx.stroke();ctx.fillText(fmt(yMax-yd*i/4),5,yy+4)}
 for(let i=0;i<=4;i++){const xx=L+pw*i/4;ctx.beginPath();ctx.moveTo(xx,T);ctx.lineTo(xx,T+ph);ctx.stroke();ctx.fillText(fmt(xMin+xd*i/4),xx-14,H-24)}
 ctx.strokeStyle='#71e2f3';ctx.fillStyle='#71e2f3';ctx.lineWidth=1.5;
 data.forEach(p=>{const xx=x(p.x),yy=y(p.y);if(p.sigma!==null&&Number.isFinite(p.sigma)){ctx.beginPath();ctx.moveTo(xx,y(p.y-p.sigma));ctx.lineTo(xx,y(p.y+p.sigma));ctx.moveTo(xx-4,y(p.y-p.sigma));ctx.lineTo(xx+4,y(p.y-p.sigma));ctx.moveTo(xx-4,y(p.y+p.sigma));ctx.lineTo(xx+4,y(p.y+p.sigma));ctx.stroke()}ctx.beginPath();ctx.arc(xx,yy,2.7,0,Math.PI*2);ctx.fill()});
 ctx.fillStyle='#9db4d0';ctx.fillText((lang==='fa'?'ستون X: ':'X column: ')+$('xColumn').value+'   '+(lang==='fa'?'ستون Y: ':'Y column: ')+$('yColumn').value,12,16);
}
function renderLinks(key){
 const host=$('evidenceLinks');if(!host)return;host.innerHTML='';
 const links=key==='imported'?[['NASA LAMBDA — BK18 data products','https://lambda.gsfc.nasa.gov/product/bicepkeck/bicep2k_bandpowers21_get.html'],
 ['Direct BK18 bandpower table (TXT)','https://lambda.gsfc.nasa.gov/data/suborbital/BICEPK_2021/BK18_bandpowers_20210607.txt']]:((EVIDENCE[key]||EVIDENCE.cmb).links||[]);
 links.forEach(row=>{const p=document.createElement('p');p.className='small';const a=document.createElement('a');a.href=row[1];a.target='_blank';a.rel='noopener noreferrer';a.textContent=row[0];a.style.color='#83def0';p.appendChild(a);host.appendChild(p)});
}
function renderNarrative(key){
 const data=EVIDENCE[key]||EVIDENCE.cmb;
 $('evidenceIntro').textContent=key==='imported'
  ?(lang==='fa'?'جدول واردشده: '+uploadedName+' — نمودار نقاط خام با خطای σ اختیاری است؛ این داده‌ها هنوز به likelihood کیهان‌شناسی وصل نشده‌اند.':'Imported table: '+uploadedName+' — raw points with optional σ error bars are shown; these data are not yet connected to a cosmological likelihood.')
  :textFor(data.description);
 $('evidenceConclusion').textContent=key==='imported'
  ?(lang==='fa'?'این فقط نمایش دادهٔ واردشده است. برای آزمون مدل باید تعریف ستون‌ها، واحدها، کوواریانس، مدل نظری و likelihood مناسب مشخص شود.':'This is a visualization of imported data only. Model testing requires column definitions, units, covariance, a theoretical model and the appropriate likelihood.')
  :textFor(data.conclusion);
 const model=$('model').value, note=MODEL_TESTS[model]||MODEL_TESTS.lcdm;
 $('modelEvidenceNote').textContent=textFor(note);
}
function render(){
 const key=$('evidenceSource')?.value||'cmb';
 renderMetrics(key);renderNarrative(key);renderLinks(key);plotIntervals(key);
}
function setLanguage(next){
 lang=next==='en'?'en':'fa';
 if($('evidenceSource')){
  Array.from($('evidenceSource').options).forEach(o=>{
   const fa=o.getAttribute('data-fa'),en=o.getAttribute('data-en');
   if(fa&&en)o.textContent=lang==='fa'?fa:en;
  });
 }
 render();
}
function updateModel(){renderNarrative($('evidenceSource')?.value||'cmb')}
function parseNumber(value){
 const raw=String(value==null?'':value).trim();if(!raw)return null;const n=Number(raw.replace(/[dD]/,'e'));
 return Number.isFinite(n)?n:null;
}
function loadTable(){
 const file=$('observationFile')?.files?.[0];if(!file)return setStatus(lang==='fa'?'ابتدا فایل CSV، TSV یا TXT را انتخاب کن.':'Choose a CSV, TSV or TXT file first.');
 if(file.size>8*1024*1024)return setStatus(lang==='fa'?'فایل بزرگ‌تر از ۸ مگابایت است؛ برای گوشی فایل کوچک‌تر انتخاب کن.':'File exceeds 8 MB; choose a smaller file for mobile.');
 const reader=new FileReader();
 reader.onload=()=>{
  try{
   const lines=String(reader.result||'').split(/\r?\n/),records=[];
   for(const line of lines){
    const t=line.trim();if(!t||/^(#|!|\/\/)/.test(t))continue;
    const cells=t.split(/[,\t; ]+/).map(parseNumber);
    if(cells.filter(v=>v!==null).length<2)continue;
    records.push(cells);
   }
   if(records.length<2)throw new Error('not enough numeric rows');
   const xi=Math.max(0,Number($('xColumn').value)-1),yi=Math.max(0,Number($('yColumn').value)-1);
   const si=Number($('sigmaColumn').value)-1;
   const result=[];
   for(const row of records){const x=row[xi],y=row[yi],sigma=si>=0?row[si]:null;if(x===null||y===null||!Number.isFinite(x)||!Number.isFinite(y))continue;if(si>=0&&(sigma===null||!Number.isFinite(sigma)||sigma<0))continue;result.push({x,y,sigma:si<0?null:sigma,xText:fmt(x),yText:fmt(y),sigmaText:si<0?'':fmt(sigma)});}
   if(result.length<2)throw new Error('selected columns do not contain enough rows');
   uploaded=result.slice(0,5000);uploadedName=file.name;
   const select=$('evidenceSource');
   if(!Array.from(select.options).some(o=>o.value==='imported')){const o=document.createElement('option');o.value='imported';o.setAttribute('data-fa','جدول واردشده');o.setAttribute('data-en','Imported table');select.appendChild(o);}
   select.value='imported';setLanguage(lang);
   setStatus((lang==='fa'?'با موفقیت '+uploaded.length+' ردیف عددی خوانده شد.':'Successfully read '+uploaded.length+' numeric rows.')+' '+(lang==='fa'?'ترتیب ستون‌ها با شمارهٔ ستون‌های فایل تنظیم شود.':'Make sure the column numbers match the file.'));
  }catch(e){setStatus(lang==='fa'?'خواندن فایل ناموفق بود. سربرگ‌ها باید جدا از دادهٔ عددی باشند و شمارهٔ ستون‌ها را بررسی کن.':'Could not parse the file. Headers must be separate from numeric rows; check the selected column numbers.');}
 };
 reader.onerror=()=>setStatus(lang==='fa'?'خواندن فایل با خطا مواجه شد.':'File read failed.');
 reader.readAsText(file);
}
function setStatus(s){const e=$('observationStatus');if(e)e.textContent=s}
function init(){
 if(!$('evidenceSource'))return;
 lang=document.documentElement.lang==='en'?'en':'fa';
 $('evidenceSource').addEventListener('change',render);
 ['xColumn','yColumn','sigmaColumn'].forEach(id=>$(id).addEventListener('change',()=>{if(uploaded.length&&$('evidenceSource').value==='imported'){const f=$('observationFile')?.files?.[0];if(f)loadTable()}}));
 $('loadObservation').addEventListener('click',loadTable);
 const m=$('model');if(m)m.addEventListener('change',updateModel);
 setLanguage(lang);
}
window.CosmologyObservations={setLanguage,updateModel,render};
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();
