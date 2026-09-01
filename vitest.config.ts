import { defineConfig } from "vitest/config";
import { resolve } from "node:path";

// Root test runner across all workspace packages/services.
// Tests use in-memory / local adapters only — NO cloud, NO real medical data.
export default defineConfig({
  resolve: {
    alias: {
      "@medikey/api": resolve(process.cwd(), "services/api/src/index.ts"),
      "@medikey/core": resolve(process.cwd(), "packages/core/src/index.ts"),
      "@medikey/config": resolve(process.cwd(), "packages/config/src/index.ts"),
    },
  },
  test: {
    include: [
      "packages/**/*.test.ts",
      "services/**/*.test.ts",
      "tests/**/*.test.ts",
    ],
    exclude: ["**/node_modules/**", "**/dist/**"],
    environment: "node",
    globals: false,
    testTimeout: 15000,
  },
});
