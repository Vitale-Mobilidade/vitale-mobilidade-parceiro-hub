import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import ts from "typescript";
import { describe, expect, it, vi } from "vitest";
import * as contract from "../../supabase/functions/_shared/editorial-contract";
import * as foundation from "../../supabase/functions/_shared/editorial-foundation";
import * as automation from "../../supabase/functions/_shared/editorial-automation";
import * as cover from "../../supabase/functions/_shared/editorial-cover";
import * as input from "../../supabase/functions/_shared/editorial-create-input";

// Execute the real Edge Function in an isolated VM with offline dependencies.
// Deno.serve is intercepted and neither credentials nor real connections exist.
const source = readFileSync(new URL("../../supabase/functions/editorial-admin/index.ts", import.meta.url), "utf8");
const code = ts.transpileModule(`${source}\nexport { generateStream };`, {
  compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS },
}).outputText;
const exports: { generateStream?: (req: Request, db: unknown, actor: unknown, body: unknown) => Response } = {};
runInNewContext(code, {
  exports,
  require: (name: string) => {
    const modules: Record<string, unknown> = {
      "npm:@supabase/supabase-js@2": {
        createClient: vi.fn(() => {
          throw new Error("External client blocked");
        }),
      },
      "../_shared/editorial-contract.ts": contract,
      "../_shared/editorial-foundation.ts": foundation,
      "../_shared/editorial-automation.ts": automation,
      "../_shared/editorial-cover.ts": cover,
      "../_shared/editorial-create-input.ts": input,
      "../_shared/bike-sheet.ts": { SHEET_NAME_ALIASES: {} },
    };
    if (!(name in modules)) throw new Error(`Unmocked import ${name}`);
    return modules[name];
  },
  Deno: { env: { get: () => undefined }, serve: vi.fn() },
  TextEncoder,
  ReadableStream,
  Response,
  Request,
  console,
  Error,
});

const valid = {
  youtubeId: "abcDEFG1234",
  title: "Título manual",
  articleTitle: "Título manual",
  transcript: "Fonte manual. ".repeat(30),
  bikeIds: [] as string[],
};
function database(previous: unknown = null, lookupError: unknown = null) {
  const from = vi.fn((table: string) => {
    if (table === "bikes") return { select: async () => ({ data: [{ bike_id: "gt20", name: "GT20" }], error: null }) };
    if (table !== "editorial_articles") throw new Error(`Unexpected table ${table}`);
    const chain = {
      select: () => chain,
      eq: () => chain,
      neq: () => chain,
      order: () => chain,
      limit: () => chain,
      maybeSingle: async () => ({ data: previous, error: lookupError }),
    };
    return chain;
  });
  return { from };
}
async function request(db: ReturnType<typeof database>, body = valid) {
  return exports.generateStream!(new Request("http://localhost"), db, { id: "actor", role: "content" }, body).text();
}

describe("servidor de criação — validação antes de efeitos", () => {
  it("não usa transcrição salva quando a fonte manual está vazia", async () => {
    const db = database();
    expect(await request(db, { ...valid, transcript: "" })).toContain("Cole a transcrição completa");
    expect(db.from).not.toHaveBeenCalled();
  });
  it("recusa bike desconhecida sem consultar ou escrever artigo/vídeo", async () => {
    const db = database();
    expect(await request(db, { ...valid, bikeIds: ["inventada"] })).toContain("bikes válidas");
    expect(db.from.mock.calls.map(([table]) => table)).toEqual(["bikes"]);
  });
  it("artigo publicado retorna reutilizado sem salvar vídeo nem gerar texto/capa", async () => {
    const previous = { id: "existing", status: "published", revision: 10, title: "Original" };
    const db = database(previous);
    const result = JSON.parse((await request(db)).trim());
    expect(result).toEqual({ type: "done", article: previous, reused: true });
    expect(db.from.mock.calls.map(([table]) => table)).toEqual(["bikes", "editorial_articles"]);
  });
  it("erro de consulta não é tratado como ausência do artigo", async () => {
    const db = database(null, { message: "Offline" });
    expect(await request(db)).toContain('"type":"error"');
    expect(db.from.mock.calls.map(([table]) => table)).toEqual(["bikes", "editorial_articles"]);
  });
});
