import { describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import ts from "typescript";
import * as contract from "../../supabase/functions/_shared/site-analytics";

function harness(enabled = true, rpcError = false) {
  let handler: (request: Request) => Promise<Response> = async () =>
    new Response(null, { status: 500 });
  const rpc = vi
    .fn()
    .mockResolvedValue({ error: rpcError ? { code: "db_error" } : null });
  const compiled = ts.transpileModule(
    readFileSync(
      new URL(
        "../../supabase/functions/site-analytics/index.ts",
        import.meta.url,
      ),
      "utf8",
    ),
    {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2022,
      },
    },
  ).outputText;
  runInNewContext(compiled, {
    exports: {},
    require: (name: string) =>
      name.startsWith("https:") ? { createClient: () => ({ rpc }) } : contract,
    Deno: {
      env: {
        get: (name: string) =>
          name === "SITE_ANALYTICS_ENABLED" ? String(enabled) : "server-only",
      },
      serve: (next: typeof handler) => {
        handler = next;
      },
    },
    Request,
    Response,
    JSON,
    Date,
    Map,
    Set,
    crypto,
    TextEncoder,
    Uint8Array,
  });
  return { handler, rpc };
}

function post(body: unknown, origin = "https://vitalemobilidade.com") {
  return new Request("https://collector.test", {
    method: "POST",
    headers: { Origin: origin, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("site analytics collector", () => {
  it("é no-op quando o kill switch servidor está desligado", async () => {
    const h = harness(false);
    expect(
      (await h.handler(post({ event: "page_view", sourcePath: "/" }))).status,
    ).toBe(204);
    expect(h.rpc).not.toHaveBeenCalled();
  });

  it("mapeia somente o evento validado para a RPC fixa", async () => {
    const h = harness();
    const response = await h.handler(
      post({
        event: "bike_click",
        sourcePath: "/conteudos/guia",
        targetPath: "/radar/v8_ultra",
        bikeId: "v8_ultra",
      }),
    );
    expect(response.status).toBe(204);
    expect(h.rpc).toHaveBeenCalledWith("record_site_analytics", {
      p_event_name: "bike_click",
      p_source_path: "/conteudos/guia",
      p_target_path: "/radar/v8_ultra",
      p_bike_id: "v8_ultra",
      p_position: "",
    });
  });

  it("rejeita origem externa, método e campo pessoal extra", async () => {
    const h = harness();
    expect(
      (
        await h.handler(
          post({ event: "page_view", sourcePath: "/" }, "https://evil.test"),
        )
      ).status,
    ).toBe(403);
    expect(
      (
        await h.handler(
          new Request("https://collector.test", { method: "GET" }),
        )
      ).status,
    ).toBe(405);
    expect(
      (
        await h.handler(
          post({
            event: "page_view",
            sourcePath: "/",
            email: "private@example.com",
          }),
        )
      ).status,
    ).toBe(400);
    expect(h.rpc).not.toHaveBeenCalled();
  });

  it("rejeita mídia, JSON inválido e corpo acima de 512 bytes", async () => {
    const h = harness();
    const plain = new Request("https://collector.test", {
      method: "POST",
      headers: {
        Origin: "https://vitalemobilidade.com",
        "Content-Type": "text/plain",
      },
      body: "x",
    });
    expect((await h.handler(plain)).status).toBe(415);
    const invalid = new Request("https://collector.test", {
      method: "POST",
      headers: {
        Origin: "https://vitalemobilidade.com",
        "Content-Type": "application/json",
      },
      body: "{",
    });
    expect((await h.handler(invalid)).status).toBe(400);
    const declaredOversize = new Request("https://collector.test", {
      method: "POST",
      headers: {
        Origin: "https://vitalemobilidade.com",
        "Content-Type": "application/json",
        "Content-Length": "513",
      },
      body: "{}",
    });
    expect((await h.handler(declaredOversize)).status).toBe(413);
    expect(
      (
        await h.handler(
          post({ event: "page_view", sourcePath: `/${"a".repeat(600)}` }),
        )
      ).status,
    ).toBe(413);
    expect(h.rpc).not.toHaveBeenCalled();
  });

  it("limita abuso por chave HMAC efêmera e converte falha da RPC em 503", async () => {
    const limited = harness();
    for (let index = 0; index < 60; index += 1) {
      expect(
        (await limited.handler(post({ event: "page_view", sourcePath: "/" })))
          .status,
      ).toBe(204);
    }
    expect(
      (await limited.handler(post({ event: "page_view", sourcePath: "/" })))
        .status,
    ).toBe(429);
    const failed = harness(true, true);
    expect(
      (await failed.handler(post({ event: "page_view", sourcePath: "/" })))
        .status,
    ).toBe(503);
  });
});
