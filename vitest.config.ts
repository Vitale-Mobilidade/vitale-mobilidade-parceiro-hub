import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";
import { readFileSync } from 'node:fs';

// Config isolada da build (sem plugins do app): testes rodam em Node, sem rede.
export default defineConfig({
  // Only isolated Node tests preload codecs; no binary enters the app bundle.
  plugins: [{name:'instagram-wasm-test',enforce:'pre',transform(code,id){if(!id.endsWith('/instagram/codec-modules.ts'))return;return code+['jpeg','png','font','webp'].map(name=>`\nregisterCodec('${name}',new WebAssembly.Module(Uint8Array.from(atob('${readFileSync(`public/wasm/instagram/${name}.wasm`).toString('base64')}'),c=>c.charCodeAt(0))));`).join('');}}],
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
