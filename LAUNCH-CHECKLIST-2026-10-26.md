# DROP checklist audit — 26 October 2026

Scope: existing Drop app and public website; no unrelated projects. Initial inventory was completed before edits, followed by the requested applicable polish passes. This is a scoped engineering review, not an independent penetration test, legal opinion or WCAG certification.

## Findings ranked by first-visit trust

1. **Partial — connectivity and availability.** Direct-only operation and the free pairing host can prevent or interrupt connections. No TURN or paid plan was activated, per the owner's decision. Public-scale capacity, actual proxy/client quotas and physical-phone/network tests remain open. This is a beta, not an always-on service guarantee.
2. **Fixed — mobile usability.** Baseline homepage/app/error copy was 10–15 px and several links had sub-44 px targets. Added 16 px mobile text and 44 px targets, including connected Files/Chat/verification states; muted tracker/legal text was darkened. Tested 390 px viewport overflow and primary CTA visibility. The SVG demo is decorative and excluded from interactive-text checks.
3. **Fixed — SEO/navigation completeness.** Added favicon PNG/ICO/touch variants, legal breadcrumbs with factual BreadcrumbList microdata, fuller social metadata, a distinct 404 description and current llms.txt. Metadata generation is repeatable without duplicate canonical/schema tags. Existing WebApplication schema is retained; no invented local-business schema, address or reviews.
4. **Fixed — contact repetition.** The email is visible only on Contact. Privacy, Terms and Cookies link there; Home/App Contact links now open it. Added safe explicit-copy feedback. No email was sent by this audit, and mailbox deliverability has not been independently tested.
5. **Partial — legal and asset assurance.** Factual policies/contact exist. Jurisdiction/age obligations, provider retention settings, support-email retention and supplied-brand rights require owner/qualified review. Runtime dependency notices are provided; this does not establish ownership of supplied art or grant an open-source license for project code.

## Item inventory

| Checklist item | Before | Result / evidence |
| --- | --- | --- |
| Custom domain | Missing | Existing free Vercel HTTPS address works. Desired short aliases were unavailable; buying a domain/DNS changes were not authorized. |
| Source/setup documentation | Present | Public repo, README, deployment and release documents; QA screenshots now use OS temp paths rather than source assets or Windows-only paths. |
| Unique titles, descriptions, canonicals | Partial | Public titles <60 characters; descriptions 120–155; validated production-origin canonicals. App/error routes remain noindex; their private/error URLs are not added to the sitemap. |
| One H1 / custom 404 / internal links | Present | Runtime/page checks plus new Contact and legal breadcrumbs. The marketing page is client-rendered, with build-time SEO/social metadata. No SSR or search-ranking claim is made. |
| Structured data | Partial | WebApplication and legal BreadcrumbList; LocalBusiness is not applicable to this online utility without real business/location facts. |
| Sitemap, robots, llms, favicon, social image | Partial | Completed/updated, including icon set and social-image alt/Twitter tags. No large assets were found that required recompression. |
| Console errors, exposed files, source maps | Present | Runtime tests and known source/env/.git probes; production build is checked for absence of .map files. |
| Bundle size | Present | Transfer route has its own entry. Current JS output is approximately 95 kB gzip for transfer entry/shared/app scripts and 119 kB gzip for landing/shared scripts, excluding CSS/images. No Lighthouse or field-performance score was invented. |
| Secrets / environment / Git history | Present | Pattern-based current-file and reachable-history scans. Vercel lists only public endpoint/canonical build variables; no secret VITE variable was added. Server secrets were not exported. No exposed credential was confirmed and no rotation was prescribed. Any actual historical exposure requires revocation/rotation, not deletion alone. |
| Authentication / authorization | Present | Distinct random room/invite credentials, host approval, both-device certificate comparison, third-peer rejection, expiry and replay/room-isolation tests. No unnecessary user accounts were added. |
| Input/XSS/API/CORS/rate limits | Present/partial | Plain-text chat, safe download names, recipient acceptance, bounded payloads/buffers, exact-origin CORS and local adversarial tests. Proxy quotas, edge abuse controls and real capacity remain deployment review items. |
| Security headers / production debug | Present | CSP, frame denial, nosniff, HSTS and no public debug/server source routes; Contact allows its own small copy script. |
| Dependencies | Present | Lockfile retained; npm audit checks known advisories. No arbitrary major upgrades or extra runtime dependencies. Added first-party Actions pinned to verified commit SHAs. |
| Admin / password hashing / database / upload backups | N/A | No admin account system, passwords, database or hosted file store. Users save their own downloads. |
| Privacy / terms / contact | Present | Updated to actual ephemeral room/chat/file handling and actual providers. Email is centralized on Contact as requested. No invented company registration, street address or compliance guarantee. |
| Refunds / marketing unsubscribe | N/A | No purchases, subscriptions, checkout, marketing list or marketing emails. |
| Cookies / consent / analytics | Present/intentionally off | No app tracking cookies or analytics SDKs. No fake banner and no analytics added to a privacy-oriented tool. Provider-controlled metadata/security technologies are disclosed separately. |
| Data deletion | Partial | New room/page close clears unsaved app state; downloads are controlled by users; privacy requests go to Contact. Provider logs and support correspondence need a documented operational retention/review process, not a fictional delete-account button. |
| Children / jurisdictions | Needs review | Intended markets and age policy are not specified. No age, jurisdiction, liability waiver or compliance declaration was invented. |
| Asset/font licensing | Partial | System fonts; dependency notices generated from installed runtime packages. Owner must verify supplied brand/art rights and choose a project-code license before describing the repo as open source. |
| Mobile text / tap targets / overflow | Fixed | 390 px public pages, contact, private onboarding/verification, connected Files and Chat checked. Other widths are covered by the release suite. Physical Android/iOS/browser-download behavior is not certified by emulation. |
| Keyboard / reduced motion / contrast | Present/improved | Tabs, native dialog escape/focus behavior, focus outlines and reduced-motion behavior retained. Targeted muted text contrast improved; no full screen-reader/WCAG certification claimed. |
| Forms: loading, error, success | Present | Room opening/join/recovery, file preparation/acceptance/progress, message delivery and clipboard feedback. Clipboard UI tests use an isolated stub and do not inspect the person's OS clipboard. |
| Thank-you page / spam form protection | N/A | No public lead/contact-submission form. Room/chat flows show their real success states without redirecting away from an active transfer. Public pairing API has quotas. |
| Primary CTA / performance / image alt | Present | Mobile primary CTA visibility, meaningful image attributes and runtime checks. No extra sticky CTA or animation library was added. |
| Automated regression protection | Missing | Added push/PR GitHub workflow: production build, server/browser checks, release audit, dependency audit and history-pattern scan. Remote execution status is recorded separately; local equivalence is not claimed as a GitHub run. |

## Legal/provenance uncertainties to review

- Maintainer/contact was supplied by the owner; no registered entity/address is assumed. The exact email appears only on Contact; policy links lead directly there.
- Provider operational logs/retention may outlive room expiry. No forensic-erasure or anonymity promise is made.
- Support-email retention has no fixed period yet and is disclosed. Review deletion/retention handling against applicable duties.
- Target jurisdictions, age/children rules, consumer rights, liability/termination terms and sufficiency of linked contact details require qualified review.
- Prior handoff documents describe generated/project-created visuals; rights in supplied branding were not independently verified. Public repository visibility is not an open-source license.
- GSAP uses its own standard license; Lucide uses ISC and other packages retain their upstream terms. Notices are not a legal compatibility certification. References: https://webflow.com/blog/gsap-becomes-free and https://lucide.dev/license.

## Verification and remaining work

Run `npm run build`, `npm test`, `npm run test:beta`, `npm run check:release`, `npm audit`, `npm run check:secrets -- --history`, and `npm run check:live`. Production SITE_ORIGIN must be configured before deployment. Browser plugin unavailable; Playwright Chromium used. Live tests use synthetic fixtures, not personal files.

Before broad promotion: one real phone/laptop QR/send/save/backgrounding test; confirm proxy/client quotas and capacity; decide whether to fund TURN; verify legal/asset decisions and choose an available domain if desired. No paid activation, independent pentest or physical-device certification was performed.

Final test/deployment results and the changed-file list are appended after rollout.

## Local verification results

- Production build/TypeScript passed.
- Server/security tests: 27/27 passed.
- Browser/protocol tests: 24/24 passed, including Contact-only email, mobile typography/targets, all-extension downloads, chat/reset, copy success/denial and code mismatch.
- Local page/viewport checks: 35/35 passed; title/description lengths, idempotent canonicals, social tags, breadcrumbs, no source maps and source-file probes checked.
- Dependency audit: zero known advisories. Current files/reachable Git diffs: no matches with the configured secret patterns.
- GitHub workflow and hosted rollout are pending verification at this point; final results follow below.

## Changed files

- `.github/workflows/checks.yml`
- `LAUNCH-CHECKLIST-2026-10-26.md`
- `LAUNCH-REVIEW.md`
- `README.md`
- `RELEASE.md`
- `app/index.html`
- `index.html`
- `package.json`
- `public/apple-touch-icon.png`
- `public/assets/contact.js`
- `public/assets/legal.css`
- `public/contact.html`
- `public/cookies.html`
- `public/favicon-16.png`
- `public/favicon-32.png`
- `public/favicon.ico`
- `public/icon-192.png`
- `public/icon-512.png`
- `public/llms.txt`
- `public/privacy.html`
- `public/terms.html`
- `public/third-party-notices.txt`
- `scripts/check-live.mjs`
- `scripts/check-release.mjs`
- `scripts/finalize-build.mjs`
- `scripts/generate-icons.mjs`
- `scripts/generate-notices.mjs`
- `src/App.tsx`
- `src/Story.tsx`
- `src/premium.css`
- `tests/browser/connection-ux.spec.ts`
- `tests/browser/contact.spec.ts`
- `tests/browser/file-types-chat.spec.ts`
- `tests/browser/helpers/mobileQuality.ts`
- `tests/browser/mobile-quality.spec.ts`
- `tests/browser/transfer.spec.ts`
- `vercel.json`
