import { defineConfig } from "vite";
import path from "node:path";

export default defineConfig({
  resolve: {
    alias: {
      "@effect-ui/core": path.resolve(__dirname, "src/core"),
    },
  },
});
