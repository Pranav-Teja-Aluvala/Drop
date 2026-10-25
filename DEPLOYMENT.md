# DROP beta deployment

Chosen setup: Vercel static frontend, one Render Free Node pairing service, optional Cloudflare Realtime TURN.

## Current beta setup — 25 October 2026

- Source: https://github.com/Pranav-Teja-Aluvala/Drop (public). Frontend follow-up code commit: 7f957b7.
- Render service: https://drop-pairing.onrender.com, Free Node service `drop-pairing`, health endpoint `/api/health`, Node 24, build `npm ci && npm run build`, start `npm start`.
- Render `PUBLIC_ORIGIN`: `https://drop-devs-52b0.vercel.app`.
- Vercel Hobby project: https://vercel.com/devs-52b0/drop. Live frontend: https://drop-devs-52b0.vercel.app. Production deployment: `dpl_9S8kYDTse4u3pAvVLrboUotN4am4`.
- Vercel production configuration saved: `VITE_SIGNAL_ORIGIN=https://drop-pairing.onrender.com`, `SITE_ORIGIN=https://drop-devs-52b0.vercel.app`.
- Live backend checks passed: HTTPS health 200; configured-origin room creation 201 with exact CORS; foreign-origin creation 403; `.env` and source path probes 404; WSS host/guest approval, signaling and closure. Browser transfers on the live HTTPS frontend also passed, including a 50 MiB download verified by SHA-256, HTML, notes and room recovery. Both automated browser peers ran on this same computer; this is not a physical phone or Wi-Fi-to-mobile-data certification.
- The frontend was first deployed using browser ZIP upload, then updated through the authorized Vercel CLI after login completed. Source uploads are not automatically connected to Vercel Git deployments; a GitHub push alone does not publish a frontend update. No account access protections were bypassed.
- TURN is not configured; no paid plan, card or relay credentials were added. On 25 October, the owner created a Cloudflare account but explicitly chose direct-only after the TURN activation page required a payment method and usage-billed subscription. Some phone/mobile-data/restricted Wi-Fi connections will remain unsupported without a relay.


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
