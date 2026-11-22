import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { adminCall } from "@/lib/admin-api";
import type { JourneyReport } from "../../../supabase/functions/_shared/links-journey";
import { LinksInstagramFunnel } from "./LinksInstagramFunnel";
export type LinksCampaignReport = {
  startDate: string;
  endDate: string;
  views: number;
  days: Array<{ date: string; views: number }>;
};
export function LinksCampaignSummary({
  startDate,
  endDate,
}: {
  startDate: string;
  endDate: string;
}) {
  const [offset, setOffset] = useState(0);
  const visits = useQuery({
    queryKey: ["admin", "links-campaign", startDate, endDate],
    queryFn: () =>
      adminCall<LinksCampaignReport>("links-campaign", { startDate, endDate }),
  });
  const journeys = useQuery({
    queryKey: ["admin", "links-journeys", startDate, endDate, offset],
    queryFn: () =>
      adminCall<JourneyReport>("links-journeys", {
        startDate,
        endDate,
        offset,
      }),
  });
  return (
    <div>
      {(visits.isPending || journeys.isPending) && (
        <p role="status" className="mb-4 text-sm">
          Carregando funil…
        </p>
      )}
      {(visits.isError || journeys.isError) && (
        <p
          role="alert"
          className="mb-4 rounded-lg border border-line bg-card p-4 text-sm"
        >
          Parte da medição está indisponível.{" "}
          <Button variant="ghost"
            type="button"
            onClick={() => {
              void visits.refetch();
              void journeys.refetch();
            }}
            className="underline"
          >
            Tentar novamente
          </Button>
        </p>
      )}
      <LinksInstagramFunnel
        data={journeys.data}
        views={visits.data?.views}
        offset={offset}
        onPage={setOffset}
      />
    </div>
  );
}
