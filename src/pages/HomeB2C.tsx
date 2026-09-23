import { Link, useLoaderData } from "@tanstack/react-router";
import logo96 from "@/assets/logo-96.webp";
import logo192 from "@/assets/logo-192.webp";
import { buildRadarEntries, type RadarBike } from "@/lib/radar-rankings";
import { formatBRL } from "@/lib/price-tracker";

const MAX_CARDS = 6;

function HomeHeader() {
  return (
    <header className="border-b border-border bg-background">
      <div className="responsive-container flex h-16 items-center justify-between gap-3">
        <Link to="/" className="flex items-center gap-2" aria-label="Vitale Mobilidade — início">
          <img
            src={logo96}
            srcSet={`${logo96} 1x, ${logo192} 2x`}
            alt=""
            width={36}
            height={36}
            decoding="async"
            className="h-9 w-9"
          />
          <span className="text-lg font-bold text-primary">Vitale Mobilidade</span>
        </Link>
        <nav aria-label="Principal" className="flex items-center gap-4 text-sm font-medium">
          <Link to="/escolherbike" className="text-foreground hover:text-primary">
            Escolher bike
          </Link>
          <Link to="/acompanhamento" className="text-foreground hover:text-primary">
            Preços
          </Link>
        </nav>
      </div>
    </header>
  );
}

function HomeFooter() {
  return (
    <footer className="border-t border-border bg-muted/40">
      <div className="responsive-container flex flex-col gap-4 py-8 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
        <nav aria-label="Rodapé" className="flex flex-wrap gap-4">
          <Link to="/escolherbike" className="hover:text-primary">Escolher minha bike</Link>
          <Link to="/acompanhamento" className="hover:text-primary">Histórico de preços</Link>
          <Link to="/grupodeofertas" className="hover:text-primary">Grupo de ofertas no WhatsApp</Link>
        </nav>
        <p>© 2026 Vitale Mobilidade</p>
      </div>
    </footer>
  );
}

const HomeB2C = () => {
  const data = useLoaderData({ from: "/" });
  const entries =
    data?.ok === true
      ? buildRadarEntries(data.bikes as unknown as RadarBike[], "all")
          .filter((e) => typeof e.id === "string" && typeof e.name === "string" && e.name.trim() !== "")
          .slice(0, MAX_CARDS)
      : [];

  return (
    <div className="min-h-screen bg-background text-foreground">
      <HomeHeader />
      <main>
        <section className="responsive-container py-12 sm:py-20">
          <h1 className="max-w-3xl text-3xl font-bold leading-tight sm:text-5xl">
            Escolha sua bike elétrica com clareza, do perfil ao preço.
          </h1>
          <p className="mt-4 max-w-2xl text-lg text-muted-foreground">
            Responda um quiz rápido para descobrir o modelo que combina com você e consulte o
            histórico de preços antes de decidir a compra.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link
              to="/escolherbike"
              className="inline-flex min-h-12 items-center justify-center rounded-md bg-primary px-6 font-semibold text-primary-foreground hover:bg-primary/90"
            >
              Descobrir minha bike
            </Link>
            <Link
              to="/acompanhamento"
              className="inline-flex min-h-12 items-center justify-center rounded-md border border-primary px-6 font-semibold text-primary hover:bg-primary/5"
            >
              Ver histórico de preços
            </Link>
          </div>
        </section>

        <section className="bg-muted/40 py-12" aria-labelledby="como-funciona">
          <div className="responsive-container">
            <h2 id="como-funciona" className="text-2xl font-bold">Como a Vitale ajuda</h2>
            <ol className="mt-6 grid gap-4 sm:grid-cols-3">
              <li className="rounded-lg border border-border bg-background p-5">
                <h3 className="font-semibold">1. Escolher</h3>
                <p className="mt-2 text-sm text-muted-foreground">O quiz cruza seu uso, orçamento e trajeto para indicar modelos.</p>
              </li>
              <li className="rounded-lg border border-border bg-background p-5">
                <h3 className="font-semibold">2. Entender o preço</h3>
                <p className="mt-2 text-sm text-muted-foreground">O histórico mostra como o preço de cada bike variou ao longo do tempo.</p>
              </li>
              <li className="rounded-lg border border-border bg-background p-5">
                <h3 className="font-semibold">3. Decidir</h3>
                <p className="mt-2 text-sm text-muted-foreground">Com perfil e preço em mãos, você compra com mais segurança.</p>
              </li>
            </ol>
          </div>
        </section>

        {entries.length > 0 && (
          <section className="responsive-container py-12" aria-labelledby="bikes-monitoradas">
            <h2 id="bikes-monitoradas" className="text-2xl font-bold">Bikes com preço monitorado</h2>
            <ul className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {entries.map((e) => (
                <li key={e.id}>
                  <Link
                    to="/acompanhamento/$bikeId"
                    params={{ bikeId: e.id }}
                    className="block rounded-lg border border-border p-5 hover:border-primary"
                  >
                    <h3 className="font-semibold">{e.name}</h3>
                    <p className="mt-2 text-sm text-muted-foreground">Preço atual registrado</p>
                    <p className="text-xl font-bold text-primary">{formatBRL(e.currentPrice)}</p>
                    <span className="mt-3 inline-block text-sm font-medium text-primary">Ver histórico →</span>
                  </Link>
                </li>
              ))}
            </ul>
            <Link to="/acompanhamento" className="mt-6 inline-block font-medium text-primary hover:underline">
              Ver todas as bikes monitoradas
            </Link>
          </section>
        )}

        <section className="bg-muted/40 py-12" aria-labelledby="grupo-ofertas">
          <div className="responsive-container">
            <h2 id="grupo-ofertas" className="text-2xl font-bold">Grupo de ofertas no WhatsApp</h2>
            <p className="mt-2 text-muted-foreground">Entre no grupo da Vitale para acompanhar ofertas compartilhadas.</p>
            <Link
              to="/grupodeofertas"
              className="mt-4 inline-flex min-h-12 items-center rounded-md border border-primary px-6 font-semibold text-primary hover:bg-primary/5"
            >
              Entrar no grupo
            </Link>
          </div>
        </section>
      </main>
      <HomeFooter />
    </div>
  );
};

export default HomeB2C;
