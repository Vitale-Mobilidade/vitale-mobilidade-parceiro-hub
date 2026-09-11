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
  "Autorizo a Vitale Mobilidade a usar meu WhatsApp para me avisar sobre queda de preço desta bike.";

export function PriceAlertDialog({ open, onOpenChange, bikeId, bikeName, currentPrice }: Props) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [condition, setCondition] = useState<"any_drop" | "target">("any_drop");
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
          consent,
          condition,
          targetPrice: condition === "target" ? Number(target.replace(/\D+/g, "")) : null,
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
            <BellRing className="h-5 w-5 text-primary" aria-hidden="true" /> Quero ser avisado quando baixar
          </DialogTitle>
          <DialogDescription>
            {bikeName} — preço de referência de hoje: <strong>{formatBRL(currentPrice)}</strong>.
          </DialogDescription>
        </DialogHeader>

        {status === "done" ? (
          <div className="space-y-3 text-sm">
            <p className="rounded-xl bg-green-50 p-4 text-foreground">
              Alerta registrado. O envio automático será ativado na próxima etapa.
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

            <fieldset className="space-y-2">
              <legend className="text-sm font-medium">Quando avisar</legend>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="radio"
                  name="alert-condition"
                  checked={condition === "any_drop"}
                  onChange={() => setCondition("any_drop")}
                />
                Em qualquer queda de preço
              </label>
              <label className="flex flex-wrap items-center gap-2 text-sm">
                <input
                  type="radio"
                  name="alert-condition"
                  checked={condition === "target"}
                  onChange={() => setCondition("target")}
                />
                Quando chegar a
                <Input
                  aria-label="Preço desejado"
                  inputMode="numeric"
                  className="h-9 w-32"
                  placeholder="R$"
                  value={target}
                  onChange={(e) => setTarget(e.target.value)}
                  onFocus={() => setCondition("target")}
                />
              </label>
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
              Registraremos seu alerta. O envio automático será ativado na próxima etapa.
            </p>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
