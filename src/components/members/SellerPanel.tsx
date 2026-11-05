import { useEffect, useState } from "react";
import { Bike, Camera, MessageCircle, PencilLine } from "lucide-react";
import { classifiedsCall } from "@/lib/bike-classifieds-api";
import {
  classifiedsAccountSchema,
  type ClassifiedsAccount,
} from "@/lib/bike-classifieds";
export function SellerPanel() {
  const [account, setAccount] = useState<ClassifiedsAccount | null>(null);
  useEffect(() => {
    let active = true;
    void classifiedsCall("account")
      .then((value) => {
        if (active) setAccount(classifiedsAccountSchema.parse(value));
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);
  return (
    <section
      className="mt-6 rounded-2xl border border-line bg-white p-5 sm:p-8"
      aria-labelledby="seller-panel-title"
    >
      <Bike className="mb-3 h-8 w-8 text-action" aria-hidden="true" />
      <h2 id="seller-panel-title" className="text-2xl font-bold text-ink">
        Anuncie sua bike na Vitale Mobilidade
      </h2>
      <p className="mt-3 text-muted-foreground">
        Apresente sua bike a quem acompanha mobilidade elétrica e converse
        diretamente com os interessados.
      </p>
      <ul className="mt-5 space-y-3 text-sm">
        <li className="flex gap-3">
          <Camera className="h-5 w-5 shrink-0 text-action" aria-hidden="true" />
          Até cinco fotos, ficha da bike e prévia antes de publicar.
        </li>
        <li className="flex gap-3">
          <MessageCircle
            className="h-5 w-5 shrink-0 text-action"
            aria-hidden="true"
          />
          Contato direto no seu WhatsApp validado, com uma mensagem sobre o
          anúncio.
        </li>
        <li className="flex gap-3">
          <PencilLine
            className="h-5 w-5 shrink-0 text-action"
            aria-hidden="true"
          />
          Edite, desative ou marque a bike como vendida quando precisar.
        </li>
      </ul>
      {account?.canAdvertise ? (
        <a
          href="/conta/anuncios"
          className="mt-6 flex min-h-12 items-center justify-center rounded-xl bg-action px-5 font-bold text-white"
        >
          Anuncie sua bike
        </a>
      ) : (
        <p className="mt-5 text-sm text-muted-foreground">
          Entre na comunidade para criar seu anúncio. Confirme seu e-mail e
          WhatsApp para publicar e receber contatos de compradores.
        </p>
      )}
    </section>
  );
}
