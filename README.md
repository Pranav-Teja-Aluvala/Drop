# DROP v2 — local preview

Drop moves files, links and notes between up to three browsers in a temporary room. The v2 source is a local review build; the existing public beta has not been updated by this task.

## Run

Use Node 24 and run `npm ci`, then `npm run build` and `npm run preview:v2`. Open the printed localhost URL (port 5174 by default). `npm run dev` remains available for source development. For real phones, use HTTPS on a reachable host. A phone cannot reach your laptop through its own `localhost`.

The frontend is React/Vite; the single-process Express/WebSocket pairing service is in `server/`. The server keeps only temporary metadata in memory. Files and messages use direct WebRTC mesh connections. Each sender chooses one recipient. No file database, signup or tracking SDK is included.

## V2 flow

1. Create a room. A private QR/invitation appears with a random six-letter recognition name.
2. Scan from up to two other devices. On the owner’s screen, match that room name and allow each newcomer once.
3. Choose a connected recipient. Files need acceptance before download. Notes appear in the temporary chat, labelled by device.

The recognition name is not a join credential. A random private invite admits a join request; only the owner can approve it. Each device receives a separate private return credential held in page memory. Approved devices have up to ten minutes to return after hiding or losing the WebSocket. Resume rebuilds WebRTC links with fresh signaling epochs without another approval. Leaving explicitly removes the device; the owner ending/leaving/expiring closes the room.

V2 trusts the website and signaling service to introduce peers. The old independent certificate-code comparison is no longer in the user flow. This tradeoff is explained in the app help and privacy page. WebRTC still encrypts transport and verifies the certificate described by signaling.

## Practical limits

- Up to three total devices; two-hour rooms; ten-minute initial invitations.
- Files up to 50 MiB (labelled 50 MB), one active file per direction per link. No extension filter or automatic execution. SHA-256 receipt validation, not malware scanning.
- Chat latest 200 messages, file activity latest 40 entries. Transfers/downloads are in page memory; explicitly saved files stay on the device.
- Backgrounding does not guarantee ongoing transfer. A suspended retained page can return; reload/OS termination loses its memory credential. Interrupted files must be resent.
- No TURN relay configured. Some Wi-Fi/mobile/VPN/firewall combinations cannot connect. Free Render can sleep or restart; a restart loses rooms. Multi-instance deployment requires a shared coordination design before scaling.
- V1 endpoints remain temporarily for already-open old clients. V2 uses `/api/v2/rooms` and `/signal-v2` and does not mix protocols.

## Checks

`npm run build` — TypeScript, Vite, legal metadata and error assets.

`npm test` — V1 regression/security plus V2 admission, capacity, room isolation and return-window server tests.

`npm run test:beta` — current V2 browser flows, file-protocol safety, Contact and offline navigation. The script starts a fresh production server for each spec, keeping abuse quotas unchanged.

Set `PLAYWRIGHT_CHANNEL=chrome` to use an installed Chrome if the pinned Playwright browser is unavailable. The old V1 UI specs are kept in `tests/browser/` as historical specifications but excluded by the current testMatch; they no longer describe V2.

`npm run check:release` — public pages, metadata, headings, links, viewport overflow, CSP and known source-file probes. It accepts the same browser-channel environment variable.

`npm run check:secrets -- --history` — bounded secret-pattern scan, not a guarantee or independent audit.

Physical Android/iOS app-switching, screen lock, different-network routing and load testing are still release checks. This source update does not claim independent security certification.

## Deployment (after review)

Keep Vercel frontend plus a single Render Node service. Deploy the backend with V2 routes first, then the frontend. Configure exact HTTPS `PUBLIC_ORIGIN`, public `VITE_SIGNAL_ORIGIN`, and optional `SITE_ORIGIN`. Use existing provider settings; never place secrets in VITE variables. No paid relay or plan is enabled by the source changes. Rollout restarts can close old rooms.

404/offline artwork is preserved. `/room-expired.html` and `/connection-help.html` reuse it with recovery actions. Offline navigation needs a prior successful online service-worker installation. Only its error screen, script and favicon enter Cache Storage.

Personal contact/maintainer details appear on `/contact.html`. Legal pages link there and describe actual V2 behavior. No cookie banner or refund process is added for features the app does not have. Jurisdiction-specific legal review remains the owner’s responsibility; the copy does not assert universal compliance.
