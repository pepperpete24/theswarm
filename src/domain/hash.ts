/** Small, fast, deterministic fingerprint for display only (not security). FNV-1a based. */
export function shortHash(input: string, length = 8): string {
  let out = '';
  let seed = 0x811c9dc5;
  while (out.length < length) {
    let h = seed;
    for (let i = 0; i < input.length; i++) {
      h ^= input.charCodeAt(i);
      h = Math.imul(h, 0x01000193) >>> 0;
    }
    out += h.toString(16).padStart(8, '0');
    seed = (h ^ 0x9e3779b9) >>> 0;
  }
  return out.slice(0, length);
}

/** Real SHA-256, hex encoded. Used by the audit chain. */
export async function sha256Hex(input: string): Promise<string> {
  const bytes = new TextEncoder().encode(input);
  const digest = await globalThis.crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}
