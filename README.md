# DROP

Move a file, link or note between two devices in a temporary room. No recipient signup. React/TypeScript UI, a small Node pairing server, and WebRTC data channels.

**Status:** direct-only public beta at https://drop-devs-52b0.vercel.app. Free, no signup. Some networks cannot connect without a relay. Physical-phone and cross-network certification, independent security review and capacity testing remain pending; see [RELEASE.md](RELEASE.md).

Support/privacy: pranavteja.dev@gmail.com. Do not send private files, invite links or security codes.

## Run

Node 24 LTS recommended.

```sh
npm ci
npm run dev
```

Open http://localhost:5173. Create a room. Open its invite in a second browser/window (or scan the QR). The joining device automatically requests access; check the room name on both screens, then approve it on the first window. Compare all eight groups of the verification code on the two screens, then select Codes match on both. Only then choose a file, accept it on the receiver, wait for Received, and select Save file. Text is sent explicitly, not synchronized with the system clipboard.

The QR contains the same invite. **A phone cannot reach your computer through `localhost`.** Deploy with HTTPS for actual phone pairing. HTTP LAN addresses are not secure contexts and this app intentionally refuses transfer there. Do not market localhost testing as phone/network testing.

## Verify

```sh
npm run build
npm test
npx playwright install chromium
# With npm run dev running in another terminal:
npm run test:e2e
# Or test the built production assets without a separate dev server:
npm run test:beta
```

Tests cover server origins/room ownership/third-peer rejection/expiry and two independent browser contexts transferring verified binary bytes, a zero-byte file, text rendered as text, rejected files, disconnects, and a 390px layout. Playwright uses synthetic test data only. Actual phone testing remains required.

## Design

The primary design reference is [design/concept.png](design/concept.png); decisions and functional deviations are in [design/brief.md](design/brief.md). QR codes and transfer progress are generated from real runtime state. No static mockup is shipped as UI. Browser chrome in the concept is intentionally omitted.

## Architecture

1. POST /api/rooms creates a cryptographically random room, owner credential and invitation credential. Credentials are distinct.
2. Each browser joins /signal over WebSocket. The invitation lives in the URL fragment (not the HTTP request path). Treat it as a secret: anyone with it can request to join.
3. Only the host can approve one guest. The server then relays SDP and ICE connection information. No file bytes or note contents go through this signaling server.
4. An ordered, reliable RTCDataChannel carries explicit offers, acknowledgements, 16 KiB chunks and text. Sender backpressure bounds the channel queue. Receiver verifies byte count and SHA-256 before exposing a download; sender waits for receipt acknowledgement.
5. Room expiry or a paired peer leaving ends the session. Rooms are memory-only; restarting the server clears them. No resumable transfers or offline delivery in v0.1.

WebRTC encrypts transport. Before enabling transfers, both users must compare and confirm a 128-bit displayed value derived from SHA-256 over the room ID and both DTLS certificate fingerprints. A substituted peer certificate changes the comparison code. This is a manual certificate comparison, not an authenticated account identity or a guarantee of equal security to Quick Share. Correct human comparison, an uncompromised browser, and trustworthy delivered website code are required. A compromised website can defeat its own checks. This is not an anonymity tool. See SECURITY.md and the in-app disclosure.

## Limits

- Two devices, 2-hour room lifetime, one active file in each direction.
- Unused invites expire after 10 minutes. Approval consumes the invite; rejecting pairing revokes the room. Verification must finish within 90 seconds.
- All file extensions and binary contents are allowed, including programs, scripts and archives. File names are normalized for safe OS-compatible downloads. Nothing is automatically previewed or executed, and nothing is scanned for malware.
- 50 MiB per file. Received files are buffered in memory. At most 20 retained downloads / 150 MiB per receiver per room.
- Files and Chat have separate tabs. The room retains up to 40 file activity entries and the latest 200 sent/received messages in memory. Save files or copy messages before creating a new room.
- Notes up to 50,000 characters. Clipboard access happens only on Copy; no clipboard monitoring.
- Background tabs, locked phones and network changes can interrupt transfer. No retry/resume promise.
- No relay is configured by default. A direct connection may fail even on some Wi-Fi networks.
- In-memory rooms require one server instance; horizontal replicas need shared room routing/state first.
- Local IP-based quotas are conservative. Behind a proxy, configure a trusted edge rate limit; do not blindly trust client-supplied forwarded IP headers.

## Deploy the complete application

Chosen Vercel + Render beta setup: follow [DEPLOYMENT.md](DEPLOYMENT.md). Vercel serves the frontend; Render runs the single-instance pairing service.

### Suggested free beta: Render

The included render.yaml describes one free Node Web Service. Push this folder to its own GitHub repository, connect it through Render's Blueprint flow, and set PUBLIC_ORIGIN to the exact assigned HTTPS origin (no trailing slash). Alternatively create a Web Service manually with build command `npm ci && npm run build`, start command `npm start`, and health path `/api/health`. Render supplies PORT. Use the public URL on both devices, not localhost.

Render's free service can sleep after 15 minutes without inbound HTTP/WebSocket traffic and may restart. A restart loses all rooms. It is suitable for a beta, not a guarantee of two-hour uptime. Keep within hosting quotas; review billing settings before adding a payment method. No Render deployment or account has been created by adding this file.

After the frontend changes are finished: publish GitHub, deploy HTTPS, configure a tested relay, verify Wi-Fi-to-mobile-data transfer, then record the launch demo. A TURN relay is a separate service from the website/pairing host.

This repository is a Node service, not just a static Vite site. Use an HTTPS host supporting long-lived WebSocket connections and a single instance. The Dockerfile builds and serves the UI with the pairing server. Choose a provider/account first; no external account has been created or charged.

```sh
npm ci
npm run build
# Set PUBLIC_ORIGIN to the exact public origin, no trailing slash.
# Set PORT if your provider requires it.
npm start
```

On PowerShell, use `$env:PUBLIC_ORIGIN = 'https://your-host.example'` before `npm start`. The production server fails closed when PUBLIC_ORIGIN is missing. Environment variables are read from the host/shell, not automatically from .env. Health endpoint: /api/health. Production source maps are disabled. No frontend secrets.

### Relay options

The built-in optional adapter supports **coturn REST authentication**: configure server-only TURN_SECRET and comma-separated TURN_URLS. It returns short-lived credentials only after host approval. Never use long-lived static TURN credentials in the frontend. Test relay use with a forced-relay browser configuration before declaring cross-network support.

Cloudflare TURN now has a server-side adapter using CF_TURN_KEY_ID and CF_TURN_API_TOKEN. Request validation is tested with mocks; real credentials and relay connectivity remain untested. Official pricing checked 22 October 2026 lists 1,000 GB/month shared free Realtime allowance, then $0.05/GB egress. Account eligibility, billing setup and limits must be checked before connecting it; no spending is authorized by this repository. See https://developers.cloudflare.com/realtime/sfu/platform/pricing/ and https://webrtc.org/getting-started/turn-server.

## Security and publication

Origin validation, random 256-bit room credentials, host approval, two-peer limit, room expiry, WebSocket payload/rate limits, file/room memory caps, safe text rendering and security headers are implemented. This is not a complete external security audit. Hostnames and providers are deliberately not invented.

Production startup additionally requires an exact HTTPS origin. This validates configuration; HTTPS certificates and proxy behavior must still be verified on the deployed host. Both-device certificate confirmation, pre-verification traffic rejection, invite revocation, control-message flood limits, filename normalization and executable checks are covered by automated tests. Do not describe these checks as antivirus or independent security certification.

Before public GitHub publication, choose a license and owner, add CI, review repository contents, and finish the release gates. Before inviting broad public traffic, review relay abuse/billing controls and host rate limiting. No analytics or payment integration is installed.
