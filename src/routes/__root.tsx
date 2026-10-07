import { useEffect } from "react";
import type { ReactNode } from "react";
import type { QueryClient } from "@tanstack/react-query";
import { QueryClientProvider } from "@tanstack/react-query";
import {
  createRootRouteWithContext,
  HeadContent,
  Outlet,
  Scripts,
  useRouter,
  useRouterState,
  Link,
} from "@tanstack/react-router";
import NotFound from "@/pages/NotFound";
import { captureQuizAttribution, preserveCampaignSearch } from "@/lib/quiz-attribution";
import { reportLovableError } from "@/lib/lovable-error-reporting";
import { HotPipeWidget } from "@/components/site/HotPipeWidget";
import appCss from "../styles.css?url";

const TITLE = "Vitale Mobilidade | Escolher e acompanhar preços de bikes elétricas";
const DESCRIPTION =
  "Plataforma para quem quer escolher uma bike elétrica, entender preços e acompanhar o histórico de modelos no Brasil.";

// Organization factual e global; serviços específicos não são atribuídos a todas as páginas.
const ORG_JSONLD = {
  "@context": "https://schema.org",
  "@type": "Organization",
  "@id": "https://vitalemobilidade.com/#organization",
  name: "Vitale Mobilidade",
  url: "https://vitalemobilidade.com/",
  logo: "https://vitalemobilidade.com/logo-192.webp",
  founder: {
    "@type": "Person",
    name: "Lucas Vitale",
    sameAs: "https://www.linkedin.com/in/lucasvitale1/",
  },
  sameAs: ["https://www.linkedin.com/in/lucasvitale1/"],
};

const SITE_JSONLD = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  name: "Vitale Mobilidade",
  url: "https://vitalemobilidade.com/",
  inLanguage: "pt-BR",
  publisher: { "@id": "https://vitalemobilidade.com/#organization" },
};

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  search: { middlewares: [preserveCampaignSearch] },
  beforeLoad: () => {
    // Salva a entrada antes de qualquer navegação cliente, incluindo até o Quiz.
    if (typeof window !== "undefined" && !window.location.pathname.startsWith("/admin")) {
      captureQuizAttribution();
    }
  },
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1.0" },
      { title: TITLE },
      { name: "description", content: DESCRIPTION },
      { name: "author", content: "Vitale Mobilidade" },
      { name: "robots", content: "index, follow, max-image-preview:large" },
      { property: "og:locale", content: "pt_BR" },
      { property: "og:site_name", content: "Vitale Mobilidade" },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "icon", type: "image/png", href: "/favicon.png" },
    ],
    scripts: [
      { type: "application/ld+json", children: JSON.stringify(ORG_JSONLD) },
      { type: "application/ld+json", children: JSON.stringify(SITE_JSONLD) },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFound,
  errorComponent: RootError,
});

// Emit the exact mobile picture source before framework modulepreloads, so the
// critical image does not wait behind the hydration graph on constrained networks.
const MOBILE_HERO_BY_PATH: Record<string, string> = {
  "/": "/vitale-hero-v2-mobile-20260929.avif",
  "/radar": "/vitale-hero-radar-2026-mobile-20260929.avif",
  "/conteudos": "/vitale-hero-radar-2026-mobile-20260929.avif",
  "/ferramentas": "/ferramentas-hero-mobile-20260929.avif",
};
function RootShell({ children }: { children: ReactNode }) {
  const pathname = useRouterState({
    select: (state) => state.location.pathname,
  });
  const mobileHero = MOBILE_HERO_BY_PATH[pathname.replace(/\/$/, "") || "/"];
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <head>
        {mobileHero && (
          <link
            rel="preload"
            as="image"
            href={mobileHero}
            type="image/avif"
            media="(max-width: 767px)"
            fetchPriority="high"
          />
        )}
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const router = useRouter();
  const path = useRouterState({ select: (s) => s.location.pathname });
  const href = useRouterState({ select: (s) => s.location.href });
  const excluded = path.startsWith("/quiz");
  // Captura na hidratação e quando a navegação cliente muda a URL de entrada.
  useEffect(() => {
    if (!window.location.pathname.startsWith("/admin")) captureQuizAttribution();
  }, [href]);
  return (
    <QueryClientProvider client={router.options.context.queryClient}>
      <a
        href="#conteudo-principal"
        className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-[100] focus:rounded-lg focus:bg-card focus:px-4 focus:py-3 focus:font-semibold focus:text-ink focus:shadow-lg"
      >
        Pular para o conteúdo
      </a>
      <div id="conteudo-principal" tabIndex={-1}>
        <Outlet />
      </div>
      {/* Launcher HotPipe: o script externo só é carregado após clique explícito. */}
      {!excluded && <HotPipeWidget />}
    </QueryClientProvider>
  );
}

function RootError({ error, reset }: { error: Error; reset: () => void }) {
  const router = useRouter();
  useEffect(() => {
    console.error(error);
    reportLovableError(error, { boundary: "tanstack_root_error_component" });
  }, [error]);
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background p-6 text-foreground">
      <h1 className="text-2xl font-bold">This page didn't load</h1>
      <p className="text-muted-foreground">Algo deu errado. Tente novamente.</p>
      <div className="flex gap-3">
        <button
          type="button"
          className="rounded-md bg-primary px-4 py-2 text-primary-foreground"
          onClick={() => {
            router.invalidate();
            reset();
          }}
        >
          Try again
        </button>
        <Link to="/" className="rounded-md border border-border px-4 py-2">
          Go home
        </Link>
      </div>
    </div>
  );
}
