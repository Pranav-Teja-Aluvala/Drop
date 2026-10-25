# DROP beta deployment

Chosen setup: Vercel static frontend, one Render Free Node pairing service, optional Cloudflare Realtime TURN. No accounts, deployment or paid subscriptions have been created by this change.

## Accounts and cost

Create Vercel and Render accounts, choosing their free options. Render Free can sleep/restart; it is not an uptime guarantee. Without a payment method Render can suspend service when free allowances are exhausted. Review all plan choices before confirming.

Create a Cloudflare account to evaluate Realtime TURN. Documentation currently describes a shared 1,000 GB free allowance followed by metered charges. This is NOT a hard zero-cost guarantee. Verify eligibility and billing controls before enabling TURN; do not accept a paid plan just to follow this guide.

## Configure

1. Put this `drop` folder in its own repository. Never publish real environment files or credentials.
2. Create a Vercel project using Vite, `npm run build`, output `dist`. Reserve its production URL. The build deliberately fails on Vercel until the pairing URL is configured.
3. Create one Render Free Node Web Service from the same folder. Build: `npm ci && npm run build`. Start: `npm start`. Health: `/api/health`. Set `PUBLIC_ORIGIN` to the exact Vercel production origin, without a trailing slash. Render supplies `PORT`.
4. In Vercel set `VITE_SIGNAL_ORIGIN` to the exact Render HTTPS origin, without a trailing slash. This URL is public, not a credential. Redeploy Vercel. QR invitations continue to use the frontend URL.
5. Configure `TRUSTED_PROXY_CIDRS` on Render only after checking the real ingress addresses and forwarding policy. Do not trust every network. Otherwise quotas conservatively use the socket address, which can group users behind one proxy.
6. For Cloudflare TURN, create a TURN key in its dashboard. Save `CF_TURN_KEY_ID` and `CF_TURN_API_TOKEN` only as Render secrets. Never use a `VITE_` prefix, commit them, or paste them into chat. Leave coturn `TURN_SECRET` and `TURN_URLS` unset when using Cloudflare. Redeploy Render.

The adapter requests separate temporary credentials per device only after approval. Provider failures close the room. Temporary relay credentials remain usable until expiry; ending a room does not currently revoke them at the provider. Provider bandwidth controls are essential. No real Cloudflare request or relay test has been made without credentials.

## Checks completed locally

- Frontend production build, server security suite and browser transfer tests.
- Exact-origin CORS for room creation; no wildcard origin or credentialed cookies.
- Vercel static security headers; build-generated CSP permits only self and the configured backend. Live response headers remain untested.
- Coturn configuration checks and expiration calculations; Cloudflare request/response validation using mocked responses.

## Checks requiring deployment

Supply the Vercel and Render public URLs after setup. Verify live TLS/WSS, CORS, headers, proxy quotas, source-file exclusions, cold starts and restarts. Test actual phone/laptop transfers, Wi-Fi-to-mobile-data, and forced TURN selection. Capacity/load testing of the chosen host is still outstanding. No public-launch clearance or scale guarantee is implied.

Vercel now supports WebSockets, but new connections may reach different instances and connections end at function duration limits. This release intentionally keeps pairing in a single Render process. A Vercel-only backend needs shared temporary state and reconnection work first.

References checked 22 October 2026:
- https://vercel.com/docs/functions/websockets
- https://render.com/docs/free
- https://developers.cloudflare.com/realtime/turn/faq/
- https://developers.cloudflare.com/realtime/turn/generate-credentials/
