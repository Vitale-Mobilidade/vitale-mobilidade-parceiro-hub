import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";
export default defineConfig({
  resolve: {
    alias: { "@": fileURLToPath(new URL("../../src", import.meta.url)) },
  },
  test: {
    environment: "node",
    include: ["artifacts/seo-editorial-pilot-2026-10-13/pilot.test.tsx"],
    setupFiles: ["./src/test/setup.ts"],
    env: {
      VITE_SUPABASE_URL: "https://test.invalid",
      VITE_SUPABASE_PUBLISHABLE_KEY: "test-key",
    },
  },
});
