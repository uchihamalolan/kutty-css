import kuttyCss from "@kutty/css/vite";
import { defineConfig } from "vite";
import solidPlugin from "vite-plugin-solid";

export default defineConfig({
  plugins: [kuttyCss(), solidPlugin()],
});
