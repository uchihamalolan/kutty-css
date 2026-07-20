/**
 * @module @kutty/css
 * Zero-runtime colocated CSS via tagged template literals.
 */

/**
 * Tagged template literal for colocated CSS.
 *
 * At build time the `@kutty/css` Vite plugin replaces every `css\`...\`` call with
 * a plain class-name string and extracts the CSS into a real .css asset.
 *
 * This export exists only as a type-safe placeholder for editors and the TS
 * compiler. If this function is **actually called at runtime** it means the
 * plugin did not run — the error below surfaces that misconfiguration loudly.
 *
 * @param _strings - Template strings array from tagged template invocation.
 * @param _values - Template values (must be empty; dynamic interpolation is not allowed).
 * @returns A unique generated class name string.
 *
 * @example
 * ```tsx
 * import { css } from '@kutty/css';
 *
 * const button = css`
 *   display: inline-flex;
 *   padding: 0.5rem 1rem;
 *   background: royalblue;
 *   color: #fff;
 *   border-radius: 6px;
 *
 *   &:hover { opacity: 0.85; }
 * `;
 *
 * export function Button({ children }: { children: React.ReactNode }) {
 *   return <button className={button}>{children}</button>;
 * }
 * ```
 */
export function css(_strings: TemplateStringsArray, ..._values: never[]): string {
  throw new Error(
    "[kutty/css] `css` was called at runtime — the @kutty/css Vite plugin did not " +
      "transform this file. Check that:\n" +
      "  1. The plugin is registered in vite.config (plugins: [kuttyCss()]).\n" +
      "  2. The file is matched by the plugin's `include` filter.\n" +
      '  3. `enforce: "pre"` is set (it is by default — check for overrides).',
  );
}
