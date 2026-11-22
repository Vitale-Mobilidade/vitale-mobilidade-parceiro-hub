/** Fixed, PII-free vocabulary for the Instagram bio journey. */
export const BIO_CHOICES = [
  { id: "youtube_video", label: "Vídeos no YouTube", external: true },
  { id: "quiz", label: "Quiz da bike ideal", external: false },
  { id: "whatsapp", label: "Grupo no WhatsApp", external: true },
  { id: "radar", label: "Radar de preços", external: false },
  { id: "newsletter", label: "Newsletter", external: false },
  { id: "youtube_channel", label: "Canal do YouTube", external: true },
  { id: "instagram", label: "Instagram", external: true },
  { id: "spotify", label: "Spotify", external: true },
] as const;
export type BioChoice = (typeof BIO_CHOICES)[number]["id"];
export const JOURNEY_STAGES = [
  "landing",
  "button_click",
  "page_view",
  "quiz_started",
  "quiz_completed",
  "newsletter_subscribed",
  "offer_click",
] as const;
export type JourneyStage = (typeof JOURNEY_STAGES)[number];
export type JourneyHit = {
  event: "links_journey";
  session: string;
  sequence: number;
  stage: JourneyStage;
  path: string;
  choice: BioChoice | "";
  bikeId: string;
};
export function journeyPath(value: unknown): string | null {
  if (typeof value !== "string" || value.length > 220 || /[?#]/.test(value))
    return null;
  const path = value.replace(/\/+$/, "") || "/";
  return /^(?:\/(?:links|quiz|radar|newsletter|grupodeofertas|conteudos|ferramentas)?|\/radar\/[a-z0-9_]{1,64}|\/conteudos\/[a-z0-9]+(?:-[a-z0-9]+)*|\/ferramentas\/[a-z0-9-]+)$/.test(
    path,
  )
    ? path
    : null;
}
export function validateJourneyHit(value: unknown): JourneyHit | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const v = value as Record<string, unknown>;
  if (
    Object.keys(v).sort().join() !==
    ["event", "session", "sequence", "stage", "path", "choice", "bikeId"]
      .sort()
      .join()
  )
    return null;
  const path = journeyPath(v.path);
  if (
    v.event !== "links_journey" ||
    typeof v.session !== "string" ||
    !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(
      v.session,
    ) ||
    !Number.isInteger(v.sequence) ||
    Number(v.sequence) < 0 ||
    Number(v.sequence) > 99 ||
    !path ||
    !JOURNEY_STAGES.includes(v.stage as JourneyStage)
  )
    return null;
  const stage = v.stage as JourneyStage;
  if (typeof v.bikeId !== "string" || !/^(?:[a-z0-9_]{1,64})?$/.test(v.bikeId))
    return null;
  if (stage === "landing" && (v.sequence !== 0 || path !== "/links"))
    return null;
  if (stage !== "landing" && v.sequence === 0) return null;
  if (
    stage === "button_click"
      ? path !== "/links" || !BIO_CHOICES.some((c) => c.id === v.choice)
      : v.choice !== ""
  )
    return null;
  if (
    (stage === "quiz_started" || stage === "quiz_completed") &&
    path !== "/quiz"
  )
    return null;
  if (stage !== "offer_click" && v.bikeId !== "") return null;
  if (stage === "offer_click" && (!v.bikeId || path === "/links")) return null;
  return {
    event: "links_journey",
    session: v.session,
    sequence: Number(v.sequence),
    stage,
    path,
    choice: v.choice as BioChoice | "",
    bikeId: v.bikeId,
  };
}
export type JourneyStep = {
  sequence: number;
  stage: JourneyStage;
  path: string;
  choice: BioChoice | "";
  bikeId: string;
  at: string;
};
export type JourneyReport = {
  collectionEnabled: boolean;
  coverageSince: string | null;
  sessions: number;
  clicked: number;
  continued: number;
  converted: number;
  choices: Array<{
    choice: BioChoice;
    sessions: number;
    clicks: number;
    continued: number;
    converted: number;
  }>;
  conversions: Array<{ stage: JourneyStage; sessions: number }>;
  journeys: Array<{ session: string; startedAt: string; steps: JourneyStep[] }>;
  offset: number;
};
