/**
 * @module @kutty/css/constants
 *
 * Shared constants used across the CSS extraction and plugin layers.
 */

export const PACKAGE_NAME = "@kutty/css";

/** Virtual module id prefix — CSS is served through Vite's module pipeline. */
export const VIRTUAL_PREFIX = "@kutty/css-virtual:";

/** File extensions the transform hook should inspect for `css\`\`` calls. */
export const JS_EXTENSIONS = /\.(tsx?|jsx?)$/;
