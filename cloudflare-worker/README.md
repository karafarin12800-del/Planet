# PLANET AI gateway (Cloudflare Workers)

The floating assistant in `index.html` calls a server endpoint at `<WORKER_URL>/chat`.
This file is the server-side gateway. It keeps the OpenAI API key out of the public GitHub repository and out of the Android app.

## Deploy from a phone using the Cloudflare dashboard

1. Open the Cloudflare dashboard and go to **Workers & Pages**.
2. Create a Worker, then paste the contents of `cloudflare-worker/index.js` into its editor and deploy it.
3. Open the Worker **Settings → Variables and Secrets**.
4. Add a **Secret** named `OPENAI_API_KEY` containing your OpenAI API key. Do not put the key in GitHub, the app settings, or the public Worker source.
5. Add a text variable named `ALLOWED_ORIGINS` with comma-separated origins. For the GitHub Pages website use:
   `https://karafarin12800-del.github.io`
   If the Android WebView loads the app from a local file and sends Origin `null`, you may need to add `,null` for that app. Only allow origins you actually use.
6. Optional: add a text variable `OPENAI_MODEL` to choose a model available to your API project. The default is `gpt-5-mini`.
7. In the deployed Worker, open **Settings → Domains & Routes** and copy its HTTPS URL.
8. Open PLANET → **دستیار هوشمند** → **تنظیمات**. Paste the Worker URL (without `/chat`) into **نشانی Worker امن** and save.
9. Test with **بررسی سلامت برنامه** or send a simple question. You can also open `<WORKER_URL>/health`; it should return JSON with `ok: true` and `configured: true`.

## Important safety and cost notes

- OpenAI API access normally requires an API key and separate API billing; a ChatGPT subscription alone does not automatically provide API usage.
- The API key must remain a Cloudflare Worker Secret. Never place it in `index.html`, Android app files, GitHub, or the URL.
- Before sharing the Worker publicly, configure Cloudflare rate limiting for `/chat` and set a usage budget/alerts in the OpenAI API project. CORS is not authentication and does not prevent direct requests to a public endpoint.
- The assistant can explain diagnostic data and suggest fixes. It does not automatically edit or repair the repository; any code changes must be implemented and tested separately.
- Genome statistics and the app's evolutionary simulation are educational and do not prove real biological function or reconstruct actual evolution.
