import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { adminCall } from "@/lib/admin-api";
import { formatPodcastDateTime } from "@/lib/podcast-dashboard-clock";
import type { InstagramSingleItem } from "../../../supabase/functions/_shared/instagram-single-contract";

const localClock = new Intl.DateTimeFormat("sv-SE", {
  timeZone: "America/Sao_Paulo",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});

export function InstagramDeliveryControls({
  item,
  onRefresh,
  onDone,
}: {
  item: InstagramSingleItem;
  onRefresh: () => void;
  onDone: (message: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [localTime, setLocalTime] = useState(
    item.due_at
      ? localClock.format(new Date(item.due_at)).replace(" ", "T")
      : "",
  );
  const delivery = useMutation({
    mutationFn: async (mode: "now" | "schedule") => {
      const result = await adminCall<{
        status: string;
        dueAt?: string;
        permalink?: string | null;
      }>(
        mode === "now"
          ? "instagram-single-post-now"
          : "instagram-single-reschedule",
        {
          id: item.id,
          fingerprint: item.fingerprint,
          ...(mode === "schedule" ? { localTime } : {}),
        },
      );
      if (result.status === "connection_unavailable")
        throw Error(
          "Não foi possível conectar à conta do Instagram. Confira o estado atualizado.",
        );
      if (result.status === "shipment_unconfirmed")
        throw Error(
          "O envio precisa ser conferido antes de outra tentativa. Atualize a lista.",
        );
      return result;
    },
    onSuccess: (result) => {
      setEditing(false);
      onDone(
        result.status === "published"
          ? "Publicado no Instagram. A reposição da fila começou."
          : "Horário alterado para " +
              formatPodcastDateTime(result.dueAt ?? "") +
              " — São Paulo.",
      );
    },
    onSettled: onRefresh,
  });
  return (
    <section aria-label="Entrega do post" className="space-y-3">
      <div className="flex flex-wrap gap-2">
        <Button
          disabled={delivery.isPending}
          onClick={() => delivery.mutate("now")}
        >
          {delivery.isPending && delivery.variables === "now"
            ? "Publicando…"
            : "Postar agora"}
        </Button>
        <Button
          variant="outline"
          disabled={delivery.isPending}
          onClick={() => setEditing(!editing)}
        >
          Alterar horário
        </Button>
      </div>
      {editing && (
        <div className="flex flex-wrap items-end gap-2">
          <label className="grid gap-1 text-sm font-medium">
            Data e horário — São Paulo
            <input
              type="datetime-local"
              value={localTime}
              onChange={(event) => setLocalTime(event.target.value)}
              disabled={delivery.isPending}
              className="h-10 rounded-md border bg-background px-3"
            />
          </label>
          <Button
            variant="outline"
            disabled={delivery.isPending || !localTime}
            onClick={() => delivery.mutate("schedule")}
          >
            {delivery.isPending ? "Salvando horário…" : "Salvar horário"}
          </Button>
        </div>
      )}
      {delivery.error && (
        <p role="alert" className="text-sm text-destructive">
          {delivery.error.message}
        </p>
      )}
    </section>
  );
}
