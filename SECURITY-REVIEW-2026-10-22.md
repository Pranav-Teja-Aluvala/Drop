# DROP security review — 22 October 2026

## Verdict

Suitable for continued local/private testing. **Not yet cleared for an unrestricted public launch.** This is a source review and automated local adversarial test pass, not an independent penetration-test certification or proof of no vulnerabilities. Frontend polish is not the only remaining work.

## Confirmed findings and fixes

| Priority | Finding and precondition | Fix and evidence |
| --- | --- | --- |
| High | A holder of the full invite could replace a guest that disconnected while the host was approving; the delayed approval applied to the replacement. The certificate comparison still limited silent data interception. | Approval/rejection now includes a per-request random nonce. A regression test failed before the fix, then passed. A stale approval produces a fresh-review message and cannot approve the replacement. |
| High | After a recipient accepts a file, a malicious peer could send unlimited zero-byte chunks or huge numbers of tiny chunks, allocating unbounded array entries relative to the byte cap. | Exact protocol chunk lengths are enforced, including a nonzero size and bounded final chunk. The regression test failed before the fix, then passed. |
| Medium | Sanitizing/truncating a long filename could leave an executable extension even when the original name ended in an allowed extension. | Both original and normalized download filenames are checked. A crafted `.exe.txt` truncation test passes. This remains a heuristic, not malware scanning. |
| Medium | Loose signaling validation allowed invalid description types, duplicate descriptions, excess queued ICE candidates and extra channels. | Role-specific offer/answer validation, description-once rule, candidate limits, field limits and single transfer channel checks. Server tests confirm malformed/duplicate signaling closes the affected room while another room remains intact. |
| Defense in depth | Repeated completion messages could start redundant asynchronous hashing; slow signaling readers could grow output queues; production CSP permitted arbitrary WebSocket origins. | Finalization lock, bounded signaling output buffer, HTTP timeouts, and production same-host WSS policy. |

## Four-character names

Names such as `XCMD` are labels only. They are allocated without active collisions in this single process, released when rooms end, and may be reused later. There is no name-based join, lookup or room-list API. A name is never accepted as a credential. Multiple deployments do not share the name registry.

Both devices show the same name for recognition. **It does not replace comparison of the certificate-derived security code.** Automatic equality checks performed through an untrusted connection alone cannot establish that it is the intended device. The UI keeps both confirmations and explains the distinction.

## Test results

- Production frontend build: passed.
- 23 server/allocation/HTTP/WebSocket tests: passed.
- 8 security/transfer protocol tests and 3 browser workflow tests: passed.
- Browser workflow: independent contexts, two-way transfer with actual downloaded byte comparison, long Unicode notes, rejection, mismatch closure, identical room names, and disabled transfer controls before mutual confirmation.
- Local UI inspection: room name and QR render at desktop width; console showed no errors/warnings. Automated mobile baseline: 390px, no horizontal overflow.
- `npm audit` and production-only audit: no known dependency vulnerabilities reported. This is not a source-code security verdict.
- 10,000 identities generated successfully in an allocation test. This is **not** a 10,000-user load test.
- Recognizable secret-pattern scan of project source/config found no matches. Only `.env.example` exists. No Git repository/history exists here, so historical secret scanning was not possible. Pattern scans cannot find every possible secret.

Attack cases cover cross-room token use and routing, third-device rejection, unknown/expired/revoked invites, generic authentication errors, foreign/missing origins, wrong upgrade paths, malformed/binary/oversized frames, authenticated message floods, capacity/IP quotas, spoofed forwarding headers, malformed SDP/ICE, repeated descriptions, pre-verification data, executable offers, altered bytes, chunk abuse, and normalized filenames. Tests use synthetic local data; no third-party service was attacked.

Production-file routing was exercised in the test harness: the homepage loads, while `.env`, `.git`, backend/frontend sources, package metadata, absent source maps and room enumeration paths return 404. This is not a live production TLS test. Unknown `/api` routes return JSON 404 instead of falling through to the frontend.

## Deployment and account requirements

- End users: no account, password, OAuth or API key.
- Operator: an HTTPS Node/WebSocket host (a hosting-provider account, or your own infrastructure). The app has a required pairing server; it is not a static-only website or offline app.
- Set `PUBLIC_ORIGIN` to the exact production HTTPS origin, with no trailing slash. Never publish the Vite development server as production.
- Set `TRUSTED_PROXY_CIDRS` only to verified ingress proxy addresses/ranges whose forwarding policy is understood. By default forwarded IP headers are ignored. Never trust every address. A wrong setting either groups users under a proxy IP or lets attackers bypass per-IP quotas. HTTP and WebSocket use the same resolver; nearest-untrusted-hop and spoofing tests pass locally.
- Optional for some networks, important for general availability: a TURN relay. The current adapter supports coturn REST shared-secret credentials via server-side `TURN_SECRET` and `TURN_URLS`. A managed provider may require an account and a different API integration; do not assume arbitrary provider credentials work. The shared secret is never sent to clients; temporary credentials are.
- No database stores files. Current signaling/room state is in server memory. Files remain in browser-managed memory/blob storage and any explicit user downloads. Hosting/STUN/relay metadata is separate from file contents.

## Public launch gates still open

1. Deploy production over HTTPS and verify real certificates, WSS, headers, origin checks, source exposure and proxy-IP behavior against that deployment. The earlier separate local production-server command was blocked by automatic approval review; no workaround was used. This pass tested production static routing through the test harness, not that launch command or public infrastructure.
2. Configure TURN; prove a forced-relay transfer and temporary-credential expiry, set bandwidth/spend limits, and test Wi-Fi-to-mobile-data and target browsers/phones.
3. Load-test the actual host. Current default is 1,000 rooms per process, with bounded memory and rejection at capacity, not a tested service-level capacity. Room-creation quotas, host edge throttling/DDoS protection, operational monitoring and restart behavior need deployment validation. Do not log invites, tokens, SDP, notes or file contents.
4. Multiple replicas require coordinated ephemeral room routing/allocation and distributed quotas. No such architecture is deployed. Restarts intentionally lose rooms; no durability or uptime guarantee exists.
5. Independent review is recommended before broad promotion. Keep dependency updates and a security contact/process in place.

An invited malicious peer can still send a harmful allowed file or cause its own connection to fail. A stolen full invite can request entry; users must approve the intended device and compare its code. A compromised website/browser can defeat checks implemented by that website/browser. IP addresses and traffic metadata are not hidden. None of these are solved by a four-character room name.

Reference used for the test plan: [OWASP WebSocket Security Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/WebSocket_Security_Cheat_Sheet.html).
