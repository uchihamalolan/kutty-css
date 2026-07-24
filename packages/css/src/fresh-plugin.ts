/**
 * @module @kutty/css/fresh
 *
 * Fresh-compatible Vite plugin for `@kutty/css`.
 *
 * During development, Fresh's Vite plugin interferes with virtual module
 * resolution, so this variant serves CSS via a connect middleware at
 * `/.kutty-css/` instead. During production builds it falls back to Vite's
 * virtual module system, which Fresh handles correctly.
 *
 * @example
 * ```ts
 * // vite.config.ts for a Fresh project
 * import { defineConfig } from 'vite';
 * import { fresh } from '@fresh/plugin-vite';
 * import kuttyFreshCss from '@kutty/css/fresh';
 *
 * export default defineConfig({
 *   plugins: [fresh(), kuttyFreshCss()],
 * });
 * ```
 */

import type { Plugin, ResolvedConfig } from "vite";

import { VIRTUAL_PREFIX } from "./constants.ts";
import { createKuttyCssMiddleware, MIDDLEWARE_PREFIX } from "./middleware.ts";
import {
  buildResolvedCssId,
  relativizeFileId,
  runCssTransform,
  stripVirtualPrefix,
} from "./transform.ts";

import { resolveDeliveryMode } from "./types.ts";
import type { DeliveryMode } from "./types.ts";

// ---------------------------------------------------------------------------
// Plugin
// ---------------------------------------------------------------------------

/**
 * Vite plugin for `@kutty/css` compatible with Deno Fresh.
 *
 * - **Dev** — CSS is served via a connect middleware at `/.kutty-css/{file}.css`.
 *   This avoids conflicts with Fresh's plugin during virtual module resolution.
 *   The URL is kept as a plain absolute path (no `\0` prefix) so Vite 7's module
 *   runner can resolve it during SSR.
 * - **Build** — CSS is emitted via virtual modules, same as the standard plugin.
 */
export default function kuttyFreshCss(): Plugin {
  const cssByFile = new Map<string, string>();
  let config: ResolvedConfig;
  let mode: DeliveryMode;

  return {
    name: "kutty-css",
    enforce: "pre",

    configResolved(resolvedConfig) {
      config = resolvedConfig;
      mode = resolveDeliveryMode(config.command);
    },

    buildStart() {
      cssByFile.clear();
    },

    resolveId(id) {
      // Build — virtual module resolution (standard Vite convention)
      if (id.startsWith(VIRTUAL_PREFIX)) {
        return "\0" + id;
      }
      // Dev — middleware URL. Keep as plain absolute path WITHOUT \0 prefix
      // because this is a real HTTP endpoint served by our middleware, not a
      // virtual module. Vite 7's module runner (used by Fresh for SSR) needs
      // to be able to load this module, and \0-prefixed IDs break that flow.
      if (id.startsWith(MIDDLEWARE_PREFIX)) {
        return id;
      }
      return null;
    },

    load(id) {
      const cleanId = stripVirtualPrefix(id);

      if (cleanId.startsWith(VIRTUAL_PREFIX)) {
        const fileId = cleanId.slice(VIRTUAL_PREFIX.length).replace(/\.css$/, "");
        return cssByFile.get(fileId) ?? null;
      }

      if (cleanId.startsWith(MIDDLEWARE_PREFIX)) {
        const fileId = decodeURIComponent(
          cleanId.slice(MIDDLEWARE_PREFIX.length),
        ).replace(/\.css$/, "");
        return cssByFile.get(fileId) ?? null;
      }

      return null;
    },

    configureServer(server) {
      server.middlewares.use(
        createKuttyCssMiddleware(MIDDLEWARE_PREFIX, (fileId) => cssByFile.get(fileId)),
      );
    },

    transform(code, id) {
      return runCssTransform(code, id, config.root, mode, cssByFile);
    },

    handleHotUpdate(ctx) {
      if (!/\.(tsx?|jsx?)$/.test(ctx.file)) return;

      const relFileId = relativizeFileId(ctx.file, config.root);
      const cssId = buildResolvedCssId(relFileId, mode);
      const mod = ctx.server.moduleGraph.getModuleById(cssId);

      if (mod) {
        ctx.server.moduleGraph.invalidateModule(mod);
        return [...ctx.modules, mod];
      }
    },
  };
}
