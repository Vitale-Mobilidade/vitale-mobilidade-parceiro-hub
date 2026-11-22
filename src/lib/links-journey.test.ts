import { describe, expect, it, vi } from "vitest";
import { makeLinksJourney } from "./links-journey";
import { validateJourneyHit } from "../../supabase/functions/_shared/links-journey";
const id = "12345678-1234-4123-8123-123456789abc";
function setup() {
  const values = new Map<string, string>();
  let now = 100000;
  let allowed = true;
  const send = vi.fn().mockResolvedValue(undefined);
  const opts = {
    storage: {
      getItem: (k: string) => values.get(k) ?? null,
      setItem: (k: string, v: string) => {
        values.set(k, v);
      },
      removeItem: (k: string) => {
        values.delete(k);
      },
    },
    now: () => now,
    uuid: () => id,
    send,
    allowed: () => allowed,
  };
  return {
    opts,
    send,
    values,
    t: makeLinksJourney(opts),
    advance: (n: number) => {
      now += n;
    },
    deny: () => {
      allowed = false;
    },
  };
}
describe("anonymous bio journey", () => {
  it("records the committed route even while the browser URL still points to the previous page", async () => {
    vi.resetModules();
    const { startLinksJourney, trackBioChoice } = await import("./links-journey");
    const h = setup();
    const send = vi.fn<typeof fetch>().mockResolvedValue(new Response(null, { status: 204 }));
    vi.stubGlobal("window", { location: { pathname: "/links" }, sessionStorage: h.opts.storage });
    vi.stubGlobal("crypto", { randomUUID: () => id });
    vi.stubGlobal("fetch", send);
    try {
      startLinksJourney(() => true, "/links");
      trackBioChoice("radar");
      startLinksJourney(() => true, "/radar");
      startLinksJourney(() => true, "/radar/v20_ultra_max");
      expect(send.mock.calls.map((call) => {
        const hit = JSON.parse(String(call[1]?.body));
        return [hit.sequence, hit.stage, hit.path];
      })).toEqual([
        [0, "landing", "/links"],
        [1, "button_click", "/links"],
        [2, "page_view", "/radar"],
        [3, "page_view", "/radar/v20_ultra_max"],
      ]);
    } finally {
      vi.unstubAllGlobals();
    }
  });
  it("does not start outside the bio; survives document reload and links steps in sequence", () => {
    const h = setup();
    h.t.page("/quiz");
    expect(h.send).not.toHaveBeenCalled();
    h.t.page("/links");
    h.t.page("/links");
    h.t.click("radar", "/links");
    const next = makeLinksJourney(h.opts);
    next.page("/radar/v8_ultra");
    next.conversion("offer_click", "/radar/v8_ultra", "v8_ultra");
    expect(h.send.mock.calls.map((c) => c[0].sequence)).toEqual([0, 1, 2, 3]);
    expect(h.send.mock.calls.map((c) => c[0].stage)).toEqual([
      "landing",
      "button_click",
      "page_view",
      "offer_click",
    ]);
    expect(h.send.mock.calls.every((c) => c[0].session === id)).toBe(true);
  });
  it("clears on opt-out, expires after inactivity and never creates a session at a later destination", () => {
    const h = setup();
    h.t.page("/links");
    h.advance(30 * 60000 + 1);
    h.t.page("/quiz");
    expect(h.send).toHaveBeenCalledTimes(1);
    h.t.page("/links");
    h.deny();
    h.t.page("/privacidade");
    h.t.click("quiz", "/links");
    expect(h.send).toHaveBeenCalledTimes(2);
    expect(h.values.size).toBe(0);
  });
  it("caps at 100 events and swallows network failures without delaying navigation", () => {
    const h = setup();
    h.send.mockImplementation(() => {
      throw Error("offline");
    });
    expect(() => {
      h.t.page("/links");
      for (let i = 0; i < 110; i++) h.t.click("quiz", "/links");
    }).not.toThrow();
    expect(h.send).toHaveBeenCalledTimes(100);
  });
  it("rejects identifiers, query, private paths and impossible stages", () => {
    const hit = {
      event: "links_journey",
      session: id,
      sequence: 0,
      stage: "landing",
      path: "/links",
      choice: "",
      bikeId: "",
    };
    expect(validateJourneyHit(hit)).toEqual(hit);
    for (const changed of [
      { email: "x" },
      { path: "/links?email=x" },
      { path: "/admin" },
      { sequence: 101 },
      { stage: "purchase" },
      { session: "user@example.com" },
      { choice: "spotify" },
      { stage: "quiz_completed", sequence: 1, path: "/radar" },
    ])
      expect(validateJourneyHit({ ...hit, ...changed })).toBeNull();
    expect(
      validateJourneyHit({
        ...hit,
        sequence: 1,
        stage: "button_click",
        choice: "spotify",
      }),
    ).toBeTruthy();
  });
});
