# DROP implementation and launch review — 23 October 2026

## Outcome

Simplified the homepage into a two-column editorial opening, one demo, concise steps and compact privacy/compatibility/closing content. Removed the decorative hero logo and repeated logos inside the demo; closing content no longer repeats the wordmark. The visible demo labels now say only “Demo”. The real application remains on /app. Earlier instructions for an embedded #transfer section are intentionally superseded by the user's dedicated-app-page request. Replay remains absent as explicitly requested; the automatic repeat pauses for 5.5 seconds.

Cursor motion uses a 24×16 SVG-unit approach instead of a 95×65 detour, 0.9-second travel legs, sine easing and a smaller press/pulse. Control locations remain measured from rendered DOM; the cursor regression test verifies movement and click alignment. GSAP/ScrollTrigger remain the only animation architecture. No dependencies added.

## Verification and evidence

- npm run build: TypeScript and production build passed.
- npm test: all 27 server tests passed.
- Browser tests cover the moving cursor, responsive navigation, reduced motion, room approval, both certificate-code confirmations, executable rejection, SHA-256 verified file bytes both ways, notes, incoming acceptance/rejection and room termination. Final full suite: 17 passed (51.8 seconds).
- npm run check:release: 25 production page/viewport combinations passed at 320, 390, 768, 1024 and 1440 pixels, covering /, /app, privacy.html, terms.html and unknown-route 404. Verified HTTP status, one H1, no horizontal overflow, meaningful image alt attributes, existing section anchors and no captured page errors. This is a basic semantic/interaction check, not a full assistive-technology audit.
- Release checks exercise canonical/social/sitemap generation with a reserved fixture origin, validate WebApplication JSON-LD, then restore the actual unconfigured-domain build. Unknown source files, .env and server source return 404.
- npm audit --json: zero known vulnerabilities at time of check (171 dependencies in audit metadata). No major package upgrades performed.
- npm run check:secrets: no matches in 58 current text files scanned, including generated output. Pattern scan checks common private-key and API-token signatures, never prints values. This is not an exhaustive secret scanner or penetration test.
- Production output contains no .map files. Landing JavaScript is ~351.7 kB / 120.0 kB gzip; the actual app is a separate ~61.9 kB / 22.1 kB gzip chunk. No invented Lighthouse, INP, LCP or field-performance score.
- Screenshot: design/preview/drop-minimal.png. Raw page results: design/release-checks.json.

## Security findings and limitations

No confirmed critical/high vulnerability identified in these scoped local checks. Existing protections were retained: 256-bit room credentials, host approval, full certificate-code comparison on both devices, consumed/expiring invites, recipient file acceptance, receiver-side size/name/header validation, bounded buffers, SHA-256 receipts, exact configured-origin CORS, WebSocket payload/rate restrictions, capacity/IP quotas, security headers and server-only TURN secrets.

Fixed low-severity trust/navigation defects: privacy-page links referenced a removed #transfer section; they now reach /app. Added explicit noindex to app/error documents and route-specific titles. Domain-derived SEO now uses validated configuration, never localhost or an invented live domain.

Files travel over peer WebRTC, so receiver-side controls are the applicable trusted processing layer; the pairing server does not receive file payloads. Malware scanning is not provided. Site code and hosting remain trusted. NAT/relay connectivity and provider-abuse controls still require a real public deployment test. In-memory pairing supports one server instance; horizontal scaling requires shared coordination/sticky ownership and further testing. Quotas alone are not a public DDoS guarantee.

Git history review is BLOCKED: this directory is not a Git repository. No leaked credential was confirmed, so no specific rotation is prescribed. If previously published credentials are discovered elsewhere, revoke/rotate them; deleting a file is insufficient. No actual secret values were printed.

No database, passwords, admin accounts, payments, marketing email or persistent upload store exist in this build; DB controls, password hashing, admin login, refunds and unsubscribe flows are NOT APPLICABLE. No fake account system, analytics or cookie-consent banner added. Existing headers deny app camera access; the walkthrough shows using the phone's external camera, not browser camera permission.

## SEO, routes and deployment

- Unique homepage, app, privacy, terms and 404 titles; meaningful descriptions; app and error routes noindex.
- Build-time canonical and absolute Open Graph image/URL tags depend on SITE_ORIGIN. Social image added at /assets/social-share.jpg. Existing SVG favicon retained.
- robots.txt generated with app/API exclusions. llms.txt is factual informational guidance, not a ranking guarantee.
- sitemap.xml generated only with a validated public HTTPS SITE_ORIGIN; removed on unconfigured builds to avoid stale domains. No fake live domain included.
- Minimal factual WebApplication structured data, no ratings, invented company, local-business schema or contact details. JSON-LD script receives a matching CSP hash in the generated homepage meta policy.
- Node and Vercel /app routes serve the dedicated app HTML. Unknown routes serve the branded 404 with 404 status in local production checks. Live Vercel behavior has not been tested.
- VITE_SIGNAL_ORIGIN remains required for split Vercel/backend deployment; PUBLIC_ORIGIN is the actual frontend origin on the pairing server. TURN credentials stay server-only. SITE_ORIGIN is public SEO configuration.

## Privacy and legal

Privacy policy reviewed against components, transfer protocol, pairing server and ICE configuration. It describes page memory, saved downloads, transient room state, STUN/TURN metadata and possible provider logs. It does not claim anonymity, malware scanning, zero provider retention or legal compliance.

Terms added as a clearly marked draft: authorized sharing, room/transfer limits, recipient controls, ownership and service availability. No fabricated jurisdiction, liability waiver or company identity.

NEEDS OWNER CONFIRMATION before public release:
1. Operator identity and real privacy/support contact.
2. Actual frontend, pairing and TURN providers and their logging/retention policies.
3. Intended jurisdictions, target age policy and legal review of terms, privacy and mandatory consumer rights.
4. Asset provenance/licensing review for any previously supplied artwork; new studio imagery is generated, original SVG approximations are project-created, system fonts are used, dependencies retain their own licenses.

## Files changed / created in this pass

- src/landing.html: remove hero logo, improve demo screen-reader description.
- src/Story.tsx: concise closing and Terms link.
- src/deviceArtwork.ts: remove repeated demo logos and shorten labels to Demo.
- src/walkthroughCursor.ts: slower, shorter motion and gentler feedback.
- src/creative.css: simplified grid and compact sections; app H1/loading styling.
- src/main.tsx: lazy app route, route titles/descriptions, noindex.
- src/App.tsx: one primary H1 on real app page.
- public/privacy.html: corrected routes, description and Terms link.
- public/terms.html: draft factual terms with owner/legal TODOs.
- public/llms.txt: factual crawler guidance.
- public/assets/social-share.jpg: original social card.
- scripts/finalize-build.mjs: route documents, metadata, canonical/OG, JSON-LD, robots and conditional sitemap.
- scripts/scan-secrets.mjs: safe pattern-based current-file scan.
- scripts/check-release.mjs: repeatable production route/semantic/SEO/responsive checks.
- server/static.mjs and vercel.json: dedicated /app document routing.
- .env.example: public SITE_ORIGIN documentation.
- package.json: check:release and check:secrets commands.
- tests/browser/transfer.spec.ts: expected unique app title.
- design/release-checks.json and design/preview/drop-minimal.png: verification evidence.
- LAUNCH-REVIEW.md: this report. dist regenerated; no unrelated project files touched.

## Final launch checklist

COMPLETE AND VERIFIED: requested layout/branding reduction; Demo label; softened cursor; production build; local server protection tests; release route/metadata-generation/semantic/responsive checks; dependency audit; bounded current-file secret scan; source maps disabled; source-file exposure probes.

IMPLEMENTED BUT UNVERIFIED: live-host metadata/headers/redirect behavior, third-party crawler parsing, screen-reader/switch-device usability, field performance, real mobile hardware and external TURN behavior.

BLOCKED: public domain and deployment/relay credentials/configuration; repository history review (no repository); production cross-network/load/availability testing; production sitemap/canonical URLs until SITE_ORIGIN is configured.

NEEDS OWNER CONFIRMATION: identity/contact, provider logs/retention, intended age/jurisdiction, legal and supplied-asset review.

NOT APPLICABLE: purchase/refund flow, password hashing, database permissions/backups, admin login, marketing unsubscribe and generic thank-you page. No analytics/marketing cookies are installed by this app; jurisdiction-specific consent requirements still need owner/legal confirmation.

This is an implementation and scoped local review, not a security certification, legal-compliance guarantee or statement that the product is deployed or ready for unrestricted public scale.
## Subsequent visual update — 23 October 2026

Final requested palette: mocha #6F4E37, platinum #E5E4E2 and pale lavender #E6E0F0. Added src/premium.css, redesigned the connection map and page hierarchy, removed all pointer/touch transform listeners from the demo, changed both desktop and phone click feedback to measured SVG circle centers, and extended the motion regression test to verify the phone's lifted position. The original ribbon icon is retained.

Final validation: production build passed; 6 targeted motion/input/responsive tests passed on the final palette; 25 production page/viewport checks passed. The full 18-test browser suite passed immediately before the palette-only change. No backend or transfer-protocol change in this update. Evidence: design/preview/drop-mocha-room.png, drop-mocha-home.png and drop-mocha-mobile.png.
