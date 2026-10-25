import { randomBytes, randomInt } from 'node:crypto';

const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
export function allocateNickname(active, generate = () => Array.from({ length: 4 }, () => alphabet[randomInt(alphabet.length)]).join('')) {
  for (let attempt = 0; attempt < 32; attempt++) {
    const name = generate();
    if (!/^[A-HJ-NP-Z2-9]{4}$/.test(name)) throw new Error('Invalid room name');
    if (!active.has(name)) return name;
  }
  throw new Error('Room names unavailable');
}

export const randomToken = () => randomBytes(32).toString('base64url');

// Allocation and rooms.set must remain synchronous in this single-process server.
// Never overwrite an existing room, even if the random source repeats.
export function allocateIdentity(rooms, generate = randomToken) {
  const used = new Set();
  function next() {
    for (let attempt = 0; attempt < 8; attempt++) {
      const value = generate();
      if (!/^[A-Za-z0-9_-]{43}$/.test(value)) throw new Error('Invalid random token');
      if (!rooms.has(value) && !used.has(value)) { used.add(value); return value; }
    }
    throw new Error('Could not allocate a distinct identity');
  }
  return { id: next(), owner: next(), invite: next() };
}
