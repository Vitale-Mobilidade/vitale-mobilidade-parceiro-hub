import { useState } from "react";
import { BellRing, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { formatBRL } from "@/lib/price-tracker";
import { parseUtmsFromUrl } from "@/lib/quiz-attribution";
import { trackRadar } from "@/lib/radar-analytics";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  bikeId: string;
  bikeName: string;
  currentPrice: number;
}

const CONSENT_LABEL =
  "Autorizo a Vitale Mobilidade a registrar meu nome, WhatsApp e e-mail com meu interesse em queda de preço desta bike. Entendo que o envio automático de avisos ainda não está ativo.";

const DROP_OPTIONS = Array.from({ length: 10 }, (_, index) => (index + 1) * 100);

export function PriceAlertDialog({ open, onOpenChange, bikeId, bikeName, currentPrice }: Props) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [condition, setCondition] = useState<"any_drop" | "target">("target");
  const [drop, setDrop] = useState(100);
  const [target, setTarget] = useState("");
  const [consent, setConsent] = useState(false);
  const [website, setWebsite] = useState(""); // honeypot
  const [status, setStatus] = useState<"idle" | "sending" | "done">("idle");
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!consent) {
      setError("É preciso autorizar o contato para registrar o alerta.");
      return;
    }
    const targetPrice = condition === "target" ? target.trim() ? Number(target.replace(/\D+/g, "")) : currentPrice - drop : null;
    if (condition === "target" && (!(targetPrice! > 0) || targetPrice! >= currentPrice)) {
      setError("Escolha uma meta abaixo do preço atual.");
      return;
    }
    setStatus("sending");
    trackRadar("radar_alert_submitted", { bike_id: bikeId, condition });
    try {
      const attribution = {
        ...parseUtmsFromUrl(window.location.href),
        source_url: window.location.href,
      };
      const { data, error: fnError } = await supabase.functions.invoke("bike-price-alert", {
        body: {
          bikeId,
          name,
          phone,
          email,
          consent,
          condition,
          targetPrice,
          website,
          attribution,
        },
      });
      const ok = !fnError && (data as { ok?: boolean } | null)?.ok === true;
      if (!ok) {
        setStatus("idle");
        setError("Não foi possível registrar agora. Confira os dados e tente de novo.");
        trackRadar("radar_alert_error", { bike_id: bikeId });
        return;
      }
      setStatus("done");
      trackRadar("radar_alert_success", { bike_id: bikeId, condition });
    } catch {
      setStatus("idle");
      setError("Não foi possível registrar agora. Tente novamente em instantes.");
      trackRadar("radar_alert_error", { bike_id: bikeId });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <BellRing className="h-5 w-5 text-primary" aria-hidden="true" /> Registrar alerta de preço
          </DialogTitle>
          <DialogDescription>
            {bikeName} — preço de referência de hoje: <strong>{formatBRL(currentPrice)}</strong>.
          </DialogDescription>
        </DialogHeader>

        {status === "done" ? (
          <div className="space-y-3 text-sm">
            <p className="rounded-xl bg-green-50 p-4 text-foreground">
              Interesse registrado. O envio automático de avisos ainda não está ativo, então não enviaremos mensagem por enquanto.
            </p>
            <Button className="w-full" onClick={() => onOpenChange(false)}>
              Fechar
            </Button>
          </div>
        ) : (
          <form className="space-y-4" onSubmit={submit}>
            <div>
              <Label htmlFor="alert-name">Seu nome</Label>
              <Input id="alert-name" value={name} onChange={(e) => setName(e.target.value)} required minLength={2} maxLength={80} />
            </div>
            <div>
              <Label htmlFor="alert-phone">WhatsApp com DDD</Label>
              <Input
                id="alert-phone"
                inputMode="tel"
                placeholder="(11) 99999-9999"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                required
              />
            </div>
            <div>
              <Label htmlFor="alert-email">Seu e-mail</Label>
              <Input id="alert-email" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} required maxLength={254} />
            </div>

            <fieldset className="space-y-2">
              <legend className="text-sm font-medium">Avise-me quando cair</legend>
              <div className="flex flex-wrap gap-2">
                {DROP_OPTIONS.filter((amount) => currentPrice - amount > 0).map((amount) => (
                  <button key={amount} type="button" aria-pressed={condition === "target" && !target && drop === amount} onClick={() => { setCondition("target"); setTarget(""); setDrop(amount); }} className={`min-h-10 rounded-full border px-3 text-sm ${condition === "target" && !target && drop === amount ? "border-action bg-action text-primary-foreground" : "border-line"}`}>R$ {amount.toLocaleString("pt-BR")}</button>
                ))}
              </div>
              <div className="flex flex-wrap items-center gap-2 text-sm">
                <Label htmlFor="alert-target">Ou escolha um preço máximo</Label>
                <Input id="alert-target" inputMode="numeric" className="h-10 w-32" placeholder="R$" value={target} onChange={(e) => { setTarget(e.target.value); setCondition("target"); }} />
              </div>
              <label className="flex items-center gap-2 text-sm"><input type="radio" name="alert-condition" checked={condition === "any_drop"} onChange={() => setCondition("any_drop")} /> Qualquer queda</label>
              {condition === "target" && <p className="text-xs text-muted-foreground">Meta: {formatBRL(target.trim() ? Number(target.replace(/\D+/g, "")) : currentPrice - drop)}</p>}
            </fieldset>

            <div className="flex items-start gap-2">
              <Checkbox id="alert-consent" checked={consent} onCheckedChange={(v) => setConsent(v === true)} />
              <Label htmlFor="alert-consent" className="text-xs font-normal leading-relaxed text-muted-foreground">
                {CONSENT_LABEL}
              </Label>
            </div>

            {/* Honeypot invisível */}
            <input
              type="text"
              tabIndex={-1}
              autoComplete="off"
              aria-hidden="true"
              value={website}
              onChange={(e) => setWebsite(e.target.value)}
              className="hidden"
            />

            {error && <p className="text-sm text-destructive">{error}</p>}

            <Button type="submit" className="min-h-12 w-full" disabled={status === "sending"}>
              {status === "sending" && <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />}
              Registrar alerta
            </Button>
            <p className="text-xs text-muted-foreground">
              Registramos seu interesse. O envio automático de avisos ainda não está ativo.
            </p>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
