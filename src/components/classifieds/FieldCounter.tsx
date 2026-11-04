const number = new Intl.NumberFormat("pt-BR");

export function FieldCounter({
  id,
  value,
  min,
  max,
  optional = false,
}: {
  id: string;
  value: string;
  min: number;
  max: number;
  optional?: boolean;
}) {
  const used = value.length;
  const remaining = Math.max(0, min - value.trim().length);
  const needsMore =
    remaining > 0 && (optional ? value.trim().length > 0 : used > 0);
  return (
    <span
      id={id}
      className="mt-2 block text-xs font-normal text-muted-foreground"
    >
      <span className="flex flex-wrap justify-between gap-x-4 gap-y-1">
        <span>
          {min > 0
            ? `${optional ? "Se preencher: mínimo" : "Mínimo"} ${number.format(min)} · máximo ${number.format(max)}`
            : `Opcional · máximo ${number.format(max)}`}
        </span>
        <span className="tabular-nums" data-character-count>
          {number.format(used)} / {number.format(max)} caracteres
        </span>
      </span>
      {needsMore && (
        <span className="mt-1 block text-amber-800">
          Faltam {remaining} {remaining === 1 ? "caractere" : "caracteres"} para
          o mínimo
          {used !== value.trim().length ? " (sem espaços nas pontas)" : ""}.
        </span>
      )}
      {used >= max && (
        <span className="mt-1 block">
          {used === max
            ? "Limite máximo atingido."
            : "Reduza o texto para respeitar o limite."}
        </span>
      )}
    </span>
  );
}
