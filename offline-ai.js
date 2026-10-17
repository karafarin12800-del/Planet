/* PLANET Offline Intelligence Engine
 * Deterministic, privacy-preserving expert system. Runs locally; makes no network requests.
 * It is not a generative LLM and never presents heuristic estimates as measured scientific probabilities.
 */
(function (root) {
  'use strict';

  const VERSION = '1.0.0';
  const MEMORY_KEY = 'planet-offline-ai-memory-v1';
  const MAX_MEMORY_TURNS = 8;
  const recentErrors = [];

  function normalize(value) {
    return String(value == null ? '' : value)
      .normalize('NFKC')
      .replace(/[يى]/g, 'ی').replace(/ك/g, 'ک')
      .replace(/[\u064B-\u065F\u0670\u0640]/g, '')
      .toLowerCase().trim();
  }
  function has(text, words) {
    return words.some(function (word) { return text.indexOf(normalize(word)) !== -1; });
  }
  function bullet(items) {
    return items.map(function (x) { return '• ' + x; }).join('\n');
  }
  function loadMemory() {
    try {
      const raw = root.localStorage && root.localStorage.getItem(MEMORY_KEY);
      const value = raw ? JSON.parse(raw) : [];
      return Array.isArray(value) ? value.slice(-MAX_MEMORY_TURNS) : [];
    } catch (_) { return []; }
  }
  function saveMemory(memory) {
    try {
      if (root.localStorage) root.localStorage.setItem(MEMORY_KEY, JSON.stringify(memory.slice(-MAX_MEMORY_TURNS)));
    } catch (_) {}
  }
  function remember(user, assistant) {
    const memory = loadMemory();
    memory.push({ user: String(user).slice(0, 700), assistant: String(assistant).slice(0, 1600), at: new Date().toISOString() });
    saveMemory(memory);
  }
  function getVisibleState() {
    const doc = root.document;
    const state = {
      timestamp: new Date().toISOString(),
      online: typeof root.navigator !== 'undefined' ? !!root.navigator.onLine : null,
      userAgent: typeof root.navigator !== 'undefined' ? String(root.navigator.userAgent || '').slice(0, 180) : 'unknown',
      viewport: null,
      scripts: { total: 0, failed: recentErrors.filter(function (e) { return e.type === 'resource'; }).length },
      errors: recentErrors.slice(-10),
      features: { dom: !!doc, genomeLab: false, aiUi: false, canvasCount: 0, webglLost: 0, localStorage: false, serviceWorker: false },
      elements: {}
    };
    if (!doc) return state;
    state.viewport = { width: root.innerWidth || 0, height: root.innerHeight || 0 };
    state.scripts.total = doc.scripts ? doc.scripts.length : 0;
    state.features.genomeLab = !!doc.getElementById('gp-genome-lab-script') && !!doc.getElementById('gpGenomeOverlay');
    state.features.aiUi = !!doc.getElementById('planet-ai-panel') && !!doc.getElementById('planet-ai-messages');
    state.features.canvasCount = doc.querySelectorAll ? doc.querySelectorAll('canvas').length : 0;
    if (doc.querySelectorAll) {
      Array.prototype.forEach.call(doc.querySelectorAll('canvas'), function (canvas) {
        try {
          if (canvas.isConnected && canvas.dataset && canvas.dataset.webglContextLost === 'true') state.features.webglLost++;
        } catch (_) {}
      });
    }
    try {
      const key = '__planet_offline_ai_probe__';
      root.localStorage.setItem(key, '1'); root.localStorage.removeItem(key);
      state.features.localStorage = true;
    } catch (_) { state.features.localStorage = false; }
    state.features.serviceWorker = !!(root.navigator && root.navigator.serviceWorker);
    ['planet-ai-panel','planet-ai-launch','gpGenomeOverlay','gpFetch','gpLoadFile','gpLoadPaste','gpRun'].forEach(function (id) {
      state.elements[id] = !!doc.getElementById(id);
    });
    return state;
  }

  function healthReport(context) {
    const state = getVisibleState();
    const ctxErrors = context && Array.isArray(context.recentErrors) ? context.recentErrors : [];
    const allErrors = ctxErrors.concat(state.errors).slice(-12);
    const findings = [];
    const actions = [];
    let score = 100;

    if (allErrors.length) {
      score -= Math.min(45, allErrors.length * 7);
      findings.push('ثبت خطای زمان اجرا: ' + allErrors.length + ' مورد از گزارش‌های در دسترس.');
      allErrors.slice(-4).forEach(function (e) {
        const msg = String(e.message || e.reason || e.type || 'خطای نامشخص').slice(0, 180);
        actions.push('خطای ثبت‌شده را بررسی کن: ' + msg);
      });
    } else {
      findings.push('در سوابق خطای محلیِ قابل دسترس، خطای ثبت‌شده‌ای دیده نشد؛ این به معنی بی‌خطا بودن کامل برنامه نیست.');
    }
    if (state.features.dom && !state.features.aiUi) {
      score -= 12; findings.push('بخشی از رابط دستیار در DOM پیدا نشد.');
      actions.push('صفحه را یک‌بار تازه‌سازی کن؛ اگر مشکل باقی ماند، فایل index.html و بارگذاری اسکریپت دستیار را بررسی کن.');
    }
    if (state.features.dom && !state.features.genomeLab) {
      score -= 8; findings.push('اسکریپت یا پنجرهٔ آزمایشگاه ژنوم پیدا نشد.');
      actions.push('بررسی کن بلوک gp-genome-lab-script و gpGenomeOverlay در نسخهٔ منتشرشده حاضر باشند.');
    }
    if (!state.features.localStorage) {
      score -= 8; findings.push('ذخیره‌سازی محلی در دسترس نیست یا مرورگر آن را مسدود کرده است.');
      actions.push('حالت خصوصی مرورگر و محدودیت فضای ذخیره‌سازی را بررسی کن؛ قابلیت‌های حافظهٔ محلی ممکن است محدود شوند.');
    }
    if (state.features.webglLost > 0) {
      score -= 25; findings.push('یک نشانه از از دست‌رفتن زمینهٔ WebGL در صفحه پیدا شد.');
      actions.push('صفحه را تازه‌سازی کن، تب‌های سنگین دیگر را ببند و در صورت تکرار، حافظهٔ دستگاه و خطاهای گرافیکی را بررسی کن.');
    }
    if (state.features.canvasCount === 0 && state.features.dom) {
      findings.push('در حال حاضر عنصری از نوع canvas دیده نمی‌شود؛ شاید نمای گرافیکی هنوز ساخته نشده یا در این صفحه وجود ندارد.');
    }
    if (state.online === false) findings.push('دستگاه آفلاین است؛ موتور تحلیل محلی همچنان باید کار کند.');
    else findings.push('وضعیت اتصال شبکه برای موتور محلی اهمیتی ندارد؛ این گزارش به سرور ارسال نمی‌شود.');
    if (!actions.length) actions.push('برای بررسی کامل‌تر، عملیات مشکل‌دار را دوباره اجرا کن و زمان، دکمهٔ فشرده‌شده و متن خطای دقیق را نگه دار.');
    score = Math.max(0, Math.min(100, score));

    return 'گزارش سلامت آفلاین PLANET v' + VERSION + '\n' +
      'امتیاز شاخص سلامت رابط: ' + score + '/100 (ابتدایی و مبتنی بر قواعد؛ نه آزمون جامع نرم‌افزار)\n' +
      'زمان: ' + state.timestamp + '\n' +
      'شبکه: ' + (state.online === false ? 'آفلاین' : state.online === true ? 'متصل/گزارش‌شده' : 'نامشخص') + '\n\n' +
      'یافته‌ها:\n' + bullet(findings) + '\n\n' +
      'اقدامات پیشنهادی:\n' + bullet(actions.slice(0, 7)) + '\n\n' +
      'دامنهٔ بررسی: ' + state.scripts.total + ' اسکریپت در صفحه؛ ' + state.features.canvasCount + ' بوم canvas؛ رابط دستیار ' +
      (state.features.aiUi ? 'یافت شد' : 'یافت نشد') + '؛ آزمایشگاه ژنوم ' +
      (state.features.genomeLab ? 'یافت شد' : 'یافت نشد') + '.\n' +
      'محدودیت: موتور محلی فقط DOM، خطاهای ثبت‌شده و چند نشانهٔ قابل مشاهده را بررسی می‌کند؛ به پشتهٔ کامل خطای سیستم‌عامل یا تمام متغیرهای درونی شبیه‌سازی دسترسی ندارد.';
  }

  function suggestions(context) {
    const state = getVisibleState();
    const errors = context && Array.isArray(context.recentErrors) ? context.recentErrors : [];
    const result = [];
    if (errors.length || state.errors.length) {
      result.push('اولویت خیلی بالا — خطاهای ثبت‌شده را بر اساس زمان و محل وقوع گروه‌بندی کن؛ ابتدا خطاهای تکرارشونده را رفع و پس از هر تغییر آزمون بازگشتی اجرا کن.');
    }
    if (!state.features.localStorage) {
      result.push('اولویت بالا — ذخیره‌سازی را با مدیریت خطای quota و پیام روشن برای کاربر ایمن کن؛ برای تصمیم‌های علمی مهم فقط به حافظهٔ محلی متکی نباش.');
    }
    result.push('اولویت بالا — برای ورود ژنوم، اعتبارسنجی فایل و توالی را جدا از تحلیل زیستی نگه دار؛ فرمت، طول، نویز و رکوردهای ناشناخته را پیش از اجرای مدل گزارش کن.');
    result.push('اولویت بالا — خروجی‌های تکاملی را با seed تصادفی قابل ثبت، چند اجرای تکراری، بازهٔ عدم‌قطعیت و تعریف روشن فرضیات ارائه کن.');
    result.push('اولویت متوسط — هر هشدار را به سه بخش «مشاهدهٔ واقعی»، «تفسیر محتمل» و «آزمایش تأییدی» تقسیم کن تا احتمال با واقعیت اشتباه نشود.');
    result.push('اولویت متوسط — برای هر تغییر مهم، آزمون خودکار کوتاه بنویس: ورودی معتبر، فایل خراب، ژنوم خالی، قطع اینترنت، ذخیره‌سازی مسدود و صفحه با حافظهٔ محدود.');
    result.push('اولویت متوسط — در صفحهٔ حریم خصوصی، روشن کن که گفتگو و گزارش‌های محلی ذخیره می‌شوند یا نه؛ امکان پاک‌کردن تاریخچه را همیشه نگه دار.');
    return 'پیشنهادهای بهبود آفلاین PLANET\n\n' + bullet(result.slice(0, 7)) +
      '\n\nاین پیشنهادها از روی قواعد عمومیِ ایمنی و معماری تولید شده‌اند؛ برای اعلام اینکه یک مورد واقعاً ایراد برنامه است، باید شواهد قابل مشاهده یا آزمون بازتولیدپذیر داشته باشیم.';
  }

  function genomeAdvice(t) {
    if (has(t, ['gcf_', 'gca_', 'nc_', 'ncbi', 'ena', 'accession', 'شناسه مرجع', 'شناسه ژنوم', 'دریافت ژنوم', 'پایگاه داده'])) {
      return 'راهنمای شناسه و پایگاه ژنومی در حالت آفلاین\n\n' +
        '• شناسهٔ accession به‌تنهایی توالی کامل را در دستگاه ایجاد نمی‌کند؛ برای واکشی از NCBI/ENA معمولاً اینترنت لازم است.\n' +
        '• اگر توالی یا فایل همان شناسه قبلاً روی دستگاه ذخیره نشده باشد، موتور آفلاین باید صادقانه بگوید داده در دسترس نیست، نه اینکه ژنوم را حدس بزند.\n' +
        '• برای استفاده بدون اینترنت، فایل FASTA یا GenBank را از قبل وارد کن. نام accession، منبع، نسخهٔ رکورد و تاریخ دریافت را نگه دار.\n' +
        '• پس از ورود، طول توالی، نویسه‌های مجاز، تعداد رکوردها و در صورت وجود annotation را بررسی کن.\n\n' +
        'محدودیت علمی: آمار پایه‌ای توالی به‌تنهایی عملکرد ژن، فنوتیپ یا رفتار جاندار را ثابت نمی‌کند.';
    }
    if (has(t, ['gc', 'درصد جی سی', 'درصد gc', 'ترکیب باز', 'درصد بازها'])) {
      return 'تحلیل GC به‌صورت آفلاین\n\n' +
        'درصد GC از رابطهٔ 100 × (تعداد G + تعداد C) / تعداد بازهای معتبر محاسبه می‌شود. باید مشخص شود N و حروف مبهم از مخرج حذف می‌شوند یا جداگانه گزارش می‌شوند؛ بهتر است هر دو تعداد معتبر و تعداد مبهم نمایش داده شوند.\n' +
        'نسبت GC به‌تنهایی برای تعیین گونه یا پیش‌بینی کارکرد زیستی کافی نیست. برای مقایسه، از توالی‌های هم‌نوع، نسخهٔ مشخص و روش یکسان استفاده کن.';
    }
    if (has(t, ['n50', 'ان ۵۰', 'ان50', 'پیوستگی اسمبلی'])) {
      return 'تفسیر N50\n\nN50 طولی است که وقتی قطعات اسمبلی از بلند به کوتاه مرتب شوند، جمع طول قطعاتی که به آن طول یا بلندترند دست‌کم به ۵۰٪ طول کل اسمبلی برسد. N50 بزرگ‌تر گاهی نشانهٔ پیوستگی بیشتر است، اما صحت توالی یا کامل بودن زیستی را به‌تنهایی نشان نمی‌دهد.';
    }
    if (has(t, ['cds', 'کدکننده', 'ژن کدکننده', 'کدون', 'ترجمه ژن'])) {
      return 'تحلیل CDS و کدون‌ها\n\nبرای ترجمهٔ قابل اتکا باید جدول کد ژنتیکی مناسب، قاب خوانش، جهت رشته، کدون آغاز/پایان و استثناهای annotation مشخص باشند. حدس CDS صرفاً با جست‌وجوی ATG تا کدون پایان ممکن است ژن‌های واقعی را از دست بدهد یا ORFهای تصادفی گزارش کند؛ در گزارش، CDS پیش‌بینی‌شده را از CDS ثبت‌شده در GenBank جدا نگه دار.';
    }
    if (has(t, ['جهش', 'mutation', 'نوترکیبی', 'انتخاب طبیعی', 'رانش ژنتیکی'])) {
      return 'راهنمای مدل جهش و انتخاب\n\nجهش، نوترکیبی، انتخاب و رانش ژنتیکی سازوکارهای متفاوت‌اند و باید پارامترهای جدا داشته باشند. هر نتیجه به اندازهٔ جمعیت، نرخ جهش، وراثت‌پذیری، فشار انتخابی و تعداد تکرار وابسته است. یک اجرای تصادفی شاهد کافی نیست؛ اجراها را با seedهای ثبت‌شده تکرار و میانگین و دامنهٔ نتایج را گزارش کن.';
    }
    return 'راهنمای ژنوم آفلاین\n\nموتور محلی می‌تواند منطق ورود فایل، اعتبارسنجی حروف، آمار توالی و تفسیر مفاهیم را توضیح دهد. برای تحلیل دقیق یک ژنوم مشخص، فایل یا توالی باید در همین دستگاه در دسترس باشد.\n\n' +
      bullet(['FASTA: توالی خام و سربرگ رکورد.', 'GenBank: توالی به‌همراه annotation در صورت وجود.', 'دادهٔ مبهم (N و IUPAC) باید جدا گزارش شود، نه اینکه خودکار به A/C/G/T تبدیل شود.', 'آمار توالی با اثبات عملکرد ژن یا بازسازی کامل زیست‌شیمی یکسان نیست.']);
  }

  function scienceAdvice(t) {
    if (has(t, ['احتمال', 'چقدر احتمال', 'شانس', 'risk', 'پیش بینی', 'پیش‌بینی'])) {
      return 'دربارهٔ احتمال و پیش‌بینی\n\nبرای ارائهٔ یک احتمال عددی معتبر، باید رویداد، بازهٔ زمانی، پارامترهای مدل و دادهٔ کالیبراسیون معلوم باشند. بدون این موارد عدد دقیق قابل دفاع نیست.\n\n' +
        bullet(['تعریف کن چه رویدادی شمرده می‌شود (مثلاً انقراض در ۱۰۰ نسل).', 'شرایط اولیه و پارامترهای هر اجرا را ثبت کن.', 'اجرای تصادفی را بارها با seedهای مختلف تکرار کن.', 'احتمال تجربی را برابر تعداد اجراهای رخداد / کل اجراها گزارش کن و فاصلهٔ عدم‌قطعیت را نیز بیاور.', 'این عدد فقط تحت فرضیات مدل معتبر است و لزوماً احتمال وقوع در طبیعت نیست.']);
    }
    if (has(t, ['تکامل', 'evolution', 'انتخاب طبیعی', 'گونه زایی', 'گونه‌زایی', 'انقراض'])) {
      return 'راهنمای علمی شبیه‌سازی تکامل\n\nدر PLANET باید ویژگی‌های مدل‌شده را از زیست‌شناسی واقعی جدا کنیم. برای تکامل دیجیتال، وراثت، تغییر ژنتیکی، تنوع صفات، موفقیت متفاوت در بقا/تولیدمثل و محدودیت محیط باید تعریف و قابل ردیابی باشند.\n\n' +
        bullet(['تغییرات جمعیت و صفات را در طول نسل ثبت کن.', 'یک آزمایش کنترل با خاموش‌کردن انتخاب یا جهش اجرا کن.', 'چند تکرار با seed ثابت و متغیر مقایسه کن.', 'انقراض را طبق تعریف کمی مشخص ثبت کن.', 'نتایج را آموزشی/مدلی برچسب بزن؛ آن‌ها اثبات پیدایش حیات یا پیش‌بینی قطعی تکامل طبیعی نیستند.']);
    }
    if (has(t, ['هوش', 'آگاهی', 'فکر', 'یادگیری', 'موجود زنده', 'موجودات'])) {
      return 'دربارهٔ هوش و موجودات دیجیتال\n\nیک عامل دیجیتال می‌تواند حسگرهای ساده، حافظه، سیاست انتخاب عمل و یادگیری از پاداش داشته باشد. این رفتار به‌خودی‌خود نشان‌دهندهٔ آگاهی یا تجربهٔ ذهنی نیست.\n\nبرای ارزیابی بهتر، تعریف قابل سنجش انتخاب کن: عملکرد در وظیفهٔ تازه، تعمیم به محیط جدید، پایداری تصمیم، هزینهٔ منابع و توان سازگاری. امتیاز داخلی مدل را با «هوش واقعی» یا آگاهی برابر ندان.';
    }
    if (has(t, ['زمین', 'سیاره', 'خورشید', 'منظومه', 'مدار', 'روز شمار', 'سال شمار'])) {
      return 'راهنمای مدل سیاره‌ای\n\nبرای ارزیابی شبیه‌سازی سیاره، مشخص کن کدام بخش فیزیکی است و کدام بخش دیداری/آموزشی. مقیاس زمانی شتاب‌داده‌شده، داده‌های تقریبی و نمای بصری را با زمان واقعی یا محاسبهٔ نجومی دقیق یکی ندان.\n\n' +
        bullet(['واحدها را صریح نگه دار: ثانیهٔ شبیه‌سازی، روز، سال و زمان نجومی.', 'برای مدارها و چرخش، پارامترها و منبع داده را ثبت کن.', 'در برابر تغییر timestep آزمون پایداری انجام بده.', 'حدود دقت و فرضیات هر مدل را کنار نتایج نشان بده.']);
    }
    return '';
  }

  function diagnose(t, context) {
    const ctx = context || {};
    const errors = Array.isArray(ctx.recentErrors) ? ctx.recentErrors : [];
    const lines = [];
    if (errors.length) {
      lines.push('در گزارش محلی ' + errors.length + ' رخداد خطا وجود دارد:');
      errors.slice(-5).forEach(function (e, i) {
        lines.push((i + 1) + ') ' + String(e.message || e.reason || e.type || 'خطای ثبت‌شده').slice(0, 220) +
          (e.line ? ' — خط ' + e.line : '') + (e.source ? ' — فایل ' + e.source : ''));
      });
      lines.push('اقدام: ابتدا اولین خطای زمانی را بررسی کن؛ خطاهای بعدی ممکن است پیامد همان خطای اول باشند. یک تغییر انجام بده، دوباره همان مرحله را اجرا کن و نتیجه را مقایسه کن.');
    } else {
      lines.push('در گزارش ارسالی خطای ثبت‌شده‌ای موجود نیست. این به‌تنهایی ثابت نمی‌کند برنامه سالم است؛ ممکن است رخداد پیش از ثبت گزارش یا داخل WebView/سیستم رخ داده باشد.');
    }
    lines.push('برای عیب‌یابی دقیق‌تر، مرحلهٔ بازتولید، دکمهٔ فشرده‌شده، متن دقیق خطا و اینکه مشکل بعد از تازه‌سازی باقی می‌ماند یا نه را ثبت کن.');
    if (has(t, ['دکمه', 'لمس', 'کلیک', 'باز نمیشود', 'باز نمی‌شود', 'ناپدید', 'میپره', 'می پرد', 'صفحه سفید', 'سفید'])) {
      lines.push('برای رابط: شناسهٔ عنصر را در DOM بررسی کن، listener دوباره ثبت نشود، رویداد pointer/click دوبار اجرا نشود و لایه‌بندی z-index/position با transform والدها تداخل نداشته باشد.');
    }
    if (has(t, ['کند', 'لگ', 'هنگ', 'کرش', 'crash', 'حافظه', 'گرافیک', 'webgl'])) {
      lines.push('برای عملکرد: تعداد موجودات/ذرات، حافظهٔ مدل و تعداد فراخوانی‌های هر فریم را اندازه بگیر؛ ابتدا با تعداد کمتر، دستگاه سرد/گرم و چند اجرای تکراری مقایسه کن.');
    }
    return 'تحلیل خطای آفلاین PLANET\n\n' + bullet(lines) +
      '\n\nسطح اطمینان: متوسط برای راهنمای عمومی؛ علت نهایی بدون خطا و بازتولید معتبر قطعی اعلام نمی‌شود.';
  }

  function respond(message, context) {
    const raw = String(message == null ? '' : message).slice(0, 2000);
    const t = normalize(raw);
    let answer = '';
    let category = 'general';
    if (!t) answer = 'پیام خالی است. دربارهٔ خطای برنامه، شبیه‌سازی سیاره، احتمالات تکامل یا آزمایشگاه ژنوم سؤال کن.';
    else if (has(t, ['گزارش سلامت', 'بررسی سلامت', 'سلامت برنامه', 'health check', 'تشخیص سلامت'])) {
      category = 'diagnostics'; answer = healthReport(context);
    } else if (has(t, ['پیشنهاد بهبود', 'پیشنهاد بده', 'چه چیزی را بهتر', 'چطور بهتر', 'بهبود برنامه', 'پیشنهادات'])) {
      category = 'suggestions'; answer = suggestions(context);
    } else if (has(t, ['خطا', 'ارور', 'خراب', 'کار نمیکند', 'کار نمی‌کند', 'مشکل', 'کرش', 'crash', 'هنگ', 'گیر', 'سفید', 'باز نمیشود', 'باز نمی‌شود', 'پرید', 'میپره', 'می‌پره', 'دکمه', 'لمس', 'کلیک'])) {
      category = 'diagnosis'; answer = diagnose(t, context);
    } else if (has(t, ['ژنوم', 'genome', 'fasta', 'genbank', 'accession', 'ncbi', 'ena', 'gcf_', 'gca_', 'nc_', 'کدون', 'cds', 'جهش', 'mutation', 'gc%', 'n50', 'پایگاه داده'])) {
      category = 'genome'; answer = genomeAdvice(t);
    } else {
      answer = scienceAdvice(t);
      if (answer) category = 'science';
    }
    if (!answer && has(t, ['سلام', 'درود', 'hi', 'hello', 'خوبی'])) {
      category = 'greeting';
      answer = 'سلام! من موتور هوشمند آفلاین PLANET هستم؛ بدون اینترنت هم کار می‌کنم و پیام تو را به سرور نمی‌فرستم.\n\n' +
        bullet(['بررسی سلامت رابط و خطاهای ثبت‌شده', 'راهنمای ژنوم، FASTA/GenBank و محدودیت‌های accession آفلاین', 'تحلیل علمی تکامل، جهش و احتمال‌ها', 'پیشنهادهای قابل‌آزمایش برای بهبود برنامه']) +
        '\n\nمن یک موتور تخصصی مبتنی بر قواعد و دانش داخلی هستم، نه مدل زبانی بزرگ؛ برای پرسش‌های ناشناخته ممکن است پاسخ محدود باشد.';
    }
    if (!answer && has(t, ['حافظه', 'یادت هست', 'گفتگو', 'گفت‌وگو', 'پاک کن'])) {
      category = 'privacy';
      const mem = loadMemory();
      answer = 'حافظهٔ گفت‌وگوی محلی\n\nدر این دستگاه ' + mem.length + ' نوبت اخیر قابل ذخیره است. این حافظه در localStorage مرورگر/برنامه نگهداری می‌شود و برای این موتور به سرور ارسال نمی‌شود.\nبرای پاک‌کردن آن، از تنظیمات دستیار گزینهٔ پاک‌سازی حافظه را به کار ببر.';
    }
    if (!answer) {
      category = 'general';
      answer = 'من در حالت کاملاً آفلاین، بر پایهٔ دانش و قواعد تخصصی داخلی پاسخ می‌دهم. برای جلوگیری از حدس نادرست، پرسش‌های خیلی کلی را به موضوع مشخص‌تری محدود می‌کنم.\n\n' +
        'می‌توانم در این حوزه‌ها کمک کنم:\n' +
        bullet(['تشخیص خطاهای ثبت‌شده و بررسی سلامت اجزای رابط', 'تحلیل مفاهیم ژنوم، GC، N50، CDS و دریافت accession', 'تکامل دیجیتال، جهش، انتخاب طبیعی، انقراض و عدم‌قطعیت', 'پیشنهادهای فنی و علمی با روش آزمون']) +
        '\n\nاگر خطایی داری، بگو دقیقاً چه کاری انجام دادی و چه چیزی دیدی.';
    }
    remember(raw, answer);
    return { text: answer, category: category, confidence: category === 'general' ? 'limited' : 'rule-based', offline: true, version: VERSION };
  }

  function clearMemory() {
    try { if (root.localStorage) root.localStorage.removeItem(MEMORY_KEY); } catch (_) {}
    return true;
  }
  function getMemory() { return loadMemory(); }
  function exportHealthReport(context) {
    const state = getVisibleState();
    return {
      product: 'PLANET Offline Intelligence Engine',
      version: VERSION,
      generatedAt: new Date().toISOString(),
      privacy: 'Generated locally. No network request was made.',
      app: state,
      userContext: context || null,
      memoryTurns: loadMemory().length,
      limitations: ['Heuristic diagnostic; not a full automated test suite.', 'Does not inspect native Android system logs.', 'No genomic sequence is added to this report.']
    };
  }
  function reportResourceError(event) {
    if (recentErrors.length >= 20) recentErrors.shift();
    recentErrors.push({ type: 'resource', message: 'resource failed: ' + String(event && event.target && (event.target.src || event.target.href) || 'unknown').split('/').pop(), time: new Date().toISOString() });
  }

  const api = {
    version: VERSION,
    respond: respond,
    healthReport: healthReport,
    suggestions: suggestions,
    getVisibleState: getVisibleState,
    exportHealthReport: exportHealthReport,
    clearMemory: clearMemory,
    getMemory: getMemory,
    reportResourceError: reportResourceError,
    selfTest: function () {
      const tests = [
        ['greeting', respond('سلام').category === 'greeting'],
        ['offline genomics', /آفلاین/.test(respond('شناسه NC_000913.3 و ژنوم').text)],
        ['probability caveat', /احتمال عددی معتبر/.test(respond('احتمال انقراض چیست').text)],
        ['local health', /گزارش سلامت آفلاین/.test(respond('بررسی سلامت برنامه').text)],
        ['suggestions', /پیشنهادهای بهبود/.test(respond('پیشنهاد بهبود').text)],
        ['no network claim', respond('اینترنت ندارم').offline === true]
      ];
      return { ok: tests.every(function (t) { return t[1]; }), tests: tests.map(function (t) { return { name: t[0], passed: t[1] }; }) };
    }
  };
  root.PlanetOfflineAI = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (root.addEventListener) {
    root.addEventListener('error', function (event) {
      if (event && event.target && (event.target.tagName === 'SCRIPT' || event.target.tagName === 'LINK')) reportResourceError(event);
    }, true);
    root.addEventListener('error', function (event) {
      if (!event || !event.message) return;
      if (recentErrors.length >= 20) recentErrors.shift();
      recentErrors.push({ type: 'javascript', message: String(event.message).slice(0, 250), source: String(event.filename || '').split('/').pop(), line: event.lineno || 0, time: new Date().toISOString() });
    });
    root.addEventListener('unhandledrejection', function (event) {
      if (recentErrors.length >= 20) recentErrors.shift();
      recentErrors.push({ type: 'promise', message: String(event && event.reason && (event.reason.message || event.reason) || 'Unhandled promise rejection').slice(0, 250), time: new Date().toISOString() });
    });
  }
})(typeof window !== 'undefined' ? window : globalThis);
