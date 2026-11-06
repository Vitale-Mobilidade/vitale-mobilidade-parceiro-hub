// Local browser harness only; synthetic prices and auth. Not a production route.
import React from "react";
import { createRoot } from "react-dom/client";
import { createRootRoute, createRoute, createRouter, RouterProvider } from "@tanstack/react-router";
import Acompanhamento from "../src/pages/Acompanhamento";
import { supabase } from "../src/integrations/supabase/client";
import type { RadarCatalogData } from "../src/lib/radar-routes";
import "../src/styles.css";
const initial = {
  ok: true, relevanceAvailable: false, catalog: [], videos: [], archived: [],
  bikes: [
    { id: "v9_max", name: "V9 Max", currentPrice: 6174, autonomyKm: 50, capacity: 2 },
    { id: "v8_pro", name: "V8 Pro", currentPrice: 6612, autonomyKm: 50, capacity: 2 },
    { id: "v20_ultra_max", name: "V20 Ultra Max", currentPrice: 7831, autonomyKm: 100, capacity: 2 },
    { id: "v8_pro_s", name: "V8 Pro S", currentPrice: 7759, autonomyKm: 100, capacity: 2 },
  ].map(b => ({ ...b, image: `/src/assets/bikes/${b.id === "v9_max" ? "v9-max" : b.id === "v8_pro" ? "v8-pro" : b.id === "v8_pro_s" ? "v8-pro-s" : "coswheel-gt20"}.${b.id === "v20_ultra_max" ? "png" : "jpg"}`, category: "Bike elétrica", link: "https://meli.la/localfixture", daily: [], observations: 1, firstObservedAt: "2026-11-06T12:00:00Z", lastObservedAt: "2026-11-06T12:00:00Z", minObserved: b.currentPrice, maxObserved: b.currentPrice })),
} as unknown as RadarCatalogData;
function Login() {
  return <button onClick={async () => {
    await supabase.auth.signInWithPassword({ email: "a@example.invalid", password: "local-only-fixture" });
    const dest = new URLSearchParams(location.search).get("retorno") || "/radar";
    location.assign(dest);
  }}>Entrar (simulado)</button>;
}
function Catalog() {
  return <><div className="flex gap-4 p-3">
    <button onClick={() => void supabase.auth.signInWithPassword({ email: "b@example.invalid", password: "local-only-fixture" })}>Trocar conta (simulado)</button>
    <button onClick={() => void supabase.auth.signOut()}>Sair (simulado)</button>
  </div><Acompanhamento initial={initial} /></>;
}
const root = createRootRoute({ loader: () => ({ footerVideos: [] }) });
const radar = createRoute({ getParentRoute: () => root, path: "/radar", component: Catalog });
const login = createRoute({ getParentRoute: () => root, path: "/conta", component: Login });
const router = createRouter({ routeTree: root.addChildren([radar, login]) });
await router.load();
createRoot(document.getElementById("root")!).render(<RouterProvider router={router} />);
