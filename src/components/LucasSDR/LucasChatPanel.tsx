import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Send, X, ShoppingCart, Users, ListChecks, User, CalendarClock } from "lucide-react";
import { BIKES, getPurchaseLink } from "@/data/bikes";
import { sanitizeAssistantText } from "@/lib/lucas-sanitize";
import { useLucasChat } from "./useLucasChat";
import type { SDRContext, SDRMessage } from "./types";

const OFFERS_GROUP_URL = "https://chat.whatsapp.com/EKsWhyOxeEg5XVdbTCYK7g";
const BIKE_LIST_URL = "https://meli.la/2y7TYaH";
const SPECIALIST_PHONE = "5511998693904";
const CONSULTORIA_URL = "https://pay.kiwify.com.br/kPXb3Ni";

type QuickReply = { label: string; text: string; intent?: "buy_primary" | "buy_secondary" | "compare" | "doubts" };

function buildInitialQuickReplies(ctx: SDRContext): QuickReply[] {
  const primaryName = ctx.recommendation?.primary?.name;
  const secondaryName = ctx.recommendation?.secondary?.name;
  const opts: QuickReply[] = [];
  if (primaryName) opts.push({ label: `Comprar a ${primaryName}`, text: `Quero comprar a ${primaryName} agora.`, intent: "buy_primary" });
  if (secondaryName) opts.push({ label: "Comparar as duas", text: "Compare as duas bikes recomendadas para mim.", intent: "compare" });
  opts.push({ label: "Ainda tenho uma dúvida", text: "Ainda tenho uma dúvida antes de decidir.", intent: "doubts" });
  return opts;
}

const DOUBT_QUICK_REPLIES: QuickReply[] = [
  { label: "Aguenta meu peso e garupa?", text: "Ela aguenta bem meu peso e garupa?" },
  { label: "Autonomia é suficiente?", text: "A autonomia é suficiente para o meu uso?" },
  { label: "Vai bem em subidas?", text: "Ela vai bem em subidas?" },
  { label: "Qual tem melhor custo-benefício?", text: "Qual delas tem melhor custo-benefício para o meu perfil?" },
  { label: "Falar com especialista", text: "Quero falar com um especialista." },
];

function buildHandoffLink(ctx: SDRContext, preferredBike?: string | null) {
  const lines: string[] = [];
  const name = (ctx.name ?? "").trim();
  lines.push(name ? `Fala Lucas, sou o ${name} e vim do quiz.` : "Fala Lucas, vim do quiz.");
  lines.push("", "Conversei com o assistente virtual e queria falar com um especialista.", "");
  lines.push("Minhas respostas:");
  lines.push(`Uso: ${ctx.labels?.main_use_label ?? "-"}`);
  lines.push(`Distância: ${ctx.labels?.daily_km_range_label ?? "-"}`);
  lines.push(`Trajeto: ${ctx.labels?.route_type_label ?? "-"}`);
  lines.push(`Garupa: ${ctx.labels?.rider_capacity_need_label ?? "-"}`);
  lines.push(`Peso: ${ctx.labels?.weight_range_label ?? "-"}`);
  lines.push(`Orçamento: ${ctx.labels?.budget_range_label ?? "-"}`);
  lines.push("");
  lines.push(`Bike recomendada: ${ctx.recommendation?.primary?.name ?? "-"}`);
  if (ctx.recommendation?.secondary?.name) lines.push(`Alternativa: ${ctx.recommendation.secondary.name}`);
  if (preferredBike) lines.push(`Bike de interesse: ${preferredBike}`);
  return `https://wa.me/${SPECIALIST_PHONE}?text=${encodeURIComponent(lines.join("\n"))}`;
}

interface Props {
  ctx: SDRContext;
  onClose: () => void;
  onBuyLink: (bikeId: string) => void;
  onEvent: (name: string, payload?: Record<string, any>) => void;
}

export function LucasChatPanel({ ctx, onClose, onBuyLink, onEvent }: Props) {
  const { messages, status, sendMessage, appendAssistantIntro } = useLucasChat(ctx, { onEvent });
  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => { appendAssistantIntro(); }, [appendAssistantIntro]);
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, status]);
  useEffect(() => { inputRef.current?.focus(); }, []);

  const handleSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (status === "sending") return;
    const t = input.trim();
    if (!t) return;
    setInput("");
    sendMessage(t);
    setTimeout(() => inputRef.current?.focus(), 30);
  };

  const handleQuick = (q: QuickReply) => {
    if (status === "sending") return;
    sendMessage(q.text, { isQuickReply: true, label: q.label, forceIntent: q.intent });
    setTimeout(() => inputRef.current?.focus(), 30);
  };

  const handleGroupClick = () => {
    onEvent("sdr_offers_group_link_clicked");
    onEvent("whatsapp_group_clicked", { source: "sdr_chat", group_url: OFFERS_GROUP_URL, clicked_at: new Date().toISOString() });
    window.open(OFFERS_GROUP_URL, "_blank", "noopener,noreferrer");
  };
  const handleListClick = () => {
    onEvent("sdr_bike_list_link_clicked");
    window.open(BIKE_LIST_URL, "_blank", "noopener,noreferrer");
  };
  const handleHandoff = (bike?: string | null) => {
    onEvent("sdr_human_handoff_requested", { preferred_bike: bike });
    window.open(buildHandoffLink(ctx, bike), "_blank", "noopener,noreferrer");
  };
  const handleConsultoria = () => {
    onEvent("consultoria_cta_clicked", {
      source: "sdr_chat",
      checkout_url: CONSULTORIA_URL,
      clicked_at: new Date().toISOString(),
      recommended_bike_1: ctx.recommendation?.primary?.id,
      recommended_bike_2: ctx.recommendation?.secondary?.id,
    });
    window.open(CONSULTORIA_URL, "_blank", "noopener,noreferrer");
  };

  const lastAssistant = [...messages].reverse().find((m) => m.role === "assistant");
  const showInitialQuickReplies = messages.length <= 1 && status !== "sending";
  const contextualQuickReplies = (lastAssistant?.quickReplies?.length ? lastAssistant.quickReplies : null);

  const initialReplies = showInitialQuickReplies ? buildInitialQuickReplies(ctx) : [];

  return (
    <div
      className="flex flex-col bg-background rounded-2xl shadow-2xl border border-border overflow-hidden w-full h-full"
      role="dialog"
      aria-label="Assistente virtual Lucas"
    >
      <header className="flex items-center gap-3 px-4 py-3 bg-primary text-primary-foreground flex-shrink-0">
        <div className="h-10 w-10 rounded-full bg-white/20 flex items-center justify-center font-bold text-lg">L</div>
        <div className="flex-1 min-w-0">
          <div className="text-[15px] font-semibold leading-tight">Lucas</div>
          <div className="text-[12px] opacity-90 leading-tight">Assistente virtual da Vitale</div>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="p-2 rounded-full hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-white/40"
          aria-label="Fechar chat"
        >
          <X className="h-5 w-5" />
        </button>
      </header>

      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto px-4 py-4 space-y-3 bg-muted/30"
        style={{ overscrollBehavior: "contain" }}
      >
        {messages.map((m) => (
          <MessageBubble
            key={m.id}
            message={m}
            onBuyLink={onBuyLink}
            onGroupClick={handleGroupClick}
            onListClick={handleListClick}
            onHandoff={() => handleHandoff(m.bikeForLink)}
            onConsultoria={handleConsultoria}
          />
        ))}
        {status === "sending" && (
          <div className="flex items-center gap-2 text-[13px] text-muted-foreground pl-1">
            <span className="inline-flex gap-1">
              <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/70 animate-bounce" style={{ animationDelay: "0ms" }} />
              <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/70 animate-bounce" style={{ animationDelay: "120ms" }} />
              <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/70 animate-bounce" style={{ animationDelay: "240ms" }} />
            </span>
            Lucas está pensando…
          </div>
        )}
      </div>

      {(initialReplies.length > 0 || contextualQuickReplies) && status !== "sending" && (
        <div className="px-3 py-2 border-t border-border bg-background flex gap-2 overflow-x-auto flex-shrink-0">
          {(initialReplies.length > 0 ? initialReplies : contextualQuickReplies!).map((q) => (
            <button
              key={q.label}
              type="button"
              onClick={() => handleQuick(q)}
              className="text-[13px] whitespace-nowrap px-3 py-1.5 rounded-full border border-primary/40 text-primary hover:bg-primary/10 flex-shrink-0"
            >
              {q.label}
            </button>
          ))}
        </div>
      )}

      <form onSubmit={handleSubmit} className="flex items-end gap-2 px-3 py-3 border-t border-border bg-background flex-shrink-0">
        <textarea
          ref={inputRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSubmit(); }
          }}
          placeholder="Escreva sua dúvida…"
          rows={1}
          className="flex-1 resize-none rounded-xl border border-input bg-background px-3 py-2 text-[14px] focus:outline-none focus:ring-2 focus:ring-primary/40 max-h-24"
          disabled={status === "sending"}
          aria-label="Mensagem para o Lucas"
        />
        <Button type="submit" size="icon" disabled={status === "sending" || !input.trim()} aria-label="Enviar">
          <Send className="h-4 w-4" />
        </Button>
      </form>
    </div>
  );
}

function MessageBubble({
  message,
  onBuyLink,
  onGroupClick,
  onListClick,
  onHandoff,
  onConsultoria,
}: {
  message: SDRMessage;
  onBuyLink: (bikeId: string) => void;
  onGroupClick: () => void;
  onListClick: () => void;
  onHandoff: () => void;
  onConsultoria: () => void;
}) {
  const isUser = message.role === "user";
  const bike = message.bikeForLink ? BIKES.find((b) => b.id === message.bikeForLink) : null;
  const bikeSec = message.secondaryBikeForLink ? BIKES.find((b) => b.id === message.secondaryBikeForLink) : null;

  return (
    <div className={isUser ? "flex justify-end" : "flex gap-2"}>
      {!isUser && (
        <div className="h-7 w-7 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-[12px] font-bold flex-shrink-0 mt-0.5">L</div>
      )}
      <div className={isUser ? "max-w-[85%]" : "max-w-[85%] space-y-2"}>
        <div
          className={
            isUser
              ? "bg-primary text-primary-foreground px-3.5 py-2 rounded-2xl rounded-br-md text-[14px] leading-relaxed whitespace-pre-wrap"
              : "bg-background text-foreground px-3.5 py-2 rounded-2xl rounded-bl-md text-[14px] leading-relaxed whitespace-pre-wrap border border-border"
          }
        >
          {message.content}
        </div>

        {!isUser && bike && (
          <div className="space-y-2">
            {message.showAffiliateDisclosure && (
              <div className="text-[11.5px] text-muted-foreground bg-muted rounded-lg px-3 py-2 leading-snug">
                Se você comprar pelo meu link do Mercado Livre, eu ganho uma pequena comissão. Isso ajuda o canal e você paga exatamente o mesmo preço.
              </div>
            )}
            <Button
              onClick={() => onBuyLink(bike.id)}
              className="w-full h-11 rounded-xl text-[14px] font-semibold"
            >
              <ShoppingCart className="mr-2 h-4 w-4" /> Comprar {bike.name}
            </Button>
            {bikeSec && (
              <Button
                variant="outline"
                onClick={() => onBuyLink(bikeSec.id)}
                className="w-full h-10 rounded-xl text-[13px] font-semibold"
              >
                Ver {bikeSec.name}
              </Button>
            )}
          </div>
        )}

        {!isUser && message.offerConsultoria && (
          <Button
            onClick={onConsultoria}
            className="w-full h-11 rounded-xl text-[13px] font-semibold"
            variant="secondary"
          >
            <CalendarClock className="mr-2 h-4 w-4" /> Agendar consultoria de 30 min · R$ 297
          </Button>
        )}
        {!isUser && message.offerGroup && (
          <Button variant="outline" onClick={onGroupClick} className="w-full h-10 rounded-xl text-[13px] font-semibold">
            <Users className="mr-2 h-4 w-4" /> Entrar no grupo de ofertas
          </Button>
        )}
        {!isUser && message.offerList && (
          <Button variant="outline" onClick={onListClick} className="w-full h-10 rounded-xl text-[13px] font-semibold">
            <ListChecks className="mr-2 h-4 w-4" /> Ver lista de bikes selecionadas
          </Button>
        )}
        {!isUser && message.offerHandoff && (
          <Button variant="outline" onClick={onHandoff} className="w-full h-10 rounded-xl text-[13px] font-semibold">
            <User className="mr-2 h-4 w-4" /> Falar com um especialista
          </Button>
        )}
      </div>
    </div>
  );
}
