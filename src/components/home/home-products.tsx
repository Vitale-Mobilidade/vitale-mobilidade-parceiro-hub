import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { BarChart3, BookOpen, Calculator, GitCompareArrows, Users, type LucideIcon } from "lucide-react";

/**
 * Contrato dos produtos da Home. `to: null` = produto ainda sem rota/backend:
 * o CTA é renderizado inativo (aria-disabled, sem href). Para ligar, basta criar a
 * rota e preencher `to` aqui.
 */
export type HomeProduct = { key: string; title: string; sub: string; icon: LucideIcon; to: "/acompanhamento" | "/escolherbike" | "/grupodeofertas" | null };

export const HOME_PRODUCTS: HomeProduct[] = [
  { key: "comparar", title: "Comparar bikes", sub: "Modelos lado a lado", icon: GitCompareArrows, to: null },
  { key: "radar", title: "Radar de preços", sub: "Acompanhe o histórico", icon: BarChart3, to: "/acompanhamento" },
  { key: "calculadora", title: "Calculadora", sub: "Entenda seus custos", icon: Calculator, to: null },
  { key: "conteudos", title: "Conteúdos e testes", sub: "Análises para escolher", icon: BookOpen, to: null },
  { key: "grupo", title: "Grupo de ofertas", sub: "Ofertas selecionadas", icon: Users, to: "/grupodeofertas" },
];

export const NAV_ITEMS: { label: string; to: HomeProduct["to"] | "#bikes" }[] = [
  { label: "Bikes", to: "#bikes" },
  { label: "Comparar", to: null },
  { label: "Conteúdos", to: null },
  { label: "Ferramentas", to: "/escolherbike" },
  { label: "Radar", to: "/acompanhamento" },
];

/** Link real quando há destino; caso contrário elemento inativo sem href nem ação. */
export function ProductLink({ to, className, children }: { to: string | null; className: string; children: ReactNode }) {
  if (to === null) {
    return (
      <span role="link" aria-disabled="true" className={`${className} cursor-default`}>
        {children}
      </span>
    );
  }
  if (to.startsWith("#")) return <a href={to} className={className}>{children}</a>;
  return <Link to={to} className={className}>{children}</Link>;
}

export function InactiveButton({ className, children }: { className: string; children: ReactNode }) {
  return (
    <button type="button" disabled aria-disabled="true" className={`${className} cursor-default opacity-90`}>
      {children}
    </button>
  );
}
