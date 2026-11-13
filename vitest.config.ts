import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";
import { readFileSync } from 'node:fs';

// Config isolada da build (sem plugins do app): testes rodam em Node, sem rede.
export default defineConfig({
  // Only the isolated Node test runner compiles bytes; Workers import modules statically.
  plugins: [{name:'instagram-wasm-test',enforce:'pre',load(id){if(!id.endsWith('.wasm?module'))return;const b64=readFileSync(id.slice(0,-7)).toString('base64');return `export default new WebAssembly.Module(Uint8Array.from(atob(${JSON.stringify(b64)}),c=>c.charCodeAt(0)));`;}}],
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
