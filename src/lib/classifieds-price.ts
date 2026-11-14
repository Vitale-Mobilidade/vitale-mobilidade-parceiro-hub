export const CLASSIFIEDS_FEE_CENTS = 5000;
export const LEGACY_CLASSIFIEDS_FEE_CENTS = 15000;

export function isClassifiedsFee(cents: unknown): cents is number {
  return (
    cents === CLASSIFIEDS_FEE_CENTS || cents === LEGACY_CLASSIFIEDS_FEE_CENTS
  );
}

export function classifiedsFeeLabel(
  cents = CLASSIFIEDS_FEE_CENTS,
  decimals = false,
) {
  return `R$${(cents / 100).toLocaleString("pt-BR", {
    minimumFractionDigits: decimals ? 2 : 0,
  })}`;
}
