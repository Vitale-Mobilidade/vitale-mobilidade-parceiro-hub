import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { BarChart3, BookOpen, Calculator, GitCompareArrows, Users, type LucideIcon } from "lucide-react";

/**
 * Contrato dos produtos da Home. `to: null` = produto ainda sem rota/backend:
 * o CTA é renderizado inativo (aria-disabled, sem href). Para ligar, basta criar a
 * rota e preencher `to` aqui.
 */
export type HomeAnchor = "#comparar" | "#conteudos" | "#ferramentas" | "#bikes";
export type HomeProduct = { key: string; title: string; sub: string; icon: LucideIcon; to: "/radar" | "/escolherbike" | "/grupodeofertas" | "/ferramentas" | "/calculadoras/economia" | HomeAnchor | null };

export const HOME_PRODUCTS: HomeProduct[] = [
  { key: "comparar", title: "Comparar bikes", sub: "Modelos lado a lado", icon: GitCompareArrows, to: "#comparar" },
  { key: "radar", title: "Radar de preços", sub: "Acompanhe o histórico", icon: BarChart3, to: "/radar" },
  { key: "calculadora", title: "Calculadora de economia", sub: "Veja quanto pode economizar", icon: Calculator, to: "/calculadoras/economia" },
  { key: "conteudos", title: "Conteúdos e testes", sub: "Análises para escolher", icon: BookOpen, to: "#conteudos" },
  { key: "grupo", title: "Grupo de ofertas", sub: "Ofertas selecionadas", icon: Users, to: "/grupodeofertas" },
];

export const NAV_ITEMS: { label: string; to: HomeProduct["to"] }[] = [
  { label: "Bikes", to: "#bikes" },
  { label: "Comparar", to: "#comparar" },
  { label: "Conteúdos", to: "#conteudos" },
  { label: "Ferramentas", to: "/ferramentas" },
  { label: "Radar", to: "/radar" },
];

/** Link real quando há destino; âncoras funcionais para seções da Home; caso contrário elemento inativo sem href nem ação. */
export function ProductLink({ to, className, children }: { to: string | null; className: string; children: ReactNode }) {
  if (to === null) {
    return (
      <span role="link" aria-disabled="true" className={`${className} cursor-not-allowed opacity-50`}>
        {children}
      </span>
    );
  }
  if (to.startsWith("#")) return <a href={to} className={className}>{children}</a>;
  return <Link to={to} className={className}>{children}</Link>;
}

export function InactiveButton({ className, children }: { className: string; children: ReactNode }) {
  return (
    <button type="button" disabled aria-disabled="true" className={`${className} cursor-not-allowed opacity-50`}>
      {children}
    </button>
  );
}
