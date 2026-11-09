# PLANET commerce backend (Cafe Bazaar first)

This is a separate Cloudflare Worker. It does not replace or share the existing OpenAI gateway.
It provides server-side accounts, a one-time welcome grant, a 100-planet catalog, a wallet,
Cafe Bazaar receipt verification and a player-to-player specimen marketplace.

## Deploy

1. Create a Cloudflare D1 database named \`planet-commerce\`.
2. Run \`npx wrangler d1 execute planet-commerce --file=schema.sql\`.
3. Put the resulting D1 database ID in \`wrangler.toml\`.
4. Deploy from this directory with Wrangler.
5. Configure Worker secrets: \`AUTH_SECRET\` (random 32+ bytes), \`RESEND_API_KEY\`,
   \`BAZAAR_ACCESS_TOKEN\`. Configure variables: \`BAZAAR_PACKAGE_NAME\`,
   \`VERIFY_FROM_EMAIL\`, \`GOOGLE_CLIENT_ID\`, and \`ALLOWED_ORIGINS\`.
6. In Cafe Bazaar developer console create in-app product \`planet_tokens_200\`.
   The actual cash price is defined in Bazaar, not guessed in this repository.
7. Test verification and refunds using Bazaar test accounts before production.

Never put these credentials in Git, the Android package, or chat. Do not enable token purchases
until the Worker has been deployed, D1 is migrated, the Bazaar product exists, and a real
server-verified receipt has been tested.

## API outline

- \`GET /health\`, \`GET /catalog/planets\`
- \`POST /auth/register\`, \`POST /auth/verify-email\`, \`POST /auth/login\`
- \`POST /auth/google\` (Google ID token audience is checked against GOOGLE_CLIENT_ID)
- Authenticated: \`GET /wallet\`, \`POST /billing/bazaar/verify\`
- Authenticated: \`POST /specimens/register\`, \`GET /collection\`
- Authenticated: \`GET /market/listings\`, \`POST /market/list\`, \`POST /market/buy\`

The server grants 20 welcome tokens once per verified account and 200 tokens only after
Cafe Bazaar reports a successful purchase of \`planet_tokens_200\`. Receipt hashes are unique.
Marketplace transfers debit the buyer and credit the seller at the same token price; fee is zero.

## Important trust boundary

The first \`/specimens/register\` endpoint binds an app-submitted specimen to an account, but
cannot prove that a modified client did not fabricate its genome. Do not market this as
cheat-proof. Before enabling high-value trades, move specimen creation/claims to signed
server-issued provenance or a server-authoritative simulation.

The current Android app is not yet wired to these endpoints. Local credits remain local prototype
credits and are not purchased tokens. Live billing and online trading are not active until
the app integration and Cloudflare deployment steps above are completed.


## Android client integration (current branch)

The Android asset bundle includes `planet-commerce-client.js` and `planet-commerce-ui.js`. Open the Collection and Shop screen, enter the deployed HTTPS Worker URL, and connect. Email registration requires a working Resend sender and a verified account before the wallet is available. The UI keeps prototype/local credits separate from server tokens.

The client can sync local specimens using a per-account idempotency key, list owned specimens for sale, cancel an active listing, buy another player's listing with zero fee, and buy one of the 100 server-priced planets. The Worker stores the original DNA sequence and returns it only through that owner's authenticated collection endpoint; public listings do not expose DNA. D1 must be created from the updated `schema.sql` before deploying this Worker. A pre-existing D1 database needs a migration adding `specimens.client_key`, its unique owner/key constraint, and `planet_ownership` before the updated Worker can run.

This does not yet make purchased planets renderable in the galaxy viewer. Google OAuth UI/native token acquisition and Cafe Bazaar's Android purchase SDK are also not yet wired; the UI does not claim those flows are live. Do not enable real purchases until Cloudflare and Bazaar verification are deployed and tested.
