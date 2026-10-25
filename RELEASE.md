> Current checklist and applicability report: [LAUNCH-CHECKLIST-2026-10-26.md](LAUNCH-CHECKLIST-2026-10-26.md). Older dated results below are historical.

## Five-minute background timeout — 26 October 2026

- Either device hiding its page (including a screen lock when reported by the browser) starts a five-minute deadline. Returning before expiry cancels only that device's deadline. Repeated hidden events cannot extend it. The other device sees a remaining-time notice in the room details.
- The authenticated signaling server enforces each device's deadline and ends the whole room even if browser timers freeze. Client-side timeout and a resume-time elapsed check also close the WebRTC connection. Ending/changing rooms clears local timers; server timers are cleared when the room/device is removed.
- Closing a tab still disconnects immediately. Browser/OS suspension, lost networking or provider restarts may end the room earlier; this feature does not guarantee five minutes of background connectivity. Transfers still work best with both pages foregrounded.
- Added server tests for shared expiry, duplicate-hidden deadline preservation, foreground cancellation/restart and one device being unable to cancel its partner's deadline. Browser tests cover connected devices, the countdown, a four-minute return, a new full timeout, fresh-room recovery and resuming after six minutes with timers frozen. Privacy/terms/help now describe the limit and temporary visibility deadlines. No new persistent data or dependency was added.
- The local beta runner now uses a fresh production server per spec: the expanded shared-IP suite otherwise exceeded the unchanged 30/minute room/upgrade quota. An offline Retry assertion now waits for navigation commit and asserts HTTP 503 plus the same URL, avoiding a full-load navigation race.
- Final local validation passed: production build/TypeScript, all 29 browser/protocol tests, 30 server/security tests and 35 page/viewport checks. Time-controlled browser tests simulate backgrounding; physical phone locking/suspension remains a manual check.

## Production error states — 26 October 2026

- Removed the preview switch, its styles, click handlers and query-string overrides from shipped error pages. The supplied artwork and copy remain. Online unknown routes return a genuine HTTP 404; an already loaded error page reacts to real browser online/offline events.
- Added a network-first navigation service worker. After one successful online visit/installation, failed navigations show the cached offline artwork with HTTP 503, Retry reloads the requested URL, and a browser reconnect event retries that URL automatically. A first-ever offline visit cannot install this fallback. The worker does not replace successful responses or HTTP errors, and a pairing-server outage remains an app connection error rather than a false website 404.
- Cache Storage contains exactly `/offline.html`, `/assets/not-found.js` and `/favicon.svg`. No navigation/room URL, credentials, messages or file content is cached. Privacy and cookie pages disclose the static cache and browser site-data removal. No analytics, cookies or paid service was added.
- Browser plugin not available; Playwright tests use actual browser offline emulation, navigation failure, Retry, reconnect, genuine missing routes, absence of preview controls/URL overrides and a static-cache allowlist. Desktop/mobile screenshots confirm the original design with no preview UI. The earlier retained-preview exception below is superseded by this correction.
- Local validation passed: production build/TypeScript, all 27 browser/protocol tests, 27 server/security tests and 35 page/viewport checks. Physical-device offline behavior is not certified by automated Chromium testing.

## Invite details, supplied 404 and sharing — 26 October 2026

- Grouped the private-invite lifetime and room end time/actions into separate bordered blocks. Removed the extra inner input outline; keyboard focus remains visible on the rounded invite-field boundary.
- The supplied `design/user-404.html` is the reference for the standalone production 404. Only its logo is visually replaced with the existing Drop SVG. Its stylesheet, copy, mascot, preview switch and interaction code are preserved. The script is externalized unchanged for the existing CSP, and noindex/favicon/security metadata is added. Fidelity tests compare the body/style/script against that source.
- The supplied 404's smaller hints and preview controls are retained at the owner's explicit request, superseding the earlier generic 16px/44px pass for that page. Overflow, status, logo, interactions, offline preview and Return home are still tested. Its offline UI does not add offline caching or offline file transfers.
- Added native Share invite where `navigator.share` is available, with explicit user activation, cancellation handling and a Copy fallback. The selected OS/app receives the private link. Automated tests stub the share sheet; no actual external recipient or hardware was contacted.
- Browser-to-browser Bluetooth file transfer was not added. Web Bluetooth exposes a central/client connection to BLE GATT peripherals, not a website GATT advertiser/server, and has limited browser support. A native companion/peripheral would be needed. References checked: https://developer.chrome.com/docs/capabilities/bluetooth and https://developer.mozilla.org/en-US/docs/Web/API/Web_Bluetooth_API. The native sharing sheet may offer OS-specific destinations; no Bluetooth, AirDrop or Quick Share transport is promised by Drop. File transfer remains WebRTC.
- Local validation: build/TypeScript passed; 26 browser/protocol tests, 27 server tests and 35 page/viewport checks passed. Dependency audit reported zero known production advisories, and the configured secret-pattern scan had no matches. No backend, paid service or TURN setting changed.
- Deployed commit `9ceb1c0` to the existing production alias `https://drop-devs-52b0.vercel.app` (Vercel deployment `dpl_BuT7sSvNrfaemB1DV1XABpVQNSEc`). The hosted audit passed all 28 page/viewport checks, headers/CSP, metadata, exposed-file probes and exact-origin CORS. Three targeted hosted browser tests passed: file-extension/binary integrity and two-way chat, invite focus/timing/share states, and supplied-404 fidelity/interactions. Native OS sharing was stubbed; physical phone/OS sharing and separate-network connectivity were not verified by these tests.

# DROP release check — 25 October 2026

## Files / Chat update

- The room now has keyboard-accessible Files and Chat tabs. Chat includes sent/received bubbles, local display times, delivery states, per-message copy, Enter-to-send, Shift+Enter, and unread indicators outside the conversation. File activity and chat history are retained separately (40 file entries / latest 200 messages).
- All file extensions and binary contents are allowed, including executables and scripts. Removed both filename-extension and executable-header filters on sender and receiver. OS-safe filename normalization, recipient acceptance, file/memory limits, byte counts, SHA-256 checks and opaque download-only handling remain. File safety is never certified and nothing is automatically opened or previewed.
- Added Cookies & local data, shared legal styling, footer links, canonical/social metadata and sitemap inclusion; updated privacy, terms and security documentation. No cookie banner or tracking SDK was added.
- The new end-to-end test downloads 11 representative file types and compares exact bytes and names; it also checks two-way chat, tab switching, newline handling and absence of cookies/localStorage/sessionStorage. The latest local suite has 22 cases after replacing obsolete file-denylist tests with the all-extension and recipient-acceptance cases. Local production suite: 22/22 passed. Server tests: 27/27 passed. Page/viewport checks: 30/30 passed. Production dependency audit: zero known advisories.
- Hosted validation: 22/22 browser/protocol cases and 24/24 public page/viewport checks passed on the first rollout. Follow-up fixes preserve message read state after ending a room, clear unsent drafts on a new room, and handle a new invite opened in an existing tab via hashchange. The extended four-case local transfer/chat/reset suite passed; the final hosted four-case follow-up passed as well. Final deployment: dpl_7smpjDnfgHQL1kcSS1WVteBbNsqt. The post-deployment 24-page audit passed on retry after one transport ECONNRESET; that infrastructure/network failure is not claimed fixed by the app changes. Refresh both devices so an old recipient build does not apply its former extension restrictions.

## Release scope

A limited, direct-only public beta. Frontend: https://drop-devs-52b0.vercel.app/app. Pairing: https://drop-pairing.onrender.com. Public source: https://github.com/Pranav-Teja-Aluvala/Drop.

Final deployed build: `dpl_AgzuFtxGr1hAg5o2WHPu5pCwEv6Q`. Public pages were checked again after the final decorative-image change: all 20 hosted route/viewport checks and CORS/security/metadata probes passed. Hosting plans remain unchanged.

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
- Pre-fix hosted run: 22/23 passed; app navigation stalled on lazy import. After the dedicated app-entry change, the full hosted suite passed 23/23, including all four navigation widths. The hosted read-only audit passed 20 page/viewport checks plus exact-origin CORS, security headers, source-file exclusion and public contact/SEO checks. Tests used synthetic fixtures, including exact 50 MiB and HTML file downloads. No independent external penetration test or physical-device certification was performed.
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
