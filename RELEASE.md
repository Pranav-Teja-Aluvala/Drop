# DROP release check — 25 October 2026

## Release scope

A limited, direct-only public beta. Frontend: https://drop-devs-52b0.vercel.app/app. Pairing: https://drop-pairing.onrender.com. Public source: https://github.com/Pranav-Teja-Aluvala/Drop.

No paid service or TURN subscription is enabled. This release does not promise cross-network connectivity, uninterrupted two-hour sessions, large-scale capacity or independent security certification.

## Fixes in this release

- Valid QR/invite links automatically open a dedicated joining screen. Both screens show the same room label; host approval and full certificate-code confirmation still gate transfers.
- Incoming notes have an unread message button and panel. Incoming files require explicit acceptance; HTML is downloaded as opaque bytes, never rendered automatically.
- A live navigation check reproduced a lazy-loading stall. The transfer route now has a separate initial HTML/module entry and parallel module preloads; it no longer depends on the landing animation entry or a React Suspense import to render controls. Hosting/network failures can still delay resources.
- Privacy/terms identify the maintainer and support/privacy contact, name the actual providers, explain provider-controlled metadata, support email, direct-only operation and free-beta limits. Added legal-page CSP headers and public Contact links. No cookie banner or analytics was added because the application has neither application cookies nor tracking SDKs.
- Added a repeatable read-only hosted release check and optional reachable-history secret-pattern scan.

## Validation

- Production TypeScript/build: passed.
- Server/security tests: 27/27 passed (origins, third-party access rejection, room isolation, token validation, expiry, replay, quotas and malformed signaling).
- Final local production browser/protocol suite: 23/23 passed.
- Local page/viewport audit: 25/25 passed at 320, 390, 768, 1024 and 1440 px.
- Full dependency audit: zero known advisories at the time of this run.
- Current files and reachable Git diffs: no matches for the scanner's private-key/AWS/GitHub/OpenAI-token patterns. This is not an entropy scan or a guarantee that no secret exists.
- Pre-fix hosted run: 22/23 passed; app navigation stalled on lazy import. Final hosted checks will be recorded after deployment.
- Browser plugin not available; automated Chromium/Playwright used. Independent contexts on one computer are not physical phone/network certification.

## Manual checks before promoting beyond beta

- [ ] On a physical phone, scan a fresh room QR; check the room label, approve the device and compare the full security code on both screens.
- [ ] Send a photo and PDF both ways; decline one file, save another, verify unread notes and copy controls. Check Downloads on the phone.
- [ ] Try phone backgrounding/screen lock and a network change; verify clear failure/recovery. Keep original files.
- [ ] Verify per-client proxy quotas and capacity on the actual Render topology before high-traffic promotion. Current rate limits may group clients behind a proxy; do not blindly trust forwarded headers.
- [ ] If reliable Wi-Fi/mobile-data connectivity is required, fund/configure TURN and test forced relay routing. The owner chose direct-only for this beta.
- [ ] Obtain qualified legal review for target jurisdictions, children/age rules, liability and consumer obligations as applicable. These pages are factual beta terms, not a legal-compliance certification. Support-email retention has no fixed period yet and is disclosed as such.
- [ ] Choose an explicit source-code license before advertising the repository as open source; public visibility alone does not grant an open-source license.

The Render Free host can sleep, restart and lose in-memory rooms. See https://render.com/docs/free. Its published limits do not support an always-on production promise. No load/stress test was run against the public host.

## Reproduce

```sh
npm ci
npm run build
npm test
npm run test:beta
npm run check:release
npm audit
npm run check:secrets -- --history
TEST_BASE_URL=https://drop-devs-52b0.vercel.app npm run test:e2e
npm run check:live
```

PowerShell: set `$env:TEST_BASE_URL` instead of the shell prefix above. Hosted tests use synthetic data and create temporary rooms. Release checks probe only known routes and origin rejection; they are not a full external penetration test.

Provider references checked: https://vercel.com/legal/privacy-notice, https://render.com/privacy, https://render.com/docs/logging, https://www.cloudflare.com/privacypolicy/. Provider operational retention must not be confused with room expiry. Prior release narratives remain available in Git history.
