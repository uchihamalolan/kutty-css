import { defineConfig } from "vite-plus";

export default defineConfig({
  fmt: {
    semi: true,
    printWidth: 100,
    sortImports: true,
  },
  lint: {
    options: { typeAware: true, typeCheck: true },
  },
});
