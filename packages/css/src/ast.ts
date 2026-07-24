/**
 * @module @kutty/css/ast
 *
 * Pure AST helpers for extracting `css\`...\`` tagged template expressions
 * from TypeScript / JavaScript source. No side effects, no I/O.
 */

import { extname } from "pathe";
import { tsPlugin } from "@sveltejs/acorn-typescript";
import { Parser } from "acorn";

import { PACKAGE_NAME } from "./constants.ts";

import type { CssMatch } from "./types.ts";

// ---------------------------------------------------------------------------
// Parsing
// ---------------------------------------------------------------------------

/**
 * Parse source into an ESTree-compatible AST with TypeScript + JSX support.
 * Returns `null` if parsing fails — the caller should treat parse errors as
 * "no CSS expressions found" rather than throwing.
 */
export function parseSource(code: string, id: string): unknown | null {
  try {
    const ext = extname(id);
    const isJsx = ext === ".tsx" || ext === ".jsx";
    const isDts = id.endsWith(".d.ts");

    const extendedParser = Parser.extend(
      tsPlugin({
        dts: isDts,
        jsx: isJsx,
      }),
    );

    return extendedParser.parse(code, {
      ecmaVersion: "latest",
      sourceType: "module",
      locations: true,
    });
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Import binding discovery
// ---------------------------------------------------------------------------

/**
 * Walk the AST to find the local binding name imported from `@kutty/css`'s
 * `css` export. Returns the local name (usually `"css"`, but may be renamed
 * via `import { css as foo }`) or `null` if no such import exists.
 */
export function findLocalCssBinding(ast: unknown): string | null {
  let binding: string | null = null;

  walk(ast, (node, parent) => {
    if (binding !== null) return false;
    if (
      node &&
      typeof node === "object" &&
      (node as any).type === "ImportDeclaration" &&
      (node as any).source?.value === PACKAGE_NAME
    ) {
      for (const spec of (node as any).specifiers) {
        if (
          spec.type === "ImportSpecifier" &&
          spec.imported.type === "Identifier" &&
          spec.imported.name === "css"
        ) {
          binding = spec.local.name;
          return false;
        }
      }
    }
    return true;
  });

  return binding;
}

// ---------------------------------------------------------------------------
// Tagged template discovery
// ---------------------------------------------------------------------------

/**
 * Find every `css\`...\`` tagged template expression in the AST that matches
 * the given local binding name. Returns matches with start/end positions, raw
 * CSS text, and the enclosing variable name.
 *
 * @throws {Error} If a `css\`\`` call contains dynamic interpolation
 *                  (`${...}`), which the v1 engine does not support.
 */
export function collectTemplateMatches(
  ast: unknown,
  localCssName: string,
  id: string,
): CssMatch[] {
  const matches: CssMatch[] = [];

  walk(ast, (node, parent) => {
    if (
      !node ||
      typeof node !== "object" ||
      (node as any).type !== "TaggedTemplateExpression"
    ) {
      return true;
    }

    const tag = (node as any).tag;
    if (tag?.type !== "Identifier" || tag.name !== localCssName) {
      return true;
    }

    if ((node as any).quasi.expressions.length > 0) {
      throw new Error(
        `[kutty/css] Dynamic interpolation is not supported inside css\`\`.\n` +
          `Only static CSS text is allowed in v1.\n` +
          `File: ${id}`,
      );
    }

    const raw = (node as any).quasi.quasis.map((q: any) => q.value.raw).join("");
    matches.push({
      start: (node as any).start,
      end: (node as any).end,
      raw,
      varName: getEnclosingVarName(parent),
    });

    return true;
  });

  return matches;
}

/**
 * Derive a stable variable name from the parent AST node. Used to give each
 * `css\`\`` a deterministic class hash.
 *
 * - `const card = css\`...\`` → `"card"`
 * - `css\`...\`` (no binding) → `"anon"`
 */
export function getEnclosingVarName(parent: unknown): string {
  if (
    parent &&
    typeof parent === "object" &&
    (parent as any).type === "VariableDeclarator" &&
    (parent as any).id?.type === "Identifier"
  ) {
    return (parent as any).id.name;
  }
  return "anon";
}

// ---------------------------------------------------------------------------
// Generic tree walker
// ---------------------------------------------------------------------------

/**
 * Depth-first AST walk. The visitor receives `(node, parent)` and may return
 * `false` to short-circuit further traversal of the current subtree.
 */
function walk(
  node: unknown,
  visit: (node: unknown, parent: unknown) => boolean | void,
  parent: unknown = null,
): void {
  if (!node || typeof node !== "object") return;

  const keepGoing = visit(node, parent);
  if (keepGoing === false) return;

  for (const key of Object.keys(node as object)) {
    const val = (node as Record<string, unknown>)[key];
    if (Array.isArray(val)) {
      for (const child of val) walk(child, visit, node);
    } else if (val && typeof val === "object") {
      walk(val, visit, node);
    }
  }
}
