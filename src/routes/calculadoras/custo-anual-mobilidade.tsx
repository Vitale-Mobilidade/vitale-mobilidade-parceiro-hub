import { useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, Wallet } from "lucide-react";
import { Metric, NumberField } from "@/components/mobility/calculator-ui";
import { SiteHeader, SiteFooter } from "@/components/site/site-ui";
import { Button } from "@/components/ui/button";
import { LIMITS } from "@/lib/mobility/config";
import { computeAnnualMobilityCost, normalizeOptionalSpend, type AnnualCategory } from "@/lib/mobility/cost-engine";
import { brl, validateNumber } from "@/lib/mobility/format";
import { canonicalUrl, pageHead } from "@/lib/seo";

const PATH = "/calculadoras/custo-anual-mobilidade";
const TITLE = "Quanto você gasta por ano para se locomover? | Vitale Mobilidade";
const DESCRIPTION =
  "Some carro/moto, Uber/99, transporte público e estacionamento para ver seu custo mensal e anual de mobilidade, sem cadastro.";

export const Route = createFileRoute("/calculadoras/custo-anual-mobilidade")({
  head: () => {
    const base = pageHead({
      path: PATH,
      title: TITLE,
      description: DESCRIPTION,
      ogTitle: "Quanto você realmente gasta por ano para se locomover?",
      ogDescription: "Descubra seu custo anual de mobilidade em segundos, com seus próprios números.",
    });
    return {
      ...base,
      scripts: [
        {
          type: "application/ld+json",
          children: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "WebApplication",
            name: "Calculadora de custo anual de mobilidade",
            url: canonicalUrl(PATH),
            applicationCategory: "FinanceApplication",
            operatingSystem: "Web",
            inLanguage: "pt-BR",
            isAccessibleForFree: true,
            offers: { "@type": "Offer", price: "0", priceCurrency: "BRL" },
            publisher: { "@type": "Organization", name: "Vitale Mobilidade" },
          }),
        },
      ],
    };
  },
  component: CustoAnualMobilidade,
});

const FIELDS: { key: AnnualCategory; label: string; help: string }[] = [
  { key: "carMoto", label: "Carro ou moto", help: "Combustível, seguro, IPVA, manutenção, parcela — o que você gasta hoje por mês. Use 0 se não tiver." },
  { key: "rideHailing", label: "Uber / 99", help: "Corridas por aplicativo no mês. Use 0 se não usar." },
  { key: "publicTransport", label: "Transporte público", help: "Ônibus, metrô, trem no mês. Use 0 se não usar." },
  { key: "parkingOther", label: "Estacionamento e outros", help: "Estacionamento, pedágio e outros custos de deslocamento. Use 0 se não houver." },
];
const CATEGORY_LABEL: Record<AnnualCategory, string> = {
  carMoto: "carro/moto",
  rideHailing: "Uber/99",
  publicTransport: "transporte público",
  parkingOther: "estacionamento e outros",
};

function CustoAnualMobilidade() {
  const [values, setValues] = useState<Record<AnnualCategory | "replaceablePercent", string>>({
    carMoto: "", rideHailing: "", publicTransport: "", parkingOther: "", replaceablePercent: "",
  });
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const set = (key: keyof typeof values) => (v: string) => setValues((c) => ({ ...c, [key]: v }));
  const touch = (key: string) => () => setTouched((c) => ({ ...c, [key]: true }));

  // Categorias de gasto são opcionais: branco = ausente (vira 0 só quando outra categoria
  // tiver valor). Só preenchidas são validadas; negativos/NaN/limites continuam erro.
  const fields = useMemo(() => ({
    carMoto: normalizeOptionalSpend(values.carMoto, "Carro ou moto"),
    rideHailing: normalizeOptionalSpend(values.rideHailing, "Uber / 99"),
    publicTransport: normalizeOptionalSpend(values.publicTransport, "Transporte público"),
    parkingOther: normalizeOptionalSpend(values.parkingOther, "Estacionamento e outros"),
  }), [values]);
  const errors = {
    carMoto: fields.carMoto.error,
    rideHailing: fields.rideHailing.error,
    publicTransport: fields.publicTransport.error,
    parkingOther: fields.parkingOther.error,
    replaceablePercent: validateNumber(values.replaceablePercent, "Percentual", LIMITS.replaceablePercent),
  };
  const anySpendProvided = fields.carMoto.provided || fields.rideHailing.provided
    || fields.publicTransport.provided || fields.parkingOther.provided;
  const ready = anySpendProvided && errors.replaceablePercent === null
    && !fields.carMoto.error && !fields.rideHailing.error
    && !fields.publicTransport.error && !fields.parkingOther.error;
  const result = useMemo(() => ready
    ? computeAnnualMobilityCost({
        carMoto: fields.carMoto.value,
        rideHailing: fields.rideHailing.value,
        publicTransport: fields.publicTransport.value,
        parkingOther: fields.parkingOther.value,
        replaceablePercent: Number(values.replaceablePercent.replace(",", ".")),
      })
    : null, [ready, fields, values.replaceablePercent]);
  const data = result?.ok ? result.data : null;
  const err = (key: keyof typeof errors) => (touched[key] ? errors[key] : null);

  const insight = !data
    ? null
    : data.monthlyTotal === 0
      ? "Com esses dados, você não tem gasto mensal com deslocamento — não há o que substituir."
      : `Seu maior gasto é ${CATEGORY_LABEL[data.largestCategory!]}. ${
          data.replaceableMonthly > 0
            ? `A parcela que você acredita poder trocar por bike equivale a ${brl(data.replaceableAnnual)} por ano — isso é gasto potencialmente substituível, não economia garantida: custos fixos de um carro ou moto que você mantiver continuam existindo.`
            : "Com 0% de substituição, nenhuma parte desse gasto é considerada substituível."
        }`;

  return (
    <div className="min-h-screen bg-surface">
      <SiteHeader />
      <main>
        <section className="bg-ink text-ink-foreground">
          <div className="responsive-container py-6 sm:py-8">
            <p className="text-xs font-bold tracking-[0.2em] text-mint">CUSTO ANUAL DE MOBILIDADE</p>
            <h1 className="mt-2 max-w-4xl text-3xl font-black leading-tight sm:text-4xl">
              Quanto você realmente gasta por ano para se locomover?
            </h1>
            <p className="mt-3 max-w-3xl text-sm leading-relaxed text-ink-foreground/80 sm:text-base">
              Informe seus gastos mensais. O total aparece na hora, sem cadastro.
            </p>
          </div>
        </section>

        <div className="responsive-container space-y-8 py-7 sm:py-10">
          <section aria-labelledby="gastos" className="grid gap-6 lg:grid-cols-[minmax(0,0.92fr)_minmax(0,1.08fr)]">
            <div className="rounded-lg bg-card p-5 ring-1 ring-line sm:p-6">
              <div className="flex items-center gap-3">
                <span className="grid h-11 w-11 shrink-0 place-items-center rounded-md bg-mint/25 text-action"><Wallet className="h-5 w-5" aria-hidden="true" /></span>
                <div>
                  <h2 id="gastos" className="text-2xl font-black text-ink">Seus gastos por mês</h2>
                  <p className="text-sm text-muted-foreground">Preencha todos; use 0 quando não houver.</p>
                </div>
              </div>
              <div className="mt-6 space-y-5">
                <div className="grid gap-4 sm:grid-cols-2">
                  {FIELDS.map((f) => (
                    <NumberField key={f.key} name={f.key} label={f.label} value={values[f.key]} onChange={set(f.key)} onBlur={touch(f.key)} suffix="R$/mês" help={f.help} error={err(f.key)} />
                  ))}
                </div>
                <NumberField
                  name="replaceablePercent"
                  label="Quanto disso você acredita poder trocar por bike?"
                  value={values.replaceablePercent}
                  onChange={set("replaceablePercent")}
                  onBlur={touch("replaceablePercent")}
                  suffix="%"
                  step="1"
                  help="Uma estimativa sua, de 0 a 100%."
                  error={err("replaceablePercent")}
                />
              </div>
            </div>

            <section aria-labelledby="resultado" aria-live="polite" className="rounded-lg bg-card p-5 ring-1 ring-line sm:p-6">
              <h2 id="resultado" className="text-2xl font-black text-ink">Seu custo de mobilidade</h2>
              {!data ? (
                <div className="mt-5 grid min-h-72 place-items-center rounded-lg bg-surface p-6 text-center ring-1 ring-line">
                  <div className="max-w-sm">
                    <Wallet className="mx-auto h-9 w-9 text-action" aria-hidden="true" />
                    <p className="mt-3 font-bold text-ink">Preencha os cinco campos para ver o total</p>
                    <p className="mt-2 text-sm text-muted-foreground">Nenhum resultado aparece até todos os valores serem válidos.</p>
                  </div>
                </div>
              ) : (
                <div className="mt-5 space-y-5">
                  <dl className="grid grid-cols-2 gap-3">
                    <Metric label="Custo mensal total" value={brl(data.monthlyTotal, true)} />
                    <Metric label="Custo anual total" value={brl(data.annualTotal, true)} emphasis />
                    <Metric label="Potencialmente substituível / mês" value={brl(data.replaceableMonthly, true)} />
                    <Metric label="Potencialmente substituível / ano" value={brl(data.replaceableAnnual, true)} emphasis />
                  </dl>
                  <p className="rounded-md bg-surface p-4 text-sm leading-relaxed text-ink ring-1 ring-line">{insight}</p>
                  {data.monthlyTotal > 0 && (
                    <div className="rounded-md bg-mint/20 p-4">
                      <p className="text-sm leading-relaxed text-ink">
                        Quer saber quanto sobraria de fato? Na calculadora de economia você confirma só os custos que desapareceriam com a bike e vê até duas bikes compatíveis.
                      </p>
                      <Button asChild className="mt-3 min-h-11 bg-action text-primary-foreground hover:bg-action/90">
                        <Link to="/calculadoras/economia">Simular economia com bike <ArrowRight aria-hidden="true" /></Link>
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </section>
          </section>

          <details className="rounded-lg bg-card p-5 ring-1 ring-line sm:p-7">
            <summary className="min-h-11 cursor-pointer text-xl font-black text-ink">Como calculamos?</summary>
            <div className="mt-5 grid gap-6 text-sm leading-relaxed text-muted-foreground lg:grid-cols-2">
              <div>
                <h2 className="font-bold text-ink">Fórmulas</h2>
                <ul className="mt-2 list-disc space-y-2 pl-5">
                  <li>Custo mensal = carro/moto + Uber/99 + transporte público + estacionamento e outros.</li>
                  <li>Custo anual = custo mensal × 12.</li>
                  <li>Potencialmente substituível = custo mensal × percentual informado (e × 12 no ano).</li>
                  <li>Valores arredondados para centavos; limite de R$ {LIMITS.monthlyMoney.max.toLocaleString("pt-BR")} por campo.</li>
                </ul>
              </div>
              <div>
                <h2 className="font-bold text-ink">O que não é</h2>
                <p className="mt-2">Parcela substituível não é economia garantida: seguro, IPVA, parcela e outros custos fixos de um veículo mantido continuam. Não sugerimos bikes aqui porque, sem distância diária, não dá para filtrar autonomia com honestidade. Nenhum dado pessoal é coletado e nada sai do seu navegador.</p>
              </div>
            </div>
          </details>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
