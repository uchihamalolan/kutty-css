/**
 * @module @kutty/css/types
 *
 * Shared types for the CSS extraction and plugin layers.
 */

import type { SourceMap } from "magic-string";

/** A single `css\`...\`` expression found in source code. */
export interface CssMatch {
  start: number;
  end: number;
  raw: string;
  varName: string;
}

/** The extraction result for a single file. */
export interface ExtractResult {
  matches: CssMatch[];
  localCssName: string;
}

/** The result of rewriting `css\`...\`` calls in source code. */
export interface ReplaceResult {
  cssBuffer: string;
  code: string;
  map: SourceMap | null;
}

/** How CSS is delivered to the browser. */
export type DeliveryMode = "virtual" | "middleware";

/** Resolves to the active mode based on the Vite command. */
export function resolveDeliveryMode(command: string | undefined): DeliveryMode {
  return command === "serve" ? "middleware" : "virtual";
}
