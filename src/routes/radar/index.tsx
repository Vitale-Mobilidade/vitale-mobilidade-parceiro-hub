import { createFileRoute } from "@tanstack/react-router";
import Acompanhamento from "@/pages/Acompanhamento";
import { loadRadarCatalog, radarCatalogHead, radarHeaders } from "@/lib/radar-routes";

// Rota-alvo do Radar: mesmo loader/página de /acompanhamento; /acompanhamento redireciona 301 para cá.
export const Route = createFileRoute("/radar/")({
  loader: loadRadarCatalog,
  headers: radarHeaders,
  head: () => radarCatalogHead("/radar"),
  component: RadarPage,
});

function RadarPage() {
  return <Acompanhamento initial={Route.useLoaderData()} />;
}
