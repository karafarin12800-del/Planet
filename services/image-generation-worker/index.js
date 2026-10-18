/* Cloudflare Worker: keeps provider credentials off the public PLANET client.
 * Required secrets: OPENAI_API_KEY, PLANET_ACCESS_CODE.
 * Add Cloudflare edge rate limiting before exposing this endpoint publicly.
 */
const DEFAULT_ALLOWED_ORIGINS = ["https://karafarin12800-del.github.io"];
const WINDOW_MS = 5 * 60 * 1000;
const MAX_REQUESTS_PER_WINDOW = 3;
const requestWindows = new Map();

function json(data, status, headers) {
  return new Response(JSON.stringify(data), {
    status: status || 200,
    headers: Object.assign({
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff"
    }, headers || {})
  });
}
function corsHeaders(origin, allowOrigin) {
  const headers = { "Vary": "Origin" };
  if (origin && allowOrigin) {
    headers["Access-Control-Allow-Origin"] = origin;
    headers["Access-Control-Allow-Methods"] = "POST, GET, OPTIONS";
    headers["Access-Control-Allow-Headers"] = "Content-Type, X-Planet-Access-Code";
    headers["Access-Control-Max-Age"] = "600";
  }
  return headers;
}
function getAllowedOrigin(request, env) {
  const origin = request.headers.get("Origin");
  if (!origin) return { origin: null, allowed: true };
  if (origin === "null" && String(env.ALLOW_NULL_ORIGIN || "").toLowerCase() === "true") {
    return { origin, allowed: true };
  }
  const configured = String(env.ALLOWED_ORIGINS || "").split(",").map(x => x.trim()).filter(Boolean);
  const allowed = new Set(DEFAULT_ALLOWED_ORIGINS.concat(configured));
  return { origin, allowed: allowed.has(origin) };
}
function consumeRateLimit(ip) {
  const now = Date.now();
  const entry = requestWindows.get(ip);
  if (!entry || now - entry.startedAt >= WINDOW_MS) {
    requestWindows.set(ip, { startedAt: now, count: 1 });
    if (requestWindows.size > 4000) {
      for (const [key, value] of requestWindows) if (now - value.startedAt >= WINDOW_MS) requestWindows.delete(key);
    }
    return { allowed: true, retryAfter: 0 };
  }
  if (entry.count >= MAX_REQUESTS_PER_WINDOW) {
    return { allowed: false, retryAfter: Math.max(1, Math.ceil((WINDOW_MS - (now - entry.startedAt)) / 1000)) };
  }
  entry.count += 1;
  return { allowed: true, retryAfter: 0 };
}
function sameSecret(a, b) {
  if (typeof a !== "string" || typeof b !== "string" || !a || !b || a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export default {
  async fetch(request, env) {
    const gate = getAllowedOrigin(request, env);
    const headers = corsHeaders(gate.origin, gate.allowed);
    if (!gate.allowed) return json({ error: "Origin not allowed. Add the site's exact origin to ALLOWED_ORIGINS." }, 403, {});
    if (request.method === "OPTIONS") return new Response(null, { status: 204, headers });
    const url = new URL(request.url);

    if (request.method === "GET" && url.pathname.endsWith("/health")) {
      return json({
        service: "PLANET AI image generation",
        configured: Boolean(env.OPENAI_API_KEY && env.PLANET_ACCESS_CODE),
        providerKeyPresent: Boolean(env.OPENAI_API_KEY),
        accessCodePresent: Boolean(env.PLANET_ACCESS_CODE)
      }, 200, headers);
    }
    if (request.method !== "POST") return json({ error: "Use POST to generate one image, or GET /health to inspect configuration." }, 405, headers);
    if (!env.OPENAI_API_KEY || !env.PLANET_ACCESS_CODE) {
      return json({ error: "The Worker is not configured. Add OPENAI_API_KEY and PLANET_ACCESS_CODE as Worker secrets." }, 503, headers);
    }
    const accessCode = request.headers.get("X-Planet-Access-Code") || "";
    if (!sameSecret(accessCode, String(env.PLANET_ACCESS_CODE))) {
      return json({ error: "Access denied. Check the Worker access code in the app settings." }, 401, headers);
    }

    const length = Number(request.headers.get("Content-Length") || 0);
    if (length > 24000) return json({ error: "The prompt request is too large. Shorten the image description." }, 413, headers);
    let body;
    try { body = await request.json(); } catch (_) { return json({ error: "Invalid JSON request." }, 400, headers); }
    const prompt = typeof body.prompt === "string" ? body.prompt.trim() : "";
    if (!prompt) return json({ error: "An image prompt is required." }, 400, headers);
    if (prompt.length > 12000) return json({ error: "The prompt is longer than the supported limit." }, 413, headers);

    const ip = request.headers.get("CF-Connecting-IP") || "unknown";
    const rate = consumeRateLimit(ip);
    if (!rate.allowed) {
      return json({ error: "Image generation rate limit reached. Try again after " + rate.retryAfter + " seconds." }, 429,
        Object.assign({}, headers, { "Retry-After": String(rate.retryAfter) }));
    }

    const model = String(env.OPENAI_IMAGE_MODEL || "gpt-image-2.5-flare").trim();
    const payload = {
      model: model,
      prompt: prompt,
      size: "1024x1024",
      quality: "medium",
      output_format: "png",
      n: 1,
      moderation: "auto"
    };
    let providerResponse;
    try {
      providerResponse = await fetch("https://api.openai.com/v1/images/generations", {
        method: "POST",
        headers: {
          "Authorization": "Bearer " + env.OPENAI_API_KEY,
          "Content-Type": "application/json"
        },
        body: JSON.stringify(payload)
      });
    } catch (_) {
      return json({ error: "Could not reach the image-generation provider. Check the Worker network and provider availability." }, 502, headers);
    }
    let result;
    try { result = await providerResponse.json(); } catch (_) { result = {}; }
    if (!providerResponse.ok) {
      const providerCode = result && result.error && result.error.code ? String(result.error.code) : "";
      const providerMessage = result && result.error && result.error.message ? String(result.error.message) : "";
      let message = "The image provider returned an error (HTTP " + providerResponse.status + ").";
      if (providerResponse.status === 429) message = "The provider rate limit or billing quota was reached. Check the API account quota and try again later.";
      else if (providerResponse.status === 401 || providerResponse.status === 403) message = "The provider rejected its API key or account access. Check the server-side API key and model access.";
      else if (/moderation|safety/i.test(providerCode + " " + providerMessage)) message = "The provider declined this prompt under its image safety rules. Revise the prompt and try again.";
      return json({ error: message, providerStatus: providerResponse.status }, providerResponse.status === 429 ? 429 : 502, headers);
    }
    const first = result && Array.isArray(result.data) ? result.data[0] : null;
    if (!first || typeof first.b64_json !== "string" || !first.b64_json) {
      return json({ error: "The image provider returned no encoded image. Check provider API compatibility." }, 502, headers);
    }
    return json({
      imageBase64: first.b64_json,
      mimeType: "image/png",
      model: model,
      generatedAt: new Date().toISOString(),
      provenance: "image-model-generated; conditioned on user-supplied digital phenotype prompt"
    }, 200, headers);
  }
};