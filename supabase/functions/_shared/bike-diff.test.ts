import { describe, expect, it } from "vitest";
import {
  countChangedBikes,
  currentScheduledSlot,
  diffBikes,
  DUE_TOLERANCE_MS,
  isDue,
  isScheduleLate,
  nextScheduledRun,
  type DiffableBike,
} from "./bike-diff.ts";

const iso = (s: string) => new Date(s);

describe("agenda fixa HH:07 America/Sao_Paulo", () => {
  it("aponta para o :07 da hora seguinte quando já passou", () => {
    expect(nextScheduledRun(iso("2026-08-23T14:30:00Z")).toISOString())
      .toBe("2026-08-23T15:07:00.000Z");
  });

  it("aponta para o :07 da mesma hora quando ainda não chegou", () => {
    expect(nextScheduledRun(iso("2026-08-23T14:02:00Z")).toISOString())
      .toBe("2026-08-23T14:07:00.000Z");
  });

  it("execução manual colada no slot não pula a automática seguinte", () => {
    // Manual às 14:05 -> próximo agendado continua 14:07 (não vai para 15:07).
    expect(nextScheduledRun(iso("2026-08-23T14:05:00Z")).toISOString())
      .toBe("2026-08-23T14:07:00.000Z");
  });

  it("conclusão exatamente no :07 avança para a hora seguinte (sem repetir slot)", () => {
    expect(nextScheduledRun(iso("2026-08-23T14:07:10Z")).toISOString())
      .toBe("2026-08-23T15:07:00.000Z");
  });

  it("vira o dia corretamente", () => {
    expect(nextScheduledRun(iso("2026-08-23T23:30:00Z")).toISOString())
      .toBe("2026-08-24T00:07:00.000Z");
  });

  it("currentScheduledSlot devolve o slot programado da execução", () => {
    expect(currentScheduledSlot(iso("2026-08-23T14:07:03Z")).toISOString())
      .toBe("2026-08-23T14:07:00.000Z");
    expect(currentScheduledSlot(iso("2026-08-23T14:01:00Z")).toISOString())
      .toBe("2026-08-23T13:07:00.000Z");
  });
});

describe("isDue / atraso", () => {
  it("vencido quando o horário chegou", () => {
    expect(isDue("2026-08-23T14:07:00Z", iso("2026-08-23T14:07:01Z"))).toBe(true);
  });

  it("tolera o cron chegando poucos milissegundos antes", () => {
    const now = new Date(iso("2026-08-23T14:07:00Z").getTime() - DUE_TOLERANCE_MS + 1000);
    expect(isDue("2026-08-23T14:07:00Z", now)).toBe(true);
  });

  it("não vencido bem antes do horário", () => {
    expect(isDue("2026-08-23T15:07:00Z", iso("2026-08-23T14:30:00Z"))).toBe(false);
  });

  it("valores ausentes/ inválidos contam como vencidos", () => {
    expect(isDue(null, new Date())).toBe(true);
    expect(isDue("não-é-data", new Date())).toBe(true);
  });

  it("atraso só depois de 10 minutos", () => {
    expect(isScheduleLate("2026-08-23T14:07:00Z", iso("2026-08-23T14:12:00Z"))).toBe(false);
    expect(isScheduleLate("2026-08-23T14:07:00Z", iso("2026-08-23T14:20:00Z"))).toBe(true);
  });
});

const bike = (p: Partial<DiffableBike> & { id: string }): DiffableBike => ({
  name: "Bike",
  linkVitale: "https://meli.la/abc",
  price: 1000,
  autonomyKm: 50,
  capacity: 1,
  description: "desc",
  image: "https://img/1.png",
  status: "eligible",
  ...p,
});

describe("diffBikes", () => {
  it("detecta bike nova", () => {
    const changes = diffBikes([], [bike({ id: "v8", name: "V8 Ultra" })]);
    expect(changes).toHaveLength(1);
    expect(changes[0]).toMatchObject({ bike_id: "v8", change_type: "new", new_value: "V8 Ultra" });
  });

  it("detecta bike removida", () => {
    const changes = diffBikes([bike({ id: "old", name: "Antiga" })], []);
    expect(changes).toEqual([
      expect.objectContaining({ bike_id: "old", change_type: "removed", old_value: "Antiga" }),
    ]);
  });

  it("registra uma linha por campo alterado, com rótulo pt-BR", () => {
    const changes = diffBikes(
      [bike({ id: "v8", price: 8990, autonomyKm: 60 })],
      [bike({ id: "v8", price: 9990, autonomyKm: 80 })],
    );
    expect(changes.map((c) => [c.field, c.old_value, c.new_value])).toEqual([
      ["price", "8990", "9990"],
      ["autonomyKm", "60", "80"],
    ]);
    expect(changes[0].field_label).toBe("Preço R$");
    expect(changes[1].field_label).toBe("Autonomia");
  });

  it("audita os 7 campos exigidos", () => {
    const changes = diffBikes(
      [bike({ id: "a" })],
      [bike({
        id: "a",
        name: "Novo nome",
        linkVitale: "https://meli.la/zzz",
        price: 2000,
        autonomyKm: 70,
        capacity: 2,
        description: "outra",
        image: "https://img/2.png",
      })],
    );
    expect(changes.map((c) => c.field)).toEqual([
      "name", "linkVitale", "price", "autonomyKm", "capacity", "description", "image",
    ]);
  });

  it("ignora diferenças só de espaço em branco", () => {
    expect(diffBikes([bike({ id: "a", description: "  linda   bike " })], [bike({ id: "a", description: "linda bike" })]))
      .toEqual([]);
  });

  it("marca inativação e reativação", () => {
    const off = diffBikes([bike({ id: "a" })], [bike({ id: "a", status: "inactive" })]);
    expect(off[0]).toMatchObject({ change_type: "inactivated", field: "status" });
    const on = diffBikes([bike({ id: "a", status: "inactive" })], [bike({ id: "a" })]);
    expect(on[0]).toMatchObject({ change_type: "reactivated" });
  });

  it("catálogo idêntico não gera mudanças", () => {
    const list = [bike({ id: "a" }), bike({ id: "b" })];
    expect(diffBikes(list, list.map((b) => ({ ...b })))).toEqual([]);
  });

  it("countChangedBikes conta bikes distintas", () => {
    const changes = diffBikes(
      [bike({ id: "a", price: 1 }), bike({ id: "b", price: 1 })],
      [bike({ id: "a", price: 2, name: "X" }), bike({ id: "b", price: 3 })],
    );
    expect(changes.length).toBeGreaterThan(2);
    expect(countChangedBikes(changes)).toBe(2);
  });
});
