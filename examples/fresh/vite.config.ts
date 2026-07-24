import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";
import { fresh } from "@fresh/plugin-vite";
import kuttyFreshCss from "../../packages/css/src/fresh-plugin.ts";

const __dirname = fileURLToPath(new URL(".", import.meta.url));

export default defineConfig({
  plugins: [fresh(), kuttyFreshCss()],
  resolve: {
    alias: {
      "@kutty/css": resolve(__dirname, "../../packages/css/src/index.ts"),
    },
  },
});
