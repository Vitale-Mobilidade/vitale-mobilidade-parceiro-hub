import { createFileRoute, redirect } from "@tanstack/react-router";

// QR Codes dos vídeos antigos passam a abrir a Home, preservando campanhas.
export const Route = createFileRoute("/escolherbike")({
  beforeLoad: ({ location }) => {
    throw redirect({ href: `/${location.searchStr ?? ""}`, statusCode: 301 });
  },
});
