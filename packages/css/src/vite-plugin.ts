/**
 * @module @kutty/css/vite
 *
 * Standard Vite plugin for `@kutty/css`. Extracts tagged template CSS
 * expressions (`css\`...\``) into virtual modules and replaces calls with
 * deterministic generated class names at build and dev time.
 *
 * CSS is delivered through Vite's native virtual module system, which means it
 * flows through Vite's CSS pipeline (postcss, transforms, sourcemaps, HMR) and
 * is emitted as real `.css` assets during production builds.
 *
 * @example
 * ```ts
 * // vite.config.ts
 * import { defineConfig } from 'vite';
 * import kuttyCss from '@kutty/css/vite';
 *
 * export default defineConfig({
 *   plugins: [kuttyCss()],
 * });
 * ```
 */

import type { Plugin, ResolvedConfig } from "vite";

import { VIRTUAL_PREFIX } from "./constants.ts";
import {
  buildResolvedCssId,
  relativizeFileId,
  runCssTransform,
  stripVirtualPrefix,
} from "./transform.ts";

// ---------------------------------------------------------------------------
// Plugin
// ---------------------------------------------------------------------------

/**
 * Vite plugin for `@kutty/css` using Vite's virtual module system.
 *
 * - **Dev** — CSS is served as a virtual module through Vite's module pipeline.
 * - **Build** — CSS is emitted as real `.css` assets in the output.
 *
 * Works with any Vite-based framework (React, Preact, Solid, Vue, Svelte, etc.)
 * but may conflict with the Fresh plugin during dev — use `@kutty/css/fresh`
 * in Fresh projects instead.
 */
export default function kuttyCss(): Plugin {
  const cssByFile = new Map<string, string>();
  let config: ResolvedConfig;

  return {
    name: "kutty-css",
    enforce: "pre",

    configResolved(resolvedConfig) {
      config = resolvedConfig;
    },

    buildStart() {
      cssByFile.clear();
    },

    resolveId(id) {
      if (id.startsWith(VIRTUAL_PREFIX)) {
        return "\0" + id;
      }
      return null;
    },

    load(id) {
      if (!id.startsWith("\0" + VIRTUAL_PREFIX)) return null;

      const fileId = stripVirtualPrefix(id)
        .slice(VIRTUAL_PREFIX.length)
        .replace(/\.css$/, "");

      const css = cssByFile.get(fileId);
      if (css === undefined) {
        throw new Error(`[kutty/css] CSS not found for virtual file: ${id}`);
      }
      return css;
    },

    transform(code, id) {
      return runCssTransform(code, id, config.root, "virtual", cssByFile);
    },

    handleHotUpdate(ctx) {
      if (!/\.(tsx?|jsx?)$/.test(ctx.file)) return;

      const relFileId = relativizeFileId(ctx.file, config.root);
      const cssId = buildResolvedCssId(relFileId, "virtual");
      const mod = ctx.server.moduleGraph.getModuleById(cssId);

      if (mod) {
        ctx.server.moduleGraph.invalidateModule(mod);
        // Include the CSS module alongside whatever Vite would normally update,
        // so the browser re-fetches the stylesheet without a full page reload.
        return [...ctx.modules, mod];
      }
    },
  };
}
