/**
 * @module @kutty/css/transform
 *
 * Pure functions for rewriting source code: replacing `css\`...\`` calls with
 * their deterministic class names and producing the CSS text that gets emitted
 * alongside the code.
 */

import { relative } from "pathe";
import MagicString from "magic-string";

import { JS_EXTENSIONS, VIRTUAL_PREFIX } from "./constants.ts";
import { makeClassName } from "./hash.ts";

import type { CssMatch, DeliveryMode, ExtractResult, ReplaceResult } from "./types.ts";

// ---------------------------------------------------------------------------
// CSS extraction (composed public API)
// ---------------------------------------------------------------------------

/**
 * Parse source code and find all `css\`...\`` tagged template expressions
 * that import from `@kutty/css`. Returns `null` when the file is not relevant.
 */
export function findCssExpressions(code: string, id: string): ExtractResult | null {
  if (!code.includes("@kutty/css")) return null;

  const ast = parseSafe(code, id);
  if (!ast) return null;

  const localCssName = findLocalCssBindingSafe(ast);
  if (!localCssName) return null;

  const matches = collectTemplateMatchesSafe(ast, localCssName, id);
  if (matches.length === 0) return null;

  return { matches, localCssName };
}

/**
 * Replace every matched `css\`...\`` call with its deterministic class name
 * and accumulate the extracted CSS buffer.
 */
export function applyCssReplacements(
  code: string,
  matches: CssMatch[],
  relFileId: string,
  isDev: boolean,
): ReplaceResult {
  const s = new MagicString(code);
  let cssBuffer = "";

  for (const m of matches) {
    const className = makeClassName(relFileId, m.varName, isDev);
    cssBuffer += `.${className} {\n${m.raw}\n}\n`;
    s.overwrite(m.start, m.end, JSON.stringify(className));
  }

  return {
    cssBuffer,
    code: s.toString(),
    map: s.generateMap({ hires: true, source: relFileId }),
  };
}

// ---------------------------------------------------------------------------
// URL / id builders
// ---------------------------------------------------------------------------

/** HTTP-style URL prefix for the dev middleware path. */
export const MIDDLEWARE_PREFIX = "/.kutty-css/";

/**
 * Build the import URL that gets injected at the top of each transformed
 * file. In dev (middleware mode) this is a real HTTP path; in build (virtual
 * mode) it goes through Vite's virtual module system.
 */
export function buildCssImportUrl(relFileId: string, mode: DeliveryMode): string {
  return mode === "middleware"
    ? `${MIDDLEWARE_PREFIX}${relFileId}.css`
    : `${VIRTUAL_PREFIX}${relFileId}.css`;
}

/**
 * Build the fully-resolved id Vite uses internally to register the CSS module
 * in the module graph. Mirrors `buildCssImportUrl` but applies the `\0`
 * virtual-prefix convention where required.
 */
export function buildResolvedCssId(relFileId: string, mode: DeliveryMode): string {
  return mode === "middleware"
    ? `${MIDDLEWARE_PREFIX}${relFileId}.css`
    : `\0${VIRTUAL_PREFIX}${relFileId}.css`;
}

/**
 * Convert an absolute file path into a stable POSIX-style id relative to
 * the Vite project root.
 */
export function relativizeFileId(absoluteId: string, root: string): string {
  return relative(root, absoluteId).replace(/\\/g, "/");
}

/** Strip the leading `\0` from a Vite-resolved virtual id. */
export function stripVirtualPrefix(id: string): string {
  return id.startsWith("\0") ? id.slice(1) : id;
}

// ---------------------------------------------------------------------------
// Transform body
// ---------------------------------------------------------------------------

/**
 * The shared transform-hook body used by both `vite-plugin` and
 * `fresh-plugin`. Returns `null` if the file should not be transformed.
 *
 * - Parses the file
 * - Extracts `css\`...\`` matches
 * - Stores the generated CSS in `cssByFile`
 * - Returns a new source string with a prepended `import "<cssUrl>";`
 */
export function runCssTransform(
  code: string,
  id: string,
  root: string,
  mode: DeliveryMode,
  cssByFile: Map<string, string>,
): { code: string; map: ReplaceResult["map"]; relFileId: string } | null {
  if (!JS_EXTENSIONS.test(id)) return null;

  const result = findCssExpressions(code, id);
  if (!result) return null;

  const relFileId = relativizeFileId(id, root);
  const isDev = mode === "middleware";

  const { cssBuffer, code: modifiedCode, map } = applyCssReplacements(
    code,
    result.matches,
    relFileId,
    isDev,
  );

  cssByFile.set(relFileId, cssBuffer);

  const cssUrl = buildCssImportUrl(relFileId, mode);

  return {
    code: `import "${cssUrl}";\n${modifiedCode}`,
    map,
    relFileId,
  };
}

// ---------------------------------------------------------------------------
// Local imports of the AST helpers (kept here to keep `ast.ts` from
// re-exporting, and to make the composition point explicit)
// ---------------------------------------------------------------------------

import {
  collectTemplateMatches as collectTemplateMatchesSafe,
  findLocalCssBinding as findLocalCssBindingSafe,
  parseSource as parseSafe,
} from "./ast.ts";
