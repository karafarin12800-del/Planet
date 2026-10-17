/**
 * PLANET OpenAI assistant Worker
 * Deploy as a Cloudflare Worker. Add OPENAI_API_KEY as a Secret.
 * Optional variables: OPENAI_MODEL, ALLOWED_ORIGIN.
 */
const json = (data, status = 200, extra = {}) => new Response(JSON.stringify(data), {
  status,
  headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store", ...extra }
});
const memoryBuckets = new Map();
function corsHeaders(request, env) {
  const origin = request.headers.get("Origin") || "";
  const allowed = (env.ALLOWED_ORIGIN || "").trim();
  const allowOrigin = allowed ? (origin === allowed ? origin : "") : (origin.startsWith("https://") ? origin : "");
  return {
    "Access-Control-Allow-Origin": allowOrigin,
    "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Vary": "Origin"
  };
}
function rateLimited(request) {
  const key = request.headers.get("CF-Connecting-IP") || "unknown";
  const now = Date.now();
  const old = memoryBuckets.get(key);
  if (!old || now - old.start > 60000) memoryBuckets.set(key, { start: now, count: 1 });
  else if (++old.count > 12) return true;
  if (memoryBuckets.size > 5000) memoryBuckets.clear();
  return false;
}
function extractText(data) {
  if (typeof data.output_text === "string" && data.output_text.trim()) return data.output_text.trim();
  const parts = [];
  for (const item of data.output || []) {
    if (item.type === "message") for (const c of item.content || []) if (c.type === "output_text" && c.text) parts.push(c.text);
  }
  return parts.join("\n").trim();
}
export default {
  async fetch(request, env) {
    const cors = corsHeaders(request, env);
    if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: cors });
    const url = new URL(request.url);
    if (request.method === "GET" && url.pathname === "/health") return json({ ok: true, service: "PLANET AI gateway", configured: Boolean(env.OPENAI_API_KEY) }, 200, cors);
    if (url.pathname !== "/chat" || request.method !== "POST") return json({ error: "Not found" }, 404, cors);
    if (!cors["Access-Control-Allow-Origin"]) return json({ error: "Origin not allowed. Set ALLOWED_ORIGIN to the published PLANET app origin." }, 403, cors);
    if (!env.OPENAI_API_KEY) return json({ error: "سرور هنوز Secret کلید OpenAI را تنظیم نکرده است." }, 503, cors);
    if (rateLimited(request)) return json({ error: "تعداد درخواست‌ها زیاد است؛ یک دقیقه دیگر دوباره امتحان کن." }, 429, cors);
    const length = Number(request.headers.get("Content-Length") || 0);
    if (length > 9000) return json({ error: "درخواست بیش از اندازه بزرگ است." }, 413, cors);
    let body;
    try { body = await request.json(); } catch { return json({ error: "درخواست JSON معتبر نیست." }, 400, cors); }
    const message = typeof body.message === "string" ? body.message.trim().slice(0, 2000) : "";
    if (!message) return json({ error: "پیام خالی است." }, 400, cors);
    const context = body.context && typeof body.context === "object" ? body.context : {};
    const safeContext = {
      app: "PLANET",
      language: String(context.language || "fa").slice(0, 8),
      readyState: String(context.readyState || "").slice(0, 30),
      online: Boolean(context.online),
      viewport: context.viewport && typeof context.viewport === "object" ? {
        width: Number(context.viewport.width) || 0,
        height: Number(context.viewport.height) || 0
      } : undefined,
      genomeLabPresent: Boolean(context.genomeLabPresent),
      recentErrors: Array.isArray(context.recentErrors) ? context.recentErrors.slice(-10).map(e => ({
        type: String(e.type || "").slice(0, 30),
        message: String(e.message || "").slice(0, 240),
        source: String(e.source || "").slice(0, 100),
        line: Number(e.line) || 0,
        time: String(e.time || "").slice(0, 40)
      })) : [],
      timestamp: String(context.timestamp || "").slice(0, 40)
    };
    const instructions = `تو دستیار فنی و علمی برنامه PLANET هستی؛ برنامه‌ای آموزشی برای شبیه‌سازی سیاره و تحلیل ژنوم. فارسی روان پاسخ بده مگر کاربر انگلیسی بخواهد. در عیب‌یابی، شواهد را از حدس جدا کن؛ مراحل کم‌خطر و قابل‌آزمایش بده. اگر داده کافی نیست، دقیقاً بگو چه چیزی باید بررسی شود. هرگز ادعا نکن که خودت کد یا فایل برنامه را تغییر داده‌ای، آزمایش واقعی اجرا کرده‌ای یا خطا را رفع کرده‌ای مگر شواهد ارائه‌شده آن را ثابت کند. این سرویس فقط تحلیل و پیشنهاد ارائه می‌کند و اجازه اجرای کد، تغییر مخزن، حذف داده یا اعمال اصلاح خودکار ندارد. ژنوم و نتایج علمی را با احتیاط تفسیر کن و محدودیت مدل‌های آموزشی را روشن کن. اطلاعات تشخیصی دریافتی را فقط برای پاسخ همین درخواست استفاده کن.`;
    let upstream;
    try {
      upstream = await fetch("https://api.openai.com/v1/responses", {
        method: "POST",
        headers: { "Authorization": "Bearer " + env.OPENAI_API_KEY, "Content-Type": "application/json" },
        body: JSON.stringify({
          model: env.OPENAI_MODEL || "gpt-6-astra",
          instructions,
          input: "پیام کاربر:\n" + message + "\n\nوضعیت تشخیصی محدود برنامه (JSON):\n" + JSON.stringify(safeContext),
          max_output_tokens: 900,
          store: false
        }),
        signal: AbortSignal.timeout(40000)
      });
    } catch (e) {
      return json({ error: "ارتباط با سرویس هوش مصنوعی برقرار نشد. اینترنت و تنظیمات سرور را بررسی کن." }, 502, cors);
    }
    const data = await upstream.json().catch(() => ({}));
    if (!upstream.ok) {
      const status = upstream.status === 401 || upstream.status === 403 ? 502 : upstream.status === 429 ? 429 : 502;
      return json({ error: status === 429 ? "محدودیت درخواست سرویس هوش مصنوعی؛ بعداً دوباره امتحان کن." : "سرویس OpenAI درخواست را نپذیرفت. کلید، دسترسی مدل و اعتبار حساب سرور را بررسی کن." }, status, cors);
    }
    const reply = extractText(data);
    if (!reply) return json({ error: "پاسخ متنی از مدل دریافت نشد." }, 502, cors);
    return json({ reply: reply.slice(0, 12000) }, 200, cors);
  }
};
