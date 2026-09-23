import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

// Config isolada da build (sem plugins do app): testes rodam em Node, sem rede.
export default defineConfig({
  resolve: {
    alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
  },
  test: {
    environment: "node",
    include: ["src/**/*.test.{ts,tsx}"],
    // supabase/functions/**/*.test.ts usam Deno (imports https://) — fora desta suíte.
    exclude: ["node_modules/**", "supabase/**", "dist/**", ".output/**"],
    setupFiles: ["./src/test/setup.ts"],
    env: {
      VITE_SUPABASE_URL: "https://test.invalid",
      VITE_SUPABASE_PUBLISHABLE_KEY: "test-key",
      VITE_SUPABASE_PROJECT_ID: "test",
    },
  },
});
