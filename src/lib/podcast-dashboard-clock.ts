// Keep these windows aligned with public.podcast_release_slot.
export const podcastSlots = [{ time: 375, label: "6h15" }, { time: 705, label: "11h45" }, { time: 1065, label: "17h45" }] as const;
const timeZone = "America/Sao_Paulo";
const clock = new Intl.DateTimeFormat("pt-BR", { timeZone, hour: "numeric", minute: "numeric", hourCycle: "h23" });
const dateTime = new Intl.DateTimeFormat("pt-BR", { timeZone, dateStyle: "short", timeStyle: "short" });

export function nextPodcastSlot(now: string) {
  if (!Number.isFinite(Date.parse(now))) return null;
  const parts = clock.formatToParts(new Date(now));
  const minute = Number(parts.find(({ type }) => type === "hour")?.value) * 60
    + Number(parts.find(({ type }) => type === "minute")?.value);
  const slot = podcastSlots.find(({ time }) => time > minute);
  return slot ? `Hoje, às ${slot.label}` : `Amanhã, às ${podcastSlots[0].label}`;
}

export function formatPodcastDateTime(date: string) {
  return Number.isFinite(Date.parse(date)) ? dateTime.format(new Date(date)) : "—";
}
