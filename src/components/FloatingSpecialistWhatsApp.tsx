import { useEffect, useState } from "react";
import { X } from "lucide-react";

const SPECIALIST_PHONE = "5511986893890";
const HIDE_BUBBLE_KEY = "vitale_hide_floating_whatsapp_bubble";
const BUBBLE_AUTO_HIDE_MS = 7000;

interface Props {
  name?: string;
  phone?: string;
  answers?: any;
  labels?: any;
  recommendation?: any;
  baseLeadData?: any;
  leadId?: string | null;
  liftedAboveStickyBar?: boolean;
  onTrack?: (payload: { whatsapp_phone: string; whatsapp_message: string; source: string }) => void;
}

export function FloatingSpecialistWhatsApp({
  name,
  labels,
  recommendation,
  liftedAboveStickyBar,
  onTrack,
}: Props) {
  const [bubbleHidden, setBubbleHidden] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    try {
      return sessionStorage.getItem(HIDE_BUBBLE_KEY) === "true";
    } catch {
      return false;
    }
  });

  useEffect(() => {
    if (bubbleHidden) return;
    const t = window.setTimeout(() => {
      setBubbleHidden(true);
    }, BUBBLE_AUTO_HIDE_MS);
    return () => window.clearTimeout(t);
  }, [bubbleHidden]);

  const handleCloseBubble = (e: React.MouseEvent | React.KeyboardEvent) => {
    e.stopPropagation();
    e.preventDefault();
    try {
      sessionStorage.setItem(HIDE_BUBBLE_KEY, "true");
    } catch {}
    setBubbleHidden(true);
  };

  const handleClick = () => {
    const trimmedName = (name ?? "").trim();
    const lines: string[] = [];
    if (trimmedName) {
      lines.push(`Fala Lucas, sou o ${trimmedName} e vim do quiz.`);
    } else {
      lines.push("Fala Lucas, vim do quiz.");
    }
    lines.push("", "Minhas respostas:", "");
    lines.push(`Uso: ${labels?.main_use_label ?? "-"}`);
    lines.push(`Distância: ${labels?.daily_km_range_label ?? "-"}`);
    lines.push(`Terreno: ${labels?.route_type_label ?? "-"}`);
    lines.push(`Orçamento: ${labels?.budget_range_label ?? "-"}`);
    lines.push(`Experiência: ${labels?.had_ebike_before_label ?? "-"}`);
    lines.push("", `Bike recomendada: ${recommendation?.primary?.name ?? "-"}`);
    if (recommendation?.secondary?.name) {
      lines.push(`Alternativa: ${recommendation.secondary.name}`);
    }
    lines.push("", "Quero ajuda para escolher minha bike ideal.");
    const message = lines.join("\n");
    const url = `https://wa.me/${SPECIALIST_PHONE}?text=${encodeURIComponent(message)}`;
    window.open(url, "_blank", "noopener,noreferrer");

    onTrack?.({
      whatsapp_phone: SPECIALIST_PHONE,
      whatsapp_message: message,
      source: "floating_button",
    });
  };

  const mobileBottom = liftedAboveStickyBar ? "104px" : "18px";

  return (
    <div
      className="fixed right-4 sm:right-6 z-[60] floating-whatsapp"
      style={{
        bottom: mobileBottom,
      }}
    >
      <style>{`
        @media (min-width: 1024px) {
          .floating-whatsapp { bottom: 24px !important; right: 24px !important; }
        }
      `}</style>
      <div className="flex flex-col items-end gap-2">
        {!bubbleHidden && (
          <div className="relative bg-white rounded-2xl shadow-lg border border-black/5 pl-4 pr-7 py-2.5 max-w-[240px]">
            <button
              type="button"
              onClick={handleClick}
              data-event="floating_specialist_whatsapp_clicked"
              className="flex flex-col items-start text-left"
              style={{ color: "#0F172A" }}
              aria-label="Falar com o especialista no WhatsApp"
            >
              <span className="text-[13px] font-semibold leading-tight">Ainda em dúvida?</span>
              <span className="text-[13px] leading-tight text-[#0F172A]/80">Fale com o especialista</span>
            </button>
            <button
              type="button"
              onClick={handleCloseBubble}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") handleCloseBubble(e);
              }}
              aria-label="Fechar mensagem"
              className="absolute top-1 right-1 flex items-center justify-center rounded-full hover:bg-gray-100"
              style={{ width: 22, height: 22 }}
            >
              <X size={14} color="#0F172A" />
            </button>
          </div>
        )}

        <button
          type="button"
          onClick={handleClick}
          data-event="floating_specialist_whatsapp_clicked"
          className="flex items-center justify-center rounded-full shadow-lg hover:shadow-xl transition-all active:scale-95"
          style={{ backgroundColor: "#25D366", width: 56, height: 56 }}
          aria-label="Falar com o especialista no WhatsApp"
        >
          <svg viewBox="0 0 24 24" width="28" height="28" fill="#FFFFFF" aria-hidden="true">
            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893A11.821 11.821 0 0020.893 3.386" />
          </svg>
        </button>
      </div>
    </div>
  );
}

export default FloatingSpecialistWhatsApp;
