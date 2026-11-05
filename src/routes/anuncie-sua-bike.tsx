import { createFileRoute } from "@tanstack/react-router";
import { SiteHeader, SiteFooter } from "@/components/site/site-ui";
import { pageHead } from "@/lib/seo";
import { Bike, Images, MessageCircle, CalendarDays } from "lucide-react";
export const Route = createFileRoute("/anuncie-sua-bike")({
  head: () =>
    pageHead({
      path: "/anuncie-sua-bike",
      title: "Anuncie sua bike | Vitale Mobilidade",
      robots: "noindex, follow",
      description:
        "Anuncie sua bicicleta por 90 dias na Vitale. Pagamento único de R$150 por Pix ou cartão, sem renovação automática.",
    }),
  component: () => (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <main className="responsive-container py-12 sm:py-16">
        <div className="mx-auto max-w-3xl">
          <p className="text-sm font-bold uppercase tracking-wide text-action">
            Sua bike merece um novo caminho
          </p>
          <h1 className="mt-4 text-4xl font-bold text-ink">
            Anuncie sua bike na Vitale Mobilidade
          </h1>
          <p className="mt-5 text-lg text-muted-foreground">
            Apresente sua bicicleta para quem acompanha o universo das bikes
            elétricas. Os interessados conversam diretamente com você pelo
            WhatsApp.
          </p>
          <div className="mt-8 rounded-3xl border border-line bg-surface p-6 sm:p-8">
            <h2 className="text-3xl font-bold text-ink">
              R$150 por 90 dias de exposição
            </h2>
            <p className="mt-3 text-muted-foreground">
              Pagamento único por Pix ou cartão. Sem assinatura ou renovação
              automática. Você prepara as fotos e informações antes de pagar.
            </p>
            <ul className="mt-6 space-y-4 text-ink">
              {[
                [
                  Images,
                  "Até cinco fotos, ficha completa e link para compartilhar.",
                ],
                [
                  MessageCircle,
                  "Contato direto no WhatsApp validado, com mensagem personalizada.",
                ],
                [
                  CalendarDays,
                  "90 dias corridos a partir da primeira publicação. Pausar não interrompe o prazo.",
                ],
                [
                  Bike,
                  "Uma bike ativa por pagamento. Desative e reative quando quiser, ou substitua por outra bike durante o mesmo período, sem nova cobrança.",
                ],
              ].map(([Icon, label], i) => (
                <li className="flex gap-3" key={i}>
                  <Icon
                    className="h-6 w-6 shrink-0 text-action"
                    aria-hidden="true"
                  />
                  <span>{label as string}</span>
                </li>
              ))}
            </ul>
            <p className="mt-6 text-sm text-muted-foreground">
              Para publicar, é necessário ter uma conta com e-mail e WhatsApp
              validados. A negociação da bicicleta acontece entre você e o
              comprador.
            </p>
            <a
              href="/conta/anuncios?novo=1"
              className="mt-7 inline-flex min-h-12 w-full items-center justify-center rounded-xl bg-action px-6 py-3 font-bold text-white sm:w-auto"
            >
              Começar meu anúncio
            </a>
          </div>
          <a
            href="/conta/anuncios"
            className="mt-5 inline-flex min-h-11 items-center font-semibold text-action underline"
          >
            Já tenho anúncios: acessar meus anúncios
          </a>
        </div>
      </main>
      <SiteFooter />
    </div>
  ),
});
