# Connection and mobile-picker update — 25 October 2026

- Deployed frontend: https://drop-devs-52b0.vercel.app/app (Vercel deployment `dpl_2Rcr2dvTmRgJCrkpqdX1xqFTDWGG`). Pairing backend is unchanged.
- Hosted browser checks allow bounded service startup time rather than treating five seconds of Render cold-start latency as an application failure. Application connection deadlines are unchanged.
- Validation: production build, 27 server tests and 23 local browser/protocol tests passed. The latest complete hosted run passed 22 of 23 checks: the tablet-width 404-to-home navigation timed out once waiting for the hero. That unchanged route passed three immediate targeted repetitions; the intermittent navigation timeout is not claimed fixed. All hosted transfer, document-picker, verification and connection-recovery checks passed, including an exact 50 MiB file and hash comparison. Physical Android/iOS picker and cross-network testing remain pending.
- Added separate document/storage and photo/video pickers. Document selection advertises application/text formats and common document extensions; neither input requests camera capture. Native picker presentation still depends on the phone/browser. QR-scanner preview browsers may require opening Chrome or Safari before joining.
- Connection copy and a six-step tracker now follow real room opening, invite, approval, ICE discovery, encrypted-channel setup, both-device verification and ready events. No invented percent-complete is displayed. Recovery pauses new sends; the code-confirmation gate remains required after transient pre-verification network changes.
- Delayed callbacks from an ended room can no longer terminate or send candidates into a new room.
- HTML error responses during a hosting cold start now produce a useful retry screen instead of a JSON parse exception.
- Network failures distinguish a direct-only deployment from one that has a relay configured. Discovery has a bounded timeout, and new-room recovery requires a new invitation.
- Cloudflare account signup completed. TURN activation requires payment details and an automatically renewing usage-billed subscription (1,000 GB/month included, then $0.05/GB). The owner chose to keep this beta direct-only. No payment details, subscription or TURN credentials were added. Restricted networks can still fail to connect; these UI fixes do not replace TURN.
- Added browser regressions for mobile document/media selection, approval/verification stages, transient pre-verification recovery, blocked routes, cold-start HTML failures and stale-peer errors.

---

# Live private beta — 25 October 2026

- Frontend: https://drop-devs-52b0.vercel.app
- Pairing service: https://drop-pairing.onrender.com (Render Free).
- Public source: https://github.com/Pranav-Teja-Aluvala/Drop
- Final production deployment: dpl_9S8kYDTse4u3pAvVLrboUotN4am4 (Vercel Hobby).
- All 19 automated browser/protocol tests passed with TEST_BASE_URL set to the live frontend. The browser cases used two isolated contexts on one computer; protocol unit cases remain local.
- The live 50 MiB file was saved and checked for byte count and SHA-256. Above-limit rejection, HTML save, notes, counters, acceptance/decline, mismatched codes, page exit/disconnect and room recovery passed.
- Live routes, custom 404, production canonical URL, sitemap, security headers and excluded-file probes passed. The production URL is accessible without a Vercel login.
- Both live origin/CORS rejection checks and WSS approval/signaling checks passed.
- Before a wider launch: physical phone/laptop QR pairing and downloads, Wi-Fi/mobile-data and TURN tests, provider cold-start/load review, and final legal operator/contact details remain pending. No relay was configured and no paid service was enabled.
- The page now sends a best-effort leave message on pagehide. Network failure detection can still take time; an abrupt power/network loss cannot send that message.

---

# Beta validation — 25 October 2026

**Local automated beta: passed. Public/physical-device beta: pending deployment.**

- [x] Production build and TypeScript checks.
- [x] 27 server/security tests.
- [x] 19 browser/protocol checks against production-built assets and the real local pairing service, including two independent browser contexts.
- [x] Exact 50 MiB transfer, saved byte count and SHA-256 comparison; a file one byte above the cap is rejected without a recipient offer.
- [x] Peer disconnect during an unaccepted offer marks it interrupted; a new room gets a fresh invite and clears old history.
- [x] HTML download, acceptance/decline, counters, notes, mismatched device-code rejection and mobile-width notice visibility.
- [x] 25 production route/viewport checks at 320, 390, 768, 1024 and 1440 pixels.
- [x] Dependency audit: no known vulnerabilities after updating transitive body-parser to 2.4.0 for GHSA-27r3-jxmh-p828. The affected body-parser middleware is not used by DROP's current routes; this was a dependency finding, not a demonstrated exploit of DROP.
- [x] Current-file pattern scan: no secret matches. No Git history exists here to scan.
- [x] Deploy public HTTPS frontend and pairing service; live TLS/WSS, CORS and headers passed.
- [ ] Verify deployment-specific proxy/client quotas, cold starts, restarts and capacity under load.
- [ ] Configure TURN and test real Wi-Fi-to-mobile-data transfers and forced relay selection.
- [ ] Physical Android/iOS and laptop testing, including phone camera QR scan, downloads, backgrounding, screen lock and network changes.
- [ ] Complete operator/contact/provider-retention details in privacy and terms; set production SITE_ORIGIN.

Reproduce local checks: `npm run build`, `npm test`, `npm run test:beta`, `npm run check:release`, `npm run check:secrets`, `npm audit`.
The beta runner starts a temporary loopback server and closes it afterward. It needs no separately running dev server. Loopback HTTP is a browser secure context; it does not test deployed HTTPS. Browser plugin not available; Playwright Chromium was used. Mobile widths are emulation, not physical-phone certification. No deployment, relay credentials, public load test or independent penetration test was performed.

---

# Two-day release plan

## Thursday, 22 October — working core

- [x] New isolated project; old project untouched.
- [x] Real room creation, invite QR and manual link entry.
- [x] Explicit host approval and guest rejection.
- [x] File acceptance, chunking, backpressure, receipt hash, download.
- [x] Notes/links with explicit copy controls.
- [x] Helpful empty, connecting, failure, cancelled and disconnected states.
- [x] Build, server tests, two-browser automation, mobile-width check.
- [x] Local adversarial security pass and fixes; see SECURITY-REVIEW-2026-10-22.md.
- [x] Production static routing tested in the automated harness (not live HTTPS).
- [ ] Physical phone/laptop test over HTTPS.
- [x] Local production-entrypoint smoke test: startup, health, HTML routes, custom 404, security headers, exact-origin room creation and rejection, and missing-origin startup failure passed on 23 October. This does not verify deployed HTTPS.

## Friday, 23 October — release gates

- [x] Deploy Vercel Hobby frontend and single Render Free Node pairing service.
- [ ] Verify trusted proxy addresses, real-client quotas, edge abuse controls and capacity under load.
- [ ] Select/configure a TURN provider; verify costs, quotas and abuse controls before enabling it publicly.
- [ ] Confirm transfer on same Wi-Fi and Wi-Fi-to-mobile-data; verify actual relay selection for the relay test.
- [ ] Android Chrome and iOS Safari testing if these are launch targets.
- [ ] Test real photos, PDFs, large files at the cap, cancellation mid-transfer, screen lock and network interruption.
- [ ] Final accessibility and supported-browser review.
- [ ] Choose open-source license, publish public GitHub repo and live URL.
- [ ] Record real two-device demo; show actual delivery and save. Avoid universal network/speed/unlimited claims.

## Demo outline

1. Laptop: open DROP, create room.
2. Phone: scan QR, join. Laptop: allow device.
3. Phone: select a photo. Laptop: accept, show actual progress, save and open the photo.
4. Laptop: send a link. Phone: receive and copy it.
5. End room, show clear disconnected state.

Keep the launch film concise and let the successful transfer carry the story. Broader batch transfers, clipboard monitoring, permanent accounts, offline transfer, device discovery and mobile apps are outside the two-day scope.
# Scan-to-join and message notifications — 25 October 2026

- Opening a valid QR/invite now starts a join request automatically. The receiving device gets a dedicated joining screen instead of the create-room/paste-link form, with the same room name visible on both devices.
- Reduced the visible connection timeline from six stages to three. Host approval and both-device certificate-code comparison remain required; no extra room-name confirmation dialog was added.
- Incoming notes show a bottom-right message button with an unread count. Opening it shows plain-text messages and clears the count; new notes while closed become unread. Escape closes the panel. There is no automatic clipboard access or message persistence.
- Added regression coverage for automatic joining, matching room labels, absence of a redundant Join button, three progress stages and unread-message behavior. No backend or relay configuration changes.
- Validation: production build, all 23 local browser/protocol tests and 25 production page/viewport checks passed. The transfer tests capture runtime errors and exercise unread/read/reset behavior with script-like text rendered inertly. Scanned-invite joining was checked at 390 px; physical-phone testing remains pending. Source is pushed. Production deployment dpl_HvNYsDe25VPyFQKCuNRQyuV5Bdj6 is live at https://drop-devs-52b0.vercel.app/app. Both targeted hosted browser flows passed: automatic invite joining/document selection, and two-device transfer/unread-message behavior (2/2).
