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
import { reportLovableError } from "@/lib/lovable-error-reporting";
import { HotPipeWidget } from "@/components/site/HotPipeWidget";
import appCss from "../styles.css?url";

const TITLE = "Vitale Mobilidade | Escolher e acompanhar preços de bikes elétricas";
const DESCRIPTION =
  "Plataforma para quem quer escolher uma bike elétrica, entender preços e acompanhar o histórico de modelos no Brasil.";

const GTM_SNIPPET = `if (!location.pathname.startsWith('/admin')) (function(w,d,s,l,i){w[l]=w[l]||[];w.gtag=w.gtag||function(){w[l].push(arguments)};w[l].push({'gtm.start':
new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
})(window,document,'script','dataLayer','GTM-NM9MGXNM');`;

// Organization factual e global; serviços específicos não são atribuídos a todas as páginas.
const ORG_JSONLD = {
  "@context": "https://schema.org",
  "@type": "Organization",
  "@id": "https://vitalemobilidade.com/#organization",
  name: "Vitale Mobilidade",
  url: "https://vitalemobilidade.com/",
  logo: "https://vitalemobilidade.com/logo-192.webp",
  founder: { "@type": "Person", name: "Lucas Vitale", sameAs: "https://www.linkedin.com/in/lucasvitale1/" },
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
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1.0" },
      { title: TITLE },
      { name: "description", content: DESCRIPTION },
      { name: "author", content: "Vitale Mobilidade" },
      { name: "robots", content: "index, follow, max-image-preview:large" },
      { property: "og:type", content: "website" },
      { property: "og:locale", content: "pt_BR" },
      { property: "og:site_name", content: "Vitale Mobilidade" },
      { property: "og:image", content: "https://vitalemobilidade.com/og/vitale-home-1200x630.jpg" },
      { property: "og:image:width", content: "1200" },
      { property: "og:image:height", content: "630" },
      { property: "og:image:type", content: "image/jpeg" },
      { property: "og:image:alt", content: "Vitale Mobilidade — escolha sua bicicleta elétrica" },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESCRIPTION },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:image", content: "https://vitalemobilidade.com/og/vitale-home-1200x630.jpg" },
      { name: "twitter:image:alt", content: "Vitale Mobilidade — escolha sua bicicleta elétrica" },
      { name: "twitter:title", content: TITLE },
      { name: "twitter:description", content: DESCRIPTION },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "icon", type: "image/png", href: "/favicon.png" },
    ],
    scripts: [
      { children: GTM_SNIPPET },
      { type: "application/ld+json", children: JSON.stringify(ORG_JSONLD) },
      { type: "application/ld+json", children: JSON.stringify(SITE_JSONLD) },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFound,
  errorComponent: RootError,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <head>
        <HeadContent />
      </head>
      <body>
        <noscript>
          <iframe
            src="https://www.googletagmanager.com/ns.html?id=GTM-NM9MGXNM"
            height="0"
            width="0"
            style={{ display: "none", visibility: "hidden" }}
          />
        </noscript>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const router = useRouter();
  const path = useRouterState({ select: (s) => s.location.pathname });
  const excluded = path.startsWith("/escolherbike") || path.startsWith("/painel-bikes") || path.startsWith("/admin");
  return (
    <QueryClientProvider client={router.options.context.queryClient}>
      <a href="#conteudo-principal" className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-[100] focus:rounded-lg focus:bg-card focus:px-4 focus:py-3 focus:font-semibold focus:text-ink focus:shadow-lg">
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
