import { createHash } from "node:crypto";

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
  const hash = createHash("sha1").update(`${fileId}:${localName}`).digest("base64url").slice(0, 8);

  if (isDev) {
    const safe = localName.replace(/[^a-zA-Z0-9_-]/g, "");
    return `${safe}_${hash}`;
  }

  return `c${hash}`;
}
