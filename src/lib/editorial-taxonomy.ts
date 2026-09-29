/** Persistent CMS content_type is authoritative; titles are never used to guess a category. */
export const EDITORIAL_FORMATS = [
  { value: "test", label: "Testes e análises" },
  { value: "comparison", label: "Comparativos" },
  { value: "guide", label: "Guias de escolha" },
  { value: "tips", label: "Uso e cuidados" },
  { value: "economy", label: "Custos e economia" },
  { value: "other", label: "Outros conteúdos" },
] as const;

export function editorialFormat(value: unknown) {
  return (
    EDITORIAL_FORMATS.find((format) => format.value === value) ??
    EDITORIAL_FORMATS[5]
  );
}
