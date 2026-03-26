import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "jsdom",
    clearMocks: true,
    globals: true,
    coverage: {
      provider: "v8",
    },
  },
});
