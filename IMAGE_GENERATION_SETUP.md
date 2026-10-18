# راه‌اندازی تولید تصویر هوش مصنوعی در PLANET

این افزودنی برای هر گونهٔ داخل شبیه‌سازی، بر اساس ژنوم دیجیتال، صفات محاسبه‌شده، زیستگاه و مرحلهٔ زمانی یک prompt می‌سازد و تصویر را از یک مدل مولد واقعی می‌گیرد. تصویر آماده‌ای از گونه‌ها داخل اپ بسته‌بندی نشده است.

## پیش‌نیازها

- یک حساب API برای مدل تولید تصویر با دسترسی و بودجهٔ فعال. اشتراک ChatGPT به‌تنهایی کلید یا اعتبار API نمی‌دهد.
- یک Cloudflare Worker یا سرویس backend معادل برای نگهداری کلید API. کلید ارائه‌دهنده را هرگز داخل JavaScript عمومی، GitHub Pages یا APK قرار نده.
- انتشار نسخهٔ این شاخه روی سایت/اپ؛ رابط به فایل `planet-image-generation.js` متصل شده است.

## استقرار با Cloudflare

### مسیر داشبورد (بدون نصب ابزار)

1. وارد Cloudflare Dashboard شو و بخش **Workers & Pages** را باز کن.
2. یک Worker جدید بساز؛ در ویرایشگر کد، محتوای `services/image-generation-worker/index.js` را جایگزین کد نمونه کن و Deploy بزن.
3. در Worker به **Settings → Variables and Secrets** برو و دو مقدار از نوع **Secret** اضافه کن:
   - `OPENAI_API_KEY`: کلید API ارائه‌دهندهٔ تصویر.
   - `PLANET_ACCESS_CODE`: یک رمز تصادفی و بلند که فقط خودت می‌دانی.
4. دو مقدار **Variable** اضافه کن:
   - `OPENAI_IMAGE_MODEL` = `gpt-image-2.5-flare`
   - `ALLOWED_ORIGINS` = `https://karafarin12800-del.github.io` (وب Worker، مبدأ WebView اندروید `https://appassets.androidplatform.net` نیز به فهرست پیش‌فرض مجاز اضافه شده است.)
5. دوباره Deploy کن. نشانی Worker معمولاً شبیه `https://نام-کارگر.نام-حساب.workers.dev` است.
6. در PLANET، کاتالوگ گونه‌ها را باز کن، روی **تولید تصویر هوش مصنوعی** بزن و از تنظیم سرویس، نشانی Worker و همان `PLANET_ACCESS_CODE` را وارد و ذخیره کن. کلید `OPENAI_API_KEY` را در اپ وارد نکن.
7. برای بررسی پیکربندی، نشانی `https://نشانی-Worker/health` را باز کن؛ فیلد `configured` باید `true` باشد.

در APK فعلی، صفحه با `WebViewAssetLoader` از مبدأ `https://appassets.androidplatform.net` بارگذاری می‌شود و Worker این مبدأ را در allowlist پیش‌فرض می‌پذیرد. فقط اگر با بررسی درخواست واقعی ثابت شد Origin برابر `null` است، متغیر `ALLOW_NULL_ORIGIN=true` را اضافه کن؛ بی‌دلیل آن را فعال نکن. برای توسعهٔ محلی، Originهای لازم را با فهرست جداشده با کاما به `ALLOWED_ORIGINS` اضافه کن.

### مسیر خط فرمان (اختیاری)

در پوشهٔ `services/image-generation-worker`:

```bash
npx wrangler login
npx wrangler secret put OPENAI_API_KEY
npx wrangler secret put PLANET_ACCESS_CODE
npx wrangler deploy
```

مقادیر مدل و Origin در `wrangler.toml` تعریف شده‌اند؛ برای تغییرشان همان فایل را ویرایش کن. Secrets را در فایل پیکربندی یا commit قرار نده.

## امنیت و هزینه

- Worker برای هر درخواست فقط یک تصویر مربع 1024×1024 با کیفیت medium درخواست می‌کند؛ مدل پیش‌فرض `gpt-image-2.5-flare` است و از طریق `OPENAI_IMAGE_MODEL` قابل تغییر است.
- Worker کد دسترسی را بررسی می‌کند، اندازهٔ prompt را محدود می‌کند، خطاهای provider را فیلتر می‌کند و یک محدودکنندهٔ نرخ بهترین‌تلاش در حافظهٔ هر isolate دارد.
- محدودکنندهٔ حافظه‌ای به‌تنهایی حفاظت سراسری تضمین‌شده نیست. قبل از استفادهٔ عمومی، در Cloudflare یک **Rate Limiting Rule** لبه‌ای برای مسیر Worker فعال کن، سقف هزینهٔ API بگذار و کلید را در صورت افشا rotate کن.
- اگر برنامه برای عموم منتشر شود، کد دسترسیِ ذخیره‌شده در مرورگر یک کنترل ساده است و جایگزین احراز هویت کاربر/سهمیه‌بندی سمت سرور نیست.
- تصویر تولیدی یک visualization خلاقانه است. ژنوم دیجیتال 168 bp در PLANET ژنوم زیستی واقعی نیست؛ حتی برای توالی مرجع واردشده، این ویژگی‌ها پیش‌بینی تأییدشدهٔ آناتومی محسوب نمی‌شوند.
- درخواست‌ها به ارائه‌دهندهٔ بیرونی فرستاده می‌شوند و نیاز به اینترنت دارند. قابلیت تولید تصویر بدون تنظیم backend به‌صورت خاموش یا آفلاین وانمود نمی‌کند که کار می‌کند.

## API Worker

- `GET /health` — بررسی وضعیت پیکربندی بدون افشای secretها.
- `POST /` یا `POST /generate` — بدنهٔ JSON شامل `prompt`؛ هدر `X-Planet-Access-Code` الزامی است. پاسخ شامل `imageBase64`، `mimeType` و `model` است.
- Origin وب‌سایت در حالت پیش‌فرض فقط `https://karafarin12800-del.github.io` است. Originهای دیگر را فقط در صورت نیاز به allowlist اضافه کن.
