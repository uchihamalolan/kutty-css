import path from "node:path";

import { tsPlugin } from "@sveltejs/acorn-typescript";
import { Parser } from "acorn";
import MagicString from "magic-string";
import type { Plugin, ResolvedConfig } from "vite";

import { makeClassName } from "./hash.js";

const PACKAGE_NAME = "@kutty/css";
const VIRTUAL_PREFIX = "@kutty/css-virtual:";
const JS_EXTENSIONS = /\.(tsx?|jsx?)$/;

/**
 * Vite plugin for `@kutty/css`.
 * Extracts tagged template CSS expressions into virtual CSS files and replaces `css\`...\``
 * calls with deterministic generated class names at build/dev time.
 *
 * @returns A Vite Plugin object.
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

    resolveId: {
      filter: { id: /@kutty\/css-virtual:/ },
      handler(id) {
        if (id.startsWith(VIRTUAL_PREFIX)) {
          return "\0" + id;
        }
        return null;
      },
    },

    load: {
      filter: { id: /@kutty\/css-virtual:/ },
      handler(id) {
        if (!id.startsWith("\0" + VIRTUAL_PREFIX)) return null;

        const suffix = ".css";
        const rawId = id.slice(1 + VIRTUAL_PREFIX.length);
        const relFileId = rawId.endsWith(suffix) ? rawId.slice(0, -suffix.length) : rawId;

        const css = cssByFile.get(relFileId);
        if (css === undefined) {
          throw new Error(`[kutty/css] CSS not found for virtual file: ${id}`);
        }

        return css;
      },
    },

    transform: {
      filter: { id: JS_EXTENSIONS },
      handler(code, id) {
        if (!code.includes(PACKAGE_NAME)) return null;

        let ast: any;
        try {
          const ext = path.extname(id);
          const isJsx = ext === ".tsx" || ext === ".jsx";
          const isDts = id.endsWith(".d.ts");

          const extendedParser = Parser.extend(
            tsPlugin({
              dts: isDts,
              jsx: isJsx,
            }),
          );

          ast = extendedParser.parse(code, {
            ecmaVersion: "latest",
            sourceType: "module",
            locations: true,
          });
        } catch {
          return null;
        }

        let localCssName: string | null = null;
        const matches: Array<{
          start: number;
          end: number;
          raw: string;
          varName: string;
        }> = [];

        function walk(node: any, parent: any) {
          if (!node || typeof node !== "object") return;

          if (node.type === "ImportDeclaration" && node.source.value === PACKAGE_NAME) {
            for (const spec of node.specifiers) {
              if (
                spec.type === "ImportSpecifier" &&
                spec.imported.type === "Identifier" &&
                spec.imported.name === "css"
              ) {
                localCssName = spec.local.name;
              }
            }
            return;
          }

          if (node.type === "TaggedTemplateExpression" && localCssName) {
            const tag = node.tag;
            if (tag.type === "Identifier" && tag.name === localCssName) {
              if (node.quasi.expressions.length > 0) {
                throw new Error(
                  `[kutty/css] Dynamic interpolation is not supported inside css\`\`.\n` +
                    `Only static CSS text is allowed in v1.\n` +
                    `File: ${id}`,
                );
              }

              let varName = "anon";
              let curr = parent;
              if (curr && curr.type === "VariableDeclarator" && curr.id.type === "Identifier") {
                varName = curr.id.name;
              }

              const raw = node.quasi.quasis.map((q: any) => q.value.raw).join("");
              matches.push({
                start: node.start,
                end: node.end,
                raw,
                varName,
              });
            }
          }

          for (const key of Object.keys(node)) {
            const val = node[key];
            if (Array.isArray(val)) {
              for (const child of val) {
                walk(child, node);
              }
            } else if (val && typeof val === "object") {
              walk(val, node);
            }
          }
        }

        walk(ast, null);

        if (!localCssName || matches.length === 0) return null;

        const isDev = config.command === "serve";
        const relFileId = path.relative(config.root, id).replace(/\\/g, "/");

        const s = new MagicString(code);
        let cssBuffer = "";

        for (const m of matches) {
          const className = makeClassName(relFileId, m.varName, isDev);
          cssBuffer += `.${className} {\n${m.raw}\n}\n`;
          s.overwrite(m.start, m.end, JSON.stringify(className));
        }

        cssByFile.set(relFileId, cssBuffer);

        const virtualImport = `import "${VIRTUAL_PREFIX}${relFileId}.css";\n`;

        return {
          code: virtualImport + s.toString(),
          map: s.generateMap({ hires: true, source: id }),
        };
      },
    },

    handleHotUpdate({ file, server }) {
      if (!JS_EXTENSIONS.test(file)) return;

      const relFileId = path.relative(config.root, file).replace(/\\/g, "/");
      const virtualId = "\0" + VIRTUAL_PREFIX + relFileId + ".css";
      const mod = server.moduleGraph.getModuleById(virtualId);

      if (mod) {
        server.moduleGraph.invalidateModule(mod);
      }
    },
  };
}
