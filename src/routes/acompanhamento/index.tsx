import { createFileRoute, redirect } from "@tanstack/react-router";

// Legado: o servidor responde 301 (src/server.ts). Aqui cobre navegação no cliente.
export const Route = createFileRoute("/acompanhamento/")({
  beforeLoad: ({ location }) => {
    throw redirect({ href: `/radar${location.searchStr ?? ""}`, statusCode: 301 });
  },
});
