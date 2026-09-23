import { createFileRoute, redirect } from "@tanstack/react-router";

// Legado: o servidor responde 301 (src/server.ts). Aqui cobre navegação no cliente.
export const Route = createFileRoute("/acompanhamento/$bikeId")({
  beforeLoad: ({ params, location }) => {
    throw redirect({
      href: `/radar/${encodeURIComponent(params.bikeId)}${location.searchStr ?? ""}`,
      statusCode: 301,
    });
  },
});
