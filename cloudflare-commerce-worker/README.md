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
   \`BAZAAR_CLIENT_ID, BAZAAR_CLIENT_SECRET, BAZAAR_REFRESH_TOKEN\`. Configure variables: \`BAZAAR_PACKAGE_NAME\`,
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
- \`POST /auth/google\` (Google ID token audience and signed nonce are checked against GOOGLE_CLIENT_ID)
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

The Android client in the current branch is connected to the account, wallet, planet and specimen-market endpoints. Local credits remain separate prototype credits and are never converted into purchased tokens. Live operation still requires the Cloudflare Worker and D1 database to be deployed.


## Native Android sign-in and payments

Native Google sign-in uses Android Credential Manager and a fresh nonce. The Worker checks the
Google ID token audience, verified email, subject and nonce before issuing a session.

Cafe Bazaar in-app billing uses Poolakey. The app stores a successful purchase token in private
app storage, asks the Worker to verify it through the official Developer API v2, and consumes
the token only after the Worker confirms the purchase. A failed network verification keeps the
receipt pending for retry.

Set these GitHub Actions repository variables under Settings → Secrets and variables → Actions → Variables:

- PLANET_GOOGLE_WEB_CLIENT_ID: Google OAuth Web application client ID; set the same value in
  the Worker variable GOOGLE_CLIENT_ID.
- PLANET_BAZAAR_RSA_PUBLIC_KEY: public RSA key registered for this app in Cafe Bazaar.

The Worker also requires D1, AUTH_SECRET, RESEND_API_KEY, VERIFY_FROM_EMAIL, GOOGLE_CLIENT_ID,
BAZAAR_CLIENT_ID, BAZAAR_CLIENT_SECRET, BAZAAR_REFRESH_TOKEN, BAZAAR_PACKAGE_NAME and
ALLOWED_ORIGINS. Complete Cafe Bazaar Developer API OAuth authorization to obtain its client
values and refresh token. Create the consumable product planet_tokens_200 before testing.

Never put a Bazaar client secret, refresh token, AUTH_SECRET or Resend key in the APK or Git.
Poolakey needs Cafe Bazaar installed on the Android test device. Do not enable production
purchases until the deployed Worker validates test receipts and an end-to-end test succeeds.

## Android client and native billing

The Android asset bundle includes `planet-commerce-client.js` and `planet-commerce-ui.js`.
Open the Collection and Shop screen, enter the deployed HTTPS Worker URL, and connect.
Email registration requires a working Resend sender and verified email. Prototype credits
remain local and are never transferred to the online wallet.

The client can sync local specimens using a per-account idempotency key, publish and cancel
listings, buy another player's specimen with zero fee, and buy one of the 100 server-priced
planets. The Worker stores specimen DNA privately and does not return it in public listings.
A pre-existing D1 database requires a migration adding `specimens.client_key`, its unique
owner/key constraint, and the `planet_ownership` table before this version of the Worker runs.

Native Google sign-in uses Android Credential Manager and a fresh nonce. The Worker checks the
Google ID token audience, verified email, subject and nonce before issuing a session.

Cafe Bazaar in-app billing uses Poolakey and the official Developer API v2 validation endpoint.
The app stores a successful purchase token in private app storage, asks the Worker to verify it,
and consumes the token only after the server confirms the purchase. A failed network verification
keeps the receipt pending for retry. The receipt hash is unique across accounts, so it cannot be
credited twice or replayed into another player's wallet.

Set these GitHub Actions repository variables under Settings → Secrets and variables → Actions → Variables:

- `PLANET_GOOGLE_WEB_CLIENT_ID`: Google OAuth Web application client ID; set the same value in
  the Worker variable `GOOGLE_CLIENT_ID`.
- `PLANET_BAZAAR_RSA_PUBLIC_KEY`: public RSA key registered for this application in Cafe Bazaar.

The Worker also requires D1, `AUTH_SECRET`, `RESEND_API_KEY`, `VERIFY_FROM_EMAIL`,
`GOOGLE_CLIENT_ID`, `BAZAAR_CLIENT_ID`, `BAZAAR_CLIENT_SECRET`,
`BAZAAR_REFRESH_TOKEN`, `BAZAAR_PACKAGE_NAME` and `ALLOWED_ORIGINS`.
Complete Cafe Bazaar Developer API OAuth authorization to obtain its client values and refresh
token. Create the consumable product `planet_tokens_200` before testing.

Never put a Bazaar client secret, refresh token, `AUTH_SECRET` or Resend key in the APK or Git.
Poolakey requires Cafe Bazaar installed on the Android test device. Do not enable production
purchases until the deployed Worker validates test receipts and an end-to-end test succeeds.
Player-selected display names remain part of the account profile for player identity in the specimen marketplace. Planet owner names are not displayed beside planets in the galaxy viewer; planet ownership is tracked independently of the account display name.
