/**
 * @module @kutty/css/middleware
 *
 * Connect-style middleware factory that serves extracted CSS over HTTP at a
 * stable URL prefix. Used by `fresh-plugin` in dev mode to bypass Vite's
 * virtual module system (which Fresh's SSR module runner cannot resolve).
 */

import type { Connect } from "vite";

import { MIDDLEWARE_PREFIX } from "./transform.ts";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Minimal subset of `http.IncomingMessage` / `http.ServerResponse` we use. */
type Req = Connect.IncomingMessage;
type Res = Connect.ServerResponse;
type Next = Connect.NextFunction;

// ---------------------------------------------------------------------------
// Middleware factory
// ---------------------------------------------------------------------------

/**
 * Create a connect middleware that serves CSS at `/{prefix}/{fileId}.css`.
 *
 * - Returns 404 if the requested file is not in the map.
 * - Sets `Content-Type: text/css; charset=utf-8` and disables caching so
 *   edits are reflected immediately on the next request.
 *
 * @param prefix - URL prefix, e.g. `"/.kutty-css/"`. Must start AND end with `/`.
 * @param getCss - Lookup function returning the CSS body for a given fileId,
 *                 or `undefined` if no CSS has been extracted for that file.
 */
export function createKuttyCssMiddleware(
  prefix: string,
  getCss: (fileId: string) => string | undefined,
): (req: Req, res: Res, next: Next) => void {
  return function kuttyCssMiddleware(req, res, next) {
    if (!req.url?.startsWith(prefix)) return next();

    const fileId = decodeURIComponent(req.url.slice(prefix.length)).replace(/\.css$/, "");

    const css = getCss(fileId);
    if (css === undefined) {
      res.statusCode = 404;
      res.end("Not Found");
      return;
    }

    res.setHeader("Content-Type", "text/css; charset=utf-8");
    res.setHeader("Cache-Control", "no-cache, must-revalidate");
    res.end(css);
  };
}

/** Re-export so callers can reference the prefix without importing transform. */
export { MIDDLEWARE_PREFIX };
