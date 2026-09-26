import { useState, type FormEvent } from "react";
import { Mail } from "lucide-react";
import { Button } from "@/components/ui/button";

export function NewsletterSignup() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [consent, setConsent] = useState(false);
  const [website, setWebsite] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "done">("idle");
  const [error, setError] = useState("");

  const submitNewsletter = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    if (!consent) { setError("Autorize o registro do seu interesse para continuar."); return; }
    setStatus("sending");
    try {
      const { supabase } = await import("@/integrations/supabase/client");
      const { data, error: fnError } = await supabase.functions.invoke("newsletter-interest", {
        body: { name, email, consent, website, sourceUrl: window.location.href },
      });
      if (fnError || (data as { ok?: boolean } | null)?.ok !== true) throw new Error("signup failed");
      setStatus("done");
    } catch {
      setStatus("idle");
      setError("Não foi possível registrar agora. Tente novamente em instantes.");
    }
  };

  return (
    <section aria-labelledby="newsletter" className="grid gap-6 rounded-lg border border-line bg-card p-6 md:grid-cols-[minmax(0,2fr)_minmax(0,3fr)] md:items-center sm:p-8">
      <div className="flex items-start gap-4">
        <span className="grid h-12 w-12 shrink-0 place-items-center rounded-lg bg-mint/25 text-action"><Mail className="h-6 w-6" aria-hidden="true" /></span>
        <div className="min-w-0">
          <h2 id="newsletter" className="text-xl font-bold text-ink sm:text-2xl">Newsletter Vitale</h2>
          <p className="mt-1 text-sm text-muted-foreground">Cadastre-se para receber novidades sobre bikes elétricas, preços e ferramentas.</p>
        </div>
      </div>
      {status === "done" ? <p role="status" className="rounded-lg bg-mint/20 p-4 text-sm text-ink">Cadastro confirmado. Guardamos seu nome e e-mail para a newsletter da Vitale.</p> : (
        <form onSubmit={submitNewsletter} aria-busy={status === "sending"} className="min-w-0 space-y-3">
          <div className="grid gap-3 lg:grid-cols-2">
            <div><label htmlFor="nl-name" className="mb-1 block text-sm font-medium text-ink">Seu nome</label><input id="nl-name" name="name" autoComplete="name" required minLength={2} maxLength={80} value={name} onChange={event => setName(event.target.value)} aria-invalid={!!error || undefined} aria-describedby={error ? "nl-error" : undefined} className="h-12 w-full rounded-lg border border-input bg-card px-4 text-sm text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-action" /></div>
            <div><label htmlFor="nl-email" className="mb-1 block text-sm font-medium text-ink">Seu e-mail</label><input id="nl-email" name="email" type="email" autoComplete="email" required maxLength={254} value={email} onChange={event => setEmail(event.target.value)} aria-invalid={!!error || undefined} aria-describedby={error ? "nl-error" : undefined} className="h-12 w-full rounded-lg border border-input bg-card px-4 text-sm text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-action" /></div>
          </div>
          <label className="flex items-start gap-2 text-xs leading-relaxed text-muted-foreground"><input type="checkbox" checked={consent} onChange={event => setConsent(event.target.checked)} aria-invalid={!!error && !consent || undefined} aria-describedby={error ? "nl-error" : undefined} className="mt-0.5 shrink-0 accent-action focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-action" /> <span>Autorizo a Vitale Mobilidade a guardar meu nome e e-mail e a me contatar sobre a newsletter.</span></label>
          <input type="text" value={website} onChange={event => setWebsite(event.target.value)} tabIndex={-1} autoComplete="off" aria-hidden="true" className="hidden" />
          {error && <p id="nl-error" role="alert" className="text-sm text-destructive">{error}</p>}
          <Button type="submit" disabled={status === "sending"} className="min-h-12 w-full rounded-lg bg-action px-6 font-bold text-primary-foreground hover:bg-action/90 lg:w-auto">{status === "sending" ? "Registrando…" : "Cadastrar e-mail"}</Button>
        </form>
      )}
    </section>
  );
}