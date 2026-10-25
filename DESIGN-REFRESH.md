# DROP calm design refresh — 23 October 2026

Replaced the layered colour-theme treatment with a single warm-white/charcoal system, a small periwinkle connection accent, soft borders, clear typography and natural shadows. The original ribbon mark stays unchanged. No decorative gradients added.

The homepage follows the saved design concept: centred opening, one contained demo with a separate caption rail, three unboxed steps, a compact privacy band and restrained closing. The real app follows its own saved concept: a left-side orientation and a focused pairing panel, with transfer controls visible after both devices confirm. The hidden controls remain disabled before verification; no protocol or authorization changes were made.

Removed imports of brand.css, landing.css, landing-polish.css and creative.css; their old files are retained as unused historical sources. Replaced premium.css with the active complete design system. Built CSS fell from ~75 KB to ~29.4 KB.

Changed source: src/main.tsx, src/premium.css, src/App.tsx, src/components.tsx, src/landing.html, src/Story.tsx, src/deviceArtwork.ts. Updated static policy styles and index theme colour. Updated tests/browser/landing.spec.ts and transfer.spec.ts for the new breakpoint and the intentionally hidden disconnected transfer controls.

Verification: production build passed. The full browser pass had 17 passing tests and one obsolete visible-control selector in mismatch rejection; that selector was corrected and all 3 transfer tests then passed. Final navigation/reduced-motion/input checks passed (7 selected tests). Production checks passed for 25 route/viewport combinations (320,390,768,1024,1440). Cursor/tap alignment and no-touch-response tests passed in the broad run. No backend code changed. Final legal/deployment blockers remain as described in LAUNCH-REVIEW.md.

Design evidence: design/connection-concept.png and design/landing-concept.png, created with the built-in image generation tool. Prompt briefs: a complete white/charcoal Drop homepage with one photographic demo, no repeated device scenes or fictitious features; a complete white/charcoal app onboarding screen with actual Create/Join controls and clear pairing steps. Generated concepts are references only, not production UI screenshots. The original image files remain in the Codex generated_images folder.

Rendered evidence: design/preview/drop-calm-room.png, drop-calm-home.png, drop-calm-hero.png and drop-calm-mobile.png. Screenshots and concepts were visually inspected. No public deployment performed.
