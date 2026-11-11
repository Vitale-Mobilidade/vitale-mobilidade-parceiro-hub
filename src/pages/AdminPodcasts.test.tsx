import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, expect, it, vi } from "vitest";
import type { PodcastDashboardSnapshot } from "../../supabase/functions/_shared/podcast-dashboard-contract";
import { nextPodcastSlot } from "@/lib/podcast-dashboard-clock";
import AdminPodcasts from "./AdminPodcasts";

const state = vi.hoisted(() => ({ role: "admin" }));
vi.mock("@/components/admin/AdminShell", () => ({
  AdminShell: ({ children }: { children: (role: string) => ReactNode }) => children(state.role),
}));
vi.mock("@tanstack/react-router", () => ({
  Link: ({ children, to }: { children: ReactNode; to: string }) => <a href={to}>{children}</a>,
}));

const snapshot: PodcastDashboardSnapshot = {
  checkedAt: "2026-11-12T09:00:00Z", feedEnabled: true, schedulerEnabled: true, audioCount: 12,
  ready: { total: 9, items: [{ id: "ready", title: "Vídeo elegível", articleSlug: "artigo-publicado", slotAt: null, releasedAt: null, spotifyId: null }] },
  prepared: { total: 1, items: [{ id: "prepared", title: "Episódio preparado", articleSlug: null, slotAt: null, releasedAt: null, spotifyId: null }] },
  released: { total: 2, items: [{ id: "released", title: "Episódio no feed", articleSlug: null,
    slotAt: "2026-11-11T20:45:00Z", releasedAt: "2026-11-11T20:45:23Z", spotifyId: "324BQ31Y26a5askghi34ax" }] },
};

function render(value = snapshot) {
  const client = new QueryClient();
  client.setQueryData(["admin", "podcast-dashboard", 0], value);
  return renderToStaticMarkup(<QueryClientProvider client={client}><AdminPodcasts /></QueryClientProvider>);
}

beforeEach(() => { state.role = "admin"; });

it("distingue a janela prevista, os estados da fila e a confirmação no Spotify", () => {
  const html = render();
  expect(html).toContain("Hoje, às 6h15");
  expect(html).toContain("Vídeo elegível");
  expect(html).toContain("Aguardando artigo publicado");
  expect(html).toContain('dateTime="2026-11-11T20:45:23Z"');
  expect(html).toContain("https://open.spotify.com/episode/324BQ31Y26a5askghi34ax");
  expect(html).toContain("ainda não têm confirmação automática");
});

it("não mostra previsão com o RSS desativado ou para uma conta sem acesso", () => {
  expect(render({ ...snapshot, feedEnabled: false })).not.toContain("Próxima janela prevista");
  state.role = "content";
  const html = render();
  expect(html).toContain("Acesso restrito a administradores");
  expect(html).not.toContain("Episódio preparado");
});

it("usa a data e a hora de São Paulo para a próxima janela", () => {
  expect(nextPodcastSlot("2026-11-12T09:15:00Z")).toBe("Hoje, às 11h45");
  expect(nextPodcastSlot("2026-11-12T15:00:00Z")).toBe("Hoje, às 17h45");
  expect(nextPodcastSlot("2026-11-12T21:00:00Z")).toBe("Amanhã, às 6h15");
  expect(nextPodcastSlot("2026-11-13T01:00:00Z")).toBe("Amanhã, às 6h15");
});
