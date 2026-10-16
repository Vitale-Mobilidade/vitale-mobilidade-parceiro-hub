import { Link } from "@tanstack/react-router";
export function RadarAudienceCard({ count }: { count: string | number }) {
  return (
    <Link
      to="/admin/radar"
      className="block rounded-2xl border border-line bg-white p-5 shadow-sm transition hover:border-emerald-600 hover:bg-emerald-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-emerald-700"
    >
      <p className="text-sm text-muted-foreground">
        Radar · pessoas com alertas ativos
      </p>
      <p className="mt-2 text-3xl font-bold">{count}</p>
      <span className="mt-2 block text-sm font-semibold text-emerald-800">
        Ver pessoas, contatos e preços →
      </span>
    </Link>
  );
}
