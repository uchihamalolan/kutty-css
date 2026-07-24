/**
 * @module @kutty/css/hash
 *
 * Deterministic, non-cryptographic class-name hashing. Uses FNV-1a 32-bit
 * because the security properties of SHA-1 are unnecessary for short CSS
 * class names, and a sync inline hash avoids a Node `crypto` dependency.
 *
 * Collision rate for 32-bit hashes on 8-char hex output: ~0.4% per 10K names
 * (birthday bound). Acceptable for CSS class names.
 */

const FNV_OFFSET_BASIS = 0x811c9dc5;
const FNV_PRIME = 0x01000193;

/** 32-bit FNV-1a hash of a string. Returns an unsigned integer. */
function fnv1a32(input: string): number {
  let hash = FNV_OFFSET_BASIS;
  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, FNV_PRIME);
  }
  return hash >>> 0;
}

/**
 * Generate a deterministic, unique CSS class name for a `css\`...\`` call.
 *
 * The hash input is `fileId:localName` so:
 * - The same variable name in different files -> different class names.
 * - Rebuilds of the same source -> identical class names (stable).
 *
 * @param fileId - Relative path of the file from the Vite root (POSIX).
 * @param localName - Local variable name bound to the `css\`...\`` expression,
 *                    or `'anon'` when used outside a variable declarator.
 * @param isDev - `true` during `vite dev` (readable), `false` at build (terse).
 * @returns A unique generated CSS class name string.
 */
export function makeClassName(fileId: string, localName: string, isDev: boolean): string {
  const hashHex = fnv1a32(`${fileId}:${localName}`).toString(16).padStart(8, "0");

  if (isDev) {
    const safe = localName.replace(/[^a-zA-Z0-9_-]/g, "");
    return `${safe}_${hashHex}`;
  }

  return `c${hashHex}`;
}
