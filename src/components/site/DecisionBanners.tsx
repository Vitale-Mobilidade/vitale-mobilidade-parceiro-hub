import { Link } from "@tanstack/react-router";
import { ArrowRight, Megaphone, MessageCircle } from "lucide-react";
import { trackRadar } from "@/lib/radar-analytics";

/** Mesmo convite aprovado no detalhe do Radar, em qualquer página pública. */
export function QuizBanner({ fullBleed = false }: { fullBleed?: boolean }) {
  return <section aria-label="Quiz de perfil" className={`relative isolate overflow-hidden bg-ink text-ink-foreground ${fullBleed ? "" : "rounded-3xl"}`}>
    <picture>
      <source media="(max-width: 767px)" srcSet="/vitale-hero-mobile.webp" width={480} height={728} />
      <img src="/vitale-hero-1280.webp" width={1280} height={720} alt="" loading="lazy" decoding="async" className="absolute inset-0 -z-10 h-full w-full object-cover" />
    </picture>
    <div className="absolute inset-0 -z-10 bg-gradient-to-r from-ink via-ink/90 to-ink/30 max-md:bg-ink/80" aria-hidden="true" />
    <div className="max-w-xl p-6 sm:p-10">
      <h2 className="text-3xl font-extrabold leading-tight sm:text-4xl">Essa bike combina com você?</h2>
      <p className="mt-3 text-ink-foreground/90">Responda o quiz da Vitale sobre seu uso, trajeto e orçamento e veja qual bike é recomendada para o seu perfil.</p>
      <Link to="/escolherbike" className="mt-6 inline-flex min-h-12 items-center gap-2 rounded-xl bg-mint px-6 font-bold text-mint-foreground hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-mint">Fazer o quiz <ArrowRight className="h-4 w-4" aria-hidden="true" /></Link>
    </div>
  </section>;
}

export function OffersBanner({ className = "", source }: { className?: string; source?: string }) {
  return <section aria-label="Grupo de ofertas no WhatsApp" className={`flex flex-col gap-5 rounded-3xl bg-vt-dark p-6 text-ink-foreground sm:flex-row sm:items-center sm:p-8 ${className}`}>
    <span className="grid h-16 w-16 shrink-0 place-items-center rounded-2xl bg-mint text-mint-foreground"><MessageCircle className="h-8 w-8" aria-hidden="true" /></span>
    <div className="min-w-0 flex-1">
      <h2 className="text-xl font-bold sm:text-2xl">Grupo de ofertas no WhatsApp</h2>
      <p className="mt-1 flex items-center gap-2 text-sm text-ink-foreground/80"><Megaphone className="h-4 w-4 shrink-0 text-mint" aria-hidden="true" /> Somente admins publicam ofertas de bikes elétricas.</p>
    </div>
    <Link to="/grupodeofertas" onClick={() => { if (source) trackRadar("radar_group_click", { source }); }} className="inline-flex min-h-12 shrink-0 items-center justify-center gap-2 rounded-xl border-2 border-mint px-5 font-bold hover:bg-mint hover:text-mint-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-mint">Entrar no grupo <ArrowRight className="h-4 w-4" aria-hidden="true" /></Link>
  </section>;
}