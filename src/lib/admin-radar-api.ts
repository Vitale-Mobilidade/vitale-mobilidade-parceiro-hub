import { supabase } from "@/integrations/supabase/client";
import type { AdminRadarAlerts, RadarAlertFilter } from "./admin-radar";
export async function getAdminRadarAlerts(
  filter: RadarAlertFilter,
): Promise<AdminRadarAlerts> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) throw new Error("Sessão expirada. Entre novamente.");
  const response = await fetch("/api/admin/radar-alerts", {
    method: "POST",
    cache: "no-store",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(filter),
  });
  if (response.status === 401 || response.status === 403)
    throw new Error("Acesso restrito a administradores. Entre novamente.");
  if (!response.ok)
    throw new Error(
      "Não foi possível carregar os alertas e preços do Radar. Tente novamente.",
    );
  return response.json();
}
