/* eslint-disable @typescript-eslint/no-explicit-any -- Stateful database test doubles exercise persistence, filters and CAS. */
/* In-memory database fixture: executes filters/CAS and keeps rows across simulated worker restarts. */
export function newsletterTestDb(seed: Record<string, any[]> = {}) {
  const tables: Record<string, any[]> = structuredClone(seed);
  const writes: { table: string; op: string; value: any }[] = [];
  let fail: { table: string; op: string } | null = null;
  const db: any = {
    rpc: async (name: string) => ({
      data: name === "newsletter_next_edition_number" ? 4 : true,
      error: null,
    }),
    from: (table: string) => {
      tables[table] ??= [];
      const filters: ((row: any) => boolean)[] = [];
      let op = "select",
        value: any,
        limit = Infinity,
        offset = 0,
        sort: string | undefined,
        ascending = true;
      const result = () => {
        if (fail?.table === table && fail.op === op) {
          fail = null;
          return { data: null, error: { code: "synthetic_failure" } };
        }
        let rows = tables[table].filter((row) => filters.every((f) => f(row)));
        if (sort)
          rows.sort(
            (a, b) =>
              String(a[sort!]).localeCompare(String(b[sort!])) *
              (ascending ? 1 : -1),
          );
        rows = rows.slice(offset, offset + limit);
        if (op !== "select")
          writes.push({ table, op, value: structuredClone(value) });
        if (op === "insert") {
          const row = {
            id: "00000000-0000-4000-8000-000000000010",
            revision: 1,
            attempts: 0,
            status: "queued",
            feedback: [],
            created_at: new Date().toISOString(),
            next_attempt_at: new Date().toISOString(),
            ...value,
          };
          tables[table].push(row);
          rows = [row];
        }
        if (op === "upsert") {
          const row = tables[table].find(
            (x) => x.edition_day === value.edition_day,
          );
          if (row) Object.assign(row, structuredClone(value));
          else tables[table].push(structuredClone(value));
          rows = [row ?? value];
        }
        if (op === "update")
          for (const row of rows) Object.assign(row, structuredClone(value));
        return { data: structuredClone(rows), error: null };
      };
      const q: any = {
        select: () => q,
        eq: (k: string, v: any) => {
          filters.push((r) => r[k] === v);
          return q;
        },
        is: (k: string, v: any) => {
          filters.push((r) => r[k] === v);
          return q;
        },
        in: (k: string, v: any[]) => {
          filters.push((r) => v.includes(r[k]));
          return q;
        },
        lt: (k: string, v: any) => {
          filters.push((r) => r[k] < v);
          return q;
        },
        lte: (k: string, v: any) => {
          filters.push((r) => r[k] <= v);
          return q;
        },
        range: (from: number, to: number) => {
          offset = from;
          limit = to - from + 1;
          return q;
        },
        limit: (n: number) => {
          limit = n;
          return q;
        },
        order: (k: string, o: any = {}) => {
          sort = k;
          ascending = o.ascending !== false;
          return q;
        },
        insert: (v: any) => {
          op = "insert";
          value = v;
          return q;
        },
        upsert: (v: any) => {
          op = "upsert";
          value = v;
          return q;
        },
        update: (v: any) => {
          op = "update";
          value = v;
          return q;
        },
        then: (fn: any) => Promise.resolve(result()).then(fn),
        single: async () => {
          const r = result();
          return { ...r, data: r.data?.[0] ?? null };
        },
        maybeSingle: async () => {
          const r = result();
          return { ...r, data: r.data?.[0] ?? null };
        },
      };
      return q;
    },
  };
  return {
    db,
    tables,
    writes,
    failNext: (table: string, op: string) => {
      fail = { table, op };
    },
  };
}
