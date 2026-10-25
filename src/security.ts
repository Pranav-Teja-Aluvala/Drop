/** Bind the human comparison to both DTLS certificate fingerprints, not to the room/server. */
export async function connectionCode(local: string, remote: string, roomId: string): Promise<string> {
  if (!/^[A-Za-z0-9_-]{43}$/.test(roomId)) throw new Error('Invalid room identity');
  const fingerprint = (sdp: string) => {
    const matches = [...sdp.matchAll(/^a=fingerprint:sha-256 ([A-Fa-f0-9:]+)\r?$/gm)].map(m => m[1].replaceAll(':', '').toUpperCase());
    const unique = [...new Set(matches)];
    if (unique.length !== 1 || !/^[A-F0-9]{64}$/.test(unique[0])) throw new Error('Missing or ambiguous certificate fingerprint');
    return unique[0];
  };
  const pair = [fingerprint(local), fingerprint(remote)].sort();
  if (pair[0] === pair[1]) throw new Error('Reflected certificate');
  const bytes = new TextEncoder().encode(`DROP-VERIFY-v2\n${roomId}\n${pair.join('\n')}`);
  const hash = new Uint8Array(await crypto.subtle.digest('SHA-256', bytes));
  return Array.from(hash.slice(0, 16)).map(n => n.toString(16).padStart(2, '0')).join('').toUpperCase().match(/.{4}/g)!.join(' ');
}

/** Do not attach the transfer protocol until BOTH people confirm the displayed code. */
export class VerificationGate {
  private local = false;
  private remote = false;
  private done = false;
  private timer: ReturnType<typeof setTimeout>;
  constructor(private channel: RTCDataChannel, readonly code: string, private ready: () => void, private reject: (reason: string) => void) {
    this.timer = setTimeout(() => this.fail('Device verification timed out. Create a new room.'), 90_000);
    channel.onmessage = event => {
      if (typeof event.data !== 'string' || event.data.length > 256) { this.fail('Content arrived before device verification. Room closed.'); return; }
      let msg;
      try { msg = JSON.parse(event.data); } catch { this.fail('Invalid verification message.'); return; }
      if (msg?.type !== 'verify' || msg.code !== this.code) { this.fail('Device verification did not match. Room closed.'); return; }
      this.remote = true; this.finish();
    };
  }
  confirm() {
    if (this.done || this.local) return;
    this.local = true;
    try { this.channel.send(JSON.stringify({ type: 'verify', code: this.code })); this.finish(); }
    catch { this.fail('The other device disconnected during verification.'); }
  }
  private finish() { if (this.local && this.remote && !this.done) { this.dispose(); this.ready(); } }
  private fail(reason: string) { if (!this.done) { this.dispose(); this.reject(reason); } }
  dispose() { this.done = true; clearTimeout(this.timer); this.channel.onmessage = null; }
}

const dangerous = /\.(exe|dll|com|scr|msi|msp|bat|cmd|ps1|psm1|vbs|vbe|js|jse|wsf|wsh|hta|reg|lnk|url|sh|bash|zsh|jar|apk|app|dmg|pkg|deb|rpm|svg|docm|xlsm|pptm|xlam|iso)$/i;
export function safeFilename(name: string): string {
  return name.normalize('NFC').replace(/[\x00-\x1f\x7f<>:"/\\|?*\u202a-\u202e\u2066-\u2069]/g, '_').replace(/[. ]+$/g, '').slice(0, 180) || 'download';
}
export function fileRisk(name: string): string | null {
  if (/[\u202a-\u202e\u2066-\u2069]/.test(name)) return 'Filenames with hidden direction-changing characters are blocked.';
  const cleaned = name.trim().replace(/[. ]+$/g, '');
  if (dangerous.test(cleaned)) return 'Executable, script and certain active-content file types are blocked in DROP.';
  if (/^(con|prn|aux|nul|com[0-9]|lpt[0-9])(?:\.|$)/i.test(cleaned)) return 'This filename is reserved by the operating system. Rename the file.';
  return null;
}
export function executableHeader(bytes: Uint8Array): boolean {
  const hex = Array.from(bytes.slice(0, 4)).map(x => x.toString(16).padStart(2, '0')).join('');
  return hex.startsWith('4d5a') || hex === '7f454c46' || ['feedface', 'feedfacf', 'cefaedfe', 'cffaedfe', 'cafebabe'].includes(hex) || hex.startsWith('2321');
}
