import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["tests/firebase/**/*.test.ts"],
    environment: "node",
    globals: true,
    hookTimeout: 30000,
    testTimeout: 30000,
    pool: "threads",
    maxWorkers: 1,
    minWorkers: 1,
  },
});
