# DROP security model

## Implemented protections

See [the dated review](SECURITY-REVIEW-2026-10-22.md) for confirmed findings, test evidence and outstanding launch gates.

- No public device listing; pairing requires a random 256-bit invitation, a distinct owner credential, and host approval.
- Four-character room names are recognition labels, unique only among active rooms in this process. They cannot join or look up rooms and do not replace the certificate comparison. Approval is bound to the current guest request using a random nonce.
- Exact file-chunk lengths bound receiver object counts; completion is processed once. Filename checks apply both before and after normalization. Role-specific signaling validation, one SDP description per peer, bounded ICE candidates, a single data channel, HTTP timeouts and signaling-buffer limits constrain peer abuse.
- Optional explicit trusted-proxy CIDRs resolve client addresses for both HTTP and WebSocket quotas. Forwarded headers are ignored by default; production proxy topology must be verified.
- Unused invitation timeout: 10 minutes. Room timeout: two hours from creation. Approval consumes the invitation; rejection revokes the room. Disconnection ends a paired room.
- Standard browser WebRTC/DTLS transport encryption. No custom encryption algorithm.
- Before starting the transfer protocol, both people compare eight groups of four hex digits derived from SHA-256 of the sorted, distinct SHA-256 DTLS certificate fingerprints, with the room ID and a version/domain prefix. The first 128 digest bits are displayed. Missing, ambiguous or reflected fingerprints fail closed. A 90-second gate accepts only a matching verification message and requires both local and remote confirmation. Unexpected traffic and mismatch close the room. Unexpected renegotiation is rejected.
- This certificate comparison is a new application feature, not an externally audited protocol. It depends on users comparing every group through the two physical screens or an independent trusted channel. It does not establish a person's legal identity. An attacker who controls the served JavaScript can change the display and checks, so secure hosting and the software supply chain remain essential.
- Receiver acceptance, fixed-size file chunks, backpressure, length checks and SHA-256 receipt checking. Files are downloaded as opaque bytes with explicit user action, never automatically opened or rendered as HTML.
- All file extensions and binary contents are allowed at the owner’s request. Filename normalization removes OS-invalid/path/control characters, handles Windows reserved names and preserves ordinary extensions when truncating long names. There is no extension denylist, binary signature filter, antivirus or archive inspection. Every file still requires explicit recipient acceptance and save. Received data is an application/octet-stream Blob and is never automatically rendered, opened or executed. A recipient who later opens a program or malicious document can still compromise their device; DROP does not certify file safety.
- Exact-origin checks, short-lived coturn credentials when configured, server and data-channel control-message limits, bounded room/file buffers, no automatic clipboard reads, no app cookies/analytics, no persistent file database.
- Production origin validation requires HTTPS. HSTS and other headers exist; deployment certificate validation and relay testing are release gates, not completed claims.

## Room uniqueness and scaling

Room IDs, owner credentials and invitations use 32 cryptographically random bytes (256 bits each). Allocation checks the active room map and retries collisions; repeated random-source failures return an error instead of replacing an existing room. Allocation is synchronous within one server process. Expired IDs are not stored forever, so historical or cross-deployment uniqueness is probabilistic, not an absolute guarantee.

Confirmation codes also include the room ID, so reusing the same certificate pair in another room changes the derived value. The displayed value remains 128 bits. It is deliberately not shortened to four characters or weakened according to traffic. Matching codes across unrelated rooms would not grant room access: separate room credentials and peer approval are still required.

This is not a massive-scale deployment. The default cap remains 1,000 active rooms per process. Multiple replicas need coordinated room routing, atomic allocation in a shared ephemeral registry, and distributed quotas; simply starting replicas behind a load balancer will not work. Such a registry need not contain file data. Load tests, relay capacity/cost checks and production monitoring remain release work. The 10,000-identity test checks allocation only, not 10,000 live connections.

## Network and endpoint exposure

The website host, signaling service, STUN service, optional TURN relay and intended peer can receive network metadata. Direct connections can reveal a peer's IP address. Encryption does not conceal traffic timing/volume. A relay can limit direct peer exposure when configured, but it still sees IP addresses itself; this app does not promise anonymity. No relay is configured by default.

Files and notes live in browser-managed memory/blob storage until a new room or page close. End room stops transfers but leaves completed downloads available on the open page. Saved downloads persist. Cleanup is not guaranteed forensic erasure.

No independent penetration test, formal crypto review, production TLS check, real relay test or malware-scanning certification has been completed. Compromised endpoints and malicious website code remain out of scope for browser-only protections. The current version should not be marketed as having Quick Share-equivalent security.

## References

- Google documents encrypted sharing, recipient acceptance and PIN comparison: https://support.google.com/android/answer/13801258
- WebRTC security architecture and trust boundaries: https://www.rfc-editor.org/rfc/rfc8827.html

## Tests

Run `npm test` and, with the dev server running, `npm run test:e2e`. Tests cover invite/room access, expiration, revocation, third-peer rejection, HTTPS configuration validation, certificate comparison, pre-verification payload rejection, mutual confirmation, mismatch cancellation, all-extension opaque downloads and OS-safe filename normalization, ordinary verified binary transfer, long Unicode notes and mobile layout. Synthetic fixtures are used; no user files are uploaded for security testing.
