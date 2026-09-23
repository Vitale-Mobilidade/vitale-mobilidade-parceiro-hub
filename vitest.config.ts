import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

// Config isolada da build (sem plugins do app): testes rodam em Node, sem rede.
export default defineConfig({
  resolve: {
    alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
  },
  test: {
    environment: "node",
    include: ["src/**/*.test.{ts,tsx}", "supabase/functions/_shared/**/*.test.ts"],
    // zoho-crm.test.ts usa Deno (imports https://) — roda com deno test, fora desta suíte.
    exclude: ["node_modules/**", "supabase/functions/_shared/zoho-crm.test.ts", "dist/**", ".output/**"],
    setupFiles: ["./src/test/setup.ts"],
    env: {
      VITE_SUPABASE_URL: "https://test.invalid",
      VITE_SUPABASE_PUBLISHABLE_KEY: "test-key",
      VITE_SUPABASE_PROJECT_ID: "test",
    },
  },
});
