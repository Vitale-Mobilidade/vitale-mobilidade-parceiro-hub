import { afterEach, describe, expect, it, vi } from "vitest";
vi.mock("./video-catalog.server", () => ({ fetchVideoCatalog: vi.fn() }));
import { fetchVideoCatalog } from "./video-catalog.server";
import { fetchQuizCatalog } from "./quiz-catalog-repository.server";
afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
  vi.resetAllMocks();
});
describe("quiz catalog video enrichment", () => {
  function setup() {
    vi.stubEnv("SUPABASE_URL", "https://test.invalid");
    vi.stubEnv("SUPABASE_PUBLISHABLE_KEY", "test-key");
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => [
          { id: "v9_max", description: "Description", videoCount: 999 },
        ],
      }),
    );
  }
  it("uses exact distinct video associations rather than snapshot counts", async () => {
    setup();
    vi.mocked(fetchVideoCatalog).mockResolvedValue([
      { videoId: "one", bikeIds: ["v9_max"] },
      { videoId: "one", bikeIds: ["v9_max"] },
      { videoId: "two", bikeIds: ["v9_max_s"] },
    ] as never);
    expect(await fetchQuizCatalog()).toEqual({
      ok: true,
      bikes: [{ id: "v9_max", description: "Description", videoCount: 1 }],
    });
  });
  it("video failure keeps bike catalog available with neutral coverage", async () => {
    setup();
    vi.mocked(fetchVideoCatalog).mockRejectedValue(new Error("offline"));
    expect(await fetchQuizCatalog()).toEqual({
      ok: true,
      bikes: [{ id: "v9_max", description: "Description", videoCount: 0 }],
    });
  });
});
