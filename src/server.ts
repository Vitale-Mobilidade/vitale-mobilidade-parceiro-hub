import "./lib/error-capture";

import { consumeLastCapturedError } from "./lib/error-capture";
import { renderErrorPage } from "./lib/error-page";
import { legacyRedirect } from "./lib/legacy-redirects";

type ServerEntry = {
  fetch: (request: Request, env: unknown, ctx: unknown) => Promise<Response> | Response;
};

let serverEntryPromise: Promise<ServerEntry> | undefined;

async function getServerEntry(): Promise<ServerEntry> {
  if (!serverEntryPromise) {
    serverEntryPromise = import("@tanstack/react-start/server-entry").then(
      (m) => (m.default ?? m) as ServerEntry,
    );
  }
  return serverEntryPromise;
}

// h3 swallows in-handler throws into a normal 500 Response with body
// {"unhandled":true,"message":"HTTPError"} — try/catch alone never fires for those.
async function normalizeCatastrophicSsrResponse(response: Response): Promise<Response> {
  if (response.status < 500) return response;
  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) return response;

  const body = await response.clone().text();
  if (!isH3SwallowedErrorBody(body)) return response;

  console.error(consumeLastCapturedError() ?? new Error(`h3 swallowed SSR error: ${body}`));
  return new Response(renderErrorPage(), {
    status: 500,
    headers: { "content-type": "text/html; charset=utf-8" },
  });
}

function isH3SwallowedErrorBody(body: string): boolean {
  try {
    const payload = JSON.parse(body) as { unhandled?: unknown; message?: unknown };
    return payload.unhandled === true && payload.message === "HTTPError";
  } catch {
    return false;
  }
}

const RADAR_DOC_PATH = /^\/(?:acompanhamento|radar)(?:\/[^/]+)?\/?$/;

// Converte 200 + marcador do Radar em 503, preservando o mesmo body stream (sem lê-lo) e headers.
function applyRadarUnavailableStatus(request: Request, response: Response): Response {
  if (request.method !== "GET" || response.status !== 200) return response;
  if (response.headers.get("x-vitale-radar-unavailable") !== "1") return response;
  if (!(response.headers.get("content-type") ?? "").includes("text/html")) return response;
  if (!RADAR_DOC_PATH.test(new URL(request.url).pathname)) return response;
  const headers = new Headers(response.headers);
  headers.delete("x-vitale-radar-unavailable");
  return new Response(response.body, { status: 503, statusText: "Service Unavailable", headers });
}

export default {
  async fetch(request: Request, env: unknown, ctx: unknown) {
    try {
      // Cutover Etapa 9: redirect permanente real antes do SSR (rollback = remover este bloco).
      if (request.method === "GET" || request.method === "HEAD") {
        const url = new URL(request.url);
        const target = legacyRedirect(url.pathname, url.search);
        if (target) {
          return new Response(null, { status: 301, headers: { location: target, "cache-control": "public, max-age=3600" } });
        }
        const slug = /^\/bikes\/([a-z0-9]+(?:-[a-z0-9]+)*)\/?$/.exec(url.pathname)?.[1];
        if (slug) {
          const { fetchBikeCatalogFromDb } = await import("./lib/bikes-repository.server");
          const bike = (await fetchBikeCatalogFromDb()).find((entry) => entry.slug === slug);
          if (!bike) return new Response(null, { status: 404 });
          return new Response(null, { status: 301, headers: { location: `/radar/${encodeURIComponent(bike.bikeId)}${url.search}`, "cache-control": "public, max-age=3600" } });
        }
      }
      const handler = await getServerEntry();
      const response = await handler.fetch(request, env, ctx);
      return applyRadarUnavailableStatus(request, await normalizeCatastrophicSsrResponse(response));
    } catch (error) {
      console.error(error);
      return new Response(renderErrorPage(), {
        status: 500,
        headers: { "content-type": "text/html; charset=utf-8" },
      });
    }
  },
};
