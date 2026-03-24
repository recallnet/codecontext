import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: false,
    pool: "threads",
    poolOptions: {
      threads: {
        singleThread: !!process.env.CI,
      },
    },
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html"],
      thresholds: {
        lines: 80,
        functions: 80,
        branches: 70,
        statements: 80,
      },
      exclude: [
        "node_modules/**",
        "dist/**",
        "**/*.test.ts",
        "**/*.spec.ts",
        "**/test/**",
        "**/*.d.ts",
        "**/*.config.*",
        "**/index.ts", // barrel exports
      ],
    },
  },
});
