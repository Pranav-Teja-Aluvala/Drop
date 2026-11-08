# Architecture and protocols

[← Back to Drop](../README.md)

<details>
<summary><strong>Connection architecture</strong> — From invitation to encrypted channel</summary>

```mermaid
sequenceDiagram
    participant O as Owner browser
    participant S as Pairing service
    participant G as Joining browser
    O->>S: POST /api/v2/rooms
    S-->>O: Room ID, invitation, code, owner credential
    G->>S: Join with code or private invitation
    S-->>O: Pending device request
    O->>S: Approve this device
    S-->>O: Approved peer and ICE configuration
    S-->>G: Approval and ICE configuration
    O->>S: SDP offer and ICE candidates
    S->>G: Forward connection details
    G->>S: SDP answer and ICE candidates
    S->>O: Forward connection details
    O<<->>G: Establish WebRTC data channel
```

**Admission.** The five-digit code finds a room. The six-letter name is a screen comparison aid. Owner approval grants admission, and each device receives a separate return credential.

**Network discovery.** ICE selects a route, using STUN to discover network addresses. The public deployment has no TURN relay, so some mobile networks, VPNs and firewalls cannot connect.

**Recovery.** A tab session credential can restore an approved connection within the ten-minute return window. Room membership lives in one server process. Server restarts clear active rooms; independent replicas cannot share this registry.

Implementation entry points are the [room lifecycle](../src/useRoom.ts), [pairing service](../server/v2.mjs) and [ICE configuration](../server/ice.mjs).

</details>

<details>
<summary><strong>Transfer protocol</strong> — Offer, accept, stream, verify</summary>

```mermaid
sequenceDiagram
    participant S as Sender
    participant R as Receiver
    S->>S: SHA-256 of original file
    S->>R: JSON offer — name, size, ID, hash
    alt Manual acceptance
        R->>R: User accepts the file
    else Automatic acceptance enabled
        R->>R: Accept from this approved peer
    end
    R->>S: Accept
    loop File content
        S->>R: Binary chunks up to 16 KiB
    end
    S->>R: End-of-file control message
    R->>R: Reassemble and verify SHA-256
    alt Hash matches
        R->>S: Verified receipt
        R->>R: Offer Save file
    else Hash differs
        R->>R: Fail transfer and withhold download
    end
```

| Layer | What Drop uses it for |
| :--- | :--- |
| **HTTPS / WSS** | Serve the application and coordinate room admission and WebRTC signaling. |
| **SDP / ICE / STUN** | Exchange connection descriptions and candidates, then find a network route. |
| **RTCDataChannel** | Carry file metadata, binary chunks and messages over an ordered, reliable channel. |
| **SCTP / DTLS** | Browser-managed data-channel transport and encryption in transit. |
| **Web Crypto / SHA-256** | Hash file contents and verify received bytes before exposing a download. |
| **JSON control messages** | Offers, acceptance, cancellation, receipts and message acknowledgements. |

The [transfer implementation](../src/transfer.ts) applies file-size limits, buffered-data backpressure, timeouts and integrity checks. Interrupted files must be sent again.

</details>

<details>
<summary><strong>Data lifecycle and trust boundaries</strong> — Where things live</summary>

| Location | What lives there | Lifetime |
| :--- | :--- | :--- |
| Browser memory | Files, unsaved downloads and chat | Until reload, page termination or room cleanup |
| Tab session storage | Room return credential and owner invitation | Cleared when ending the room; server expiry remains authoritative |
| Pairing service memory | Membership, invitation codes, credentials and signaling state | Room expiry or server restart |
| Device storage | Files explicitly saved by the recipient | Until the user removes them |

The pairing service has no file store. The site and pairing service are trusted to introduce peers. Files and archives are not scanned for malware, and local browser storage is not a separately encrypted vault.

</details>

