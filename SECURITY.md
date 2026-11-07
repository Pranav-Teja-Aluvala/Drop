# Security

## Report a vulnerability

Contact the maintainer privately through [sharEEm support](https://shareem.vercel.app/contact.html). Include the affected version, browser, reproduction steps using synthetic files, and the impact. Keep live invite URLs, room credentials, personal files and tokens out of public issues.

## Trust boundaries

- A six-letter name helps people recognize a room. A high-entropy invitation and an explicit approval from the room owner admit a new device. Guard the QR and the invitation link.
- The website and signaling service are trusted to introduce the intended peers. WebRTC encrypts traffic in transit. V2 does not perform an independent human comparison of device fingerprints.
- Files require recipient acceptance. sharEEm checks the received bytes with SHA-256 and offers a download. A successful integrity check says nothing about whether opening the file is safe.
- Room state and return credentials are temporary. A restarted server loses its rooms. A browser reload can lose the local device credential, unsaved downloads and chat history.
- Exact-origin checks protect browser entry points. Rate limits, bounded signaling messages and membership checks restrict abuse. Only configure trusted proxy CIDRs after verifying the actual network path.

## Verification

Run the server suite, production-build browser tests, dependency audit and secret scan described in [the README](README.md#verification). The tests use synthetic files. Security-sensitive changes should cover both successful use and an unauthorized or malformed request.
