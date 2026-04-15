import path from "node:path"
import { configDefaults, defineConfig } from "vitest/config"

export default defineConfig({
  test: {
    environment: "node",
    exclude: [...configDefaults.exclude, "**/*.integration.test.ts"],
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "."),
    },
  },
})
