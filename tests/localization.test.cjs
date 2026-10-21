"use strict";
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const read = p => fs.readFileSync(path.join(__dirname, "..", p), "utf8");

const dictionarySource = read("planet-localization.js");
const index = read("index.html");
const evidence = read("genome-evidence.html");
const privacy = read("privacy.html");
const workflow = read(".github/workflows/android-apk.yml");
const sw = read("sw.js");
const activity = read("app/src/main/java/com/planet/live/MainActivity.java");
const aiWorker = read("ai-worker/worker.js");
const imageWorker = read("cloudflare-worker/index.js");

const match = dictionarySource.match(/const pairs=(\[[\s\S]*?\]);const enFrom/);
assert.ok(match, "shared translation dictionary is present and parseable");
const pairs = JSON.parse(match[1]);
assert.ok(pairs.length >= 600, "dictionary covers the primary app and dynamic UI");
const keys = pairs.map(pair => pair[0]);
assert.equal(new Set(keys).size, keys.length, "Persian source keys are unique");
for (const pair of pairs) {
  assert.equal(pair.length, 2, "each translation has source and target");
  assert.ok(pair[0].length > 0 && pair[1].length > 0, "translation values are non-empty");
}

const hasPersian = value => [...value].some(c => c.charCodeAt(0) >= 0x600 && c.charCodeAt(0) <= 0x6ff);
function translate(text, direction) {
  const ordered = pairs.slice().sort((a, b) => (direction === "en" ? b[0].length - a[0].length : b[1].length - a[1].length));
  let out = text;
  const isWord = c => !!c && (/[A-Za-z0-9_]/.test(c) || (c.charCodeAt(0) >= 0x600 && c.charCodeAt(0) <= 0x6ff));
  for (const pair of ordered) {
    const from = direction === "en" ? pair[0] : pair[1];
    const to = direction === "en" ? pair[1] : pair[0];
    let start = 0, at;
    while ((at = out.indexOf(from, start)) !== -1) {
      const before = at ? out[at - 1] : "";
      const after = out[at + from.length] || "";
      if ((!isWord(from[0]) || !isWord(before)) && (!isWord(from[from.length - 1]) || !isWord(after))) {
        out = out.slice(0, at) + to + out.slice(at + from.length);
        start = at + to.length;
      } else start = at + from.length;
    }
  }
  if (direction === "en") out = out.replace(/[۰-۹]/g, c => "۰۱۲۳۴۵۶۷۸۹".indexOf(c));
  return out;
}

const required = [
  ["آزمایشگاه ژنوم کامل", "Full Genome Lab"],
  ["دریافت از NCBI / ENA", "Fetch from NCBI / ENA"],
  ["خطا در موتور محلی", "Local engine error"],
  ["مولد سه‌بعدی موجودات · PLANET", "PLANET · 3D Organism Generator"],
  ["گزارش مستند ژنوم", "Genome Evidence Report"],
  ["بازگشت به PLANET", "Return to PLANET"],
  ["سیاست حریم خصوصی PLANET", "PLANET Privacy Policy"],
  ["تحلیل تمام توالی", "Analyse full sequence"],
];
for (const [fa, en] of required) {
  assert.ok(pairs.some(pair => pair[0] === fa && pair[1] === en), `missing required translation: ${fa}`);
  assert.ok(!hasPersian(translate(fa, "en")), `source was not translated: ${fa}`);
  assert.equal(translate(en, "fa"), fa, `target did not translate back exactly: ${en}`);
}

assert.ok(index.includes('src="./planet-localization.js"'), "main app loads the shared dictionary");
assert.ok(index.includes("window.PlanetLanguage.transform(s, to)"), "main app uses the shared reversible translator");
assert.ok(index.includes("attributes:true"), "dynamic accessibility labels and placeholders are observed");
assert.ok(index.includes("event.key === 'planet-language'"), "main page syncs language with embedded pages");
assert.ok(evidence.includes('id="planetLanguageToggle"'), "standalone genome report has a language toggle");
assert.ok(evidence.includes('src="./planet-localization.js"'), "genome report loads the shared dictionary");
assert.ok(privacy.includes('data-planet-lang-fa') && privacy.includes('data-planet-lang-en'), "privacy page switches between complete authored language sections");
assert.ok(privacy.includes('src="./planet-localization.js"'), "privacy page loads the shared dictionary");
assert.ok(workflow.includes("cp index.html planet-localization.js"), "Android package includes the shared dictionary");
assert.ok(sw.includes('"./planet-localization.js"'), "PWA cache precaches the shared dictionary");
assert.ok(sw.includes("planet-pwa-v18-cosmology-observations"), "PWA cache version is refreshed");
assert.ok(activity.includes('document.documentElement.lang || \'fa\''), "native Android toast follows the selected UI language");
assert.ok(activity.includes('"File picker is unavailable"') && activity.includes('"فایل‌گزین در دسترس نیست"'), "native file-picker error has both languages");
assert.ok(aiWorker.includes("سرور هنوز Secret کلید OpenAI را تنظیم نکرده است."), "online AI error messages remain sourced from the worker");
assert.ok(imageWorker.includes("پاسخی دریافت نشد؛ لطفاً دوباره تلاش کن."), "image-worker fallback response is covered by the shared dictionary");
assert.ok(dictionarySource.includes(".planet-ai-msg.user"), "user-authored assistant messages are not auto-translated");

const dynamic = translate("خطا در موتور محلی: حافظهٔ محلی در دسترس نیست.", "en");
assert.ok(!hasPersian(dynamic), "combined dynamic error messages are translated");
const digitText = translate("روز مدل ۱۲۳", "en");
assert.equal(digitText, "model days 123", "Persian digits become English digits without altering accession inputs");
assert.equal(translate("شبکه", "en"), "شبکه", "short dictionary terms do not corrupt larger Persian words");

console.log("PLANET localization regression tests passed: shared dictionary, reversible switching, dynamic UI, standalone pages, PWA and Android bundling.");
