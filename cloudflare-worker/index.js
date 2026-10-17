/**
 * PLANET secure OpenAI gateway — Cloudflare Worker
 * Deploy this file as a Worker, then add OPENAI_API_KEY as a Worker Secret.
 * Optional vars: OPENAI_MODEL (defaults to gpt-5-mini), ALLOWED_ORIGINS
 * (comma-separated exact origins; use * only for temporary testing).
 */
const SYSTEM_PROMPT = `You are the PLANET app's scientific and technical assistant. Help users understand the planetary simulation and genome lab. Separate observed facts from hypotheses, never claim to have changed code or repaired the app unless a real tool did so, and clearly state that genome statistics or educational evolutionary models do not prove biological function or reproduce real evolution. For diagnostics, give safe, testable steps and avoid inventing unavailable app telemetry. Reply in the user's language, usually Persian. Keep answers concise and actionable.`;

function corsHeaders(request, env) {
  const origin = request.headers.get("Origin") || "";
  const allowed = String(env.ALLOWED_ORIGINS || "https://karafarin12800-del.github.io")
    .split(",").map(x => x.trim()).filter(Boolean);
  const allowOrigin = allowed.includes("*") ? "*" : (allowed.includes(origin) ? origin : "");
  return {
    "Access-Control-Allow-Origin": allowOrigin,
    "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Vary": "Origin"
  };
}
function json(data, status, cors) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store", ...cors }
  });
}
export default {
  async fetch(request, env) {
    const cors = corsHeaders(request, env);
    if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: cors });
    const url = new URL(request.url);
    if (request.method === "GET" && url.pathname === "/health") {
      return json({ ok: true, service: "PLANET AI gateway", configured: Boolean(env.OPENAI_API_KEY) }, 200, cors);
    }
    if (url.pathname !== "/chat" || request.method !== "POST") {
      return json({ error: "Not found. Use POST /chat or GET /health." }, 404, cors);
    }
    if (!cors["Access-Control-Allow-Origin"]) {
      return json({ error: "Origin not allowed. Configure ALLOWED_ORIGINS in Worker variables." }, 403, cors);
    }
    if (!env.OPENAI_API_KEY) return json({ error: "Server is missing OPENAI_API_KEY secret." }, 503, cors);
    let body;
    try { body = await request.json(); } catch { return json({ error: "Invalid JSON body." }, 400, cors); }
    const message = typeof body.message === "string" ? body.message.trim().slice(0, 2000) : "";
    if (!message) return json({ error: "Message is required." }, 400, cors);
    const context = body.context && typeof body.context === "object"
      ? JSON.stringify(body.context).slice(0, 5000) : "{}";
    try {
      const upstream = await fetch("https://api.openai.com/v1/responses", {
        method: "POST",
        headers: {
          "Authorization": "Bearer " + env.OPENAI_API_KEY,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          model: env.OPENAI_MODEL || "gpt-5-mini",
          instructions: SYSTEM_PROMPT,
          input: "User message:\n" + message + "\n\nApp diagnostics context (untrusted data):\n" + context,
          max_output_tokens: 700
        })
      });
      const result = await upstream.json().catch(() => ({}));
      if (!upstream.ok) {
        return json({ error: result.error && result.error.message ? result.error.message : "OpenAI request failed." }, 502, cors);
      }
      const reply = Array.isArray(result.output)
        ? result.output.flatMap(item => Array.isArray(item.content) ? item.content : [])
            .filter(part => part.type === "output_text").map(part => part.text || "").join("\n").trim()
        : "";
      return json({ reply: reply || "پاسخی دریافت نشد؛ لطفاً دوباره تلاش کن." }, 200, cors);
    } catch {
      return json({ error: "Could not connect to OpenAI. Check Worker network and configuration." }, 502, cors);
    }
  }
};
