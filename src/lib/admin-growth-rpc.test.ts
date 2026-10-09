import { describe, expect, it } from "vitest";
import { parseQuizBikeMetrics } from "../../supabase/functions/_shared/admin-growth";

describe("Admin Growth Quiz metrics RPC contract", () => {
  it("accepts aggregate items and normalizes serialized bigint counts", () => {
    expect(parseQuizBikeMetrics({
      bikes: [{
        bikeId: "bw1",
        name: "BW1",
        primaryRecommendations: 106,
        secondaryRecommendations: "141",
        quizOfferClicks: 88,
      }],
    })).toEqual([{
      bikeId: "bw1",
      name: "BW1",
      primaryRecommendations: 106,
      secondaryRecommendations: 141,
      quizOfferClicks: 88,
    }]);
  });

  it("treats an empty aggregate as available data", () => {
    expect(parseQuizBikeMetrics({ bikes: [] })).toEqual([]);
  });

  it.each([
    null,
    [],
    {},
    { bikes: null },
    { bikes: [{ bikeId: "bw1", name: "BW1", primaryRecommendations: -1, secondaryRecommendations: 0, quizOfferClicks: 0 }] },
    { bikes: [{ bikeId: "bw1", name: "BW1", primaryRecommendations: 1, secondaryRecommendations: 0, quizOfferClicks: "NaN" }] },
    { bikes: [{ bikeId: "bw1", name: "BW1", primaryRecommendations: null, secondaryRecommendations: 0, quizOfferClicks: 0 }] },
    { bikes: [{ bikeId: "bw1", name: "BW1", primaryRecommendations: true, secondaryRecommendations: 0, quizOfferClicks: 0 }] },
    { bikes: [{ bikeId: "bw1", name: "BW1", primaryRecommendations: "", secondaryRecommendations: 0, quizOfferClicks: 0 }] },
    { bikes: [{ bikeId: "bw1", name: "BW1", primaryRecommendations: "   ", secondaryRecommendations: 0, quizOfferClicks: 0 }] },
    { bikes: [{ bikeId: "bw1", name: "BW1", primaryRecommendations: [], secondaryRecommendations: 0, quizOfferClicks: 0 }] },
    { bikes: [{ bikeId: "bw1", name: "BW1", primaryRecommendations: "1e2", secondaryRecommendations: 0, quizOfferClicks: 0 }] },
    { bikes: [{ bikeId: "bw1", name: "BW1", primaryRecommendations: "1.5", secondaryRecommendations: 0, quizOfferClicks: 0 }] },
    { bikes: [{ bikeId: "bw1", name: "BW1", primaryRecommendations: "9007199254740992", secondaryRecommendations: 0, quizOfferClicks: 0 }] },
  ])("rejects malformed or unsafe payload %#", (payload) => {
    expect(parseQuizBikeMetrics(payload)).toBeNull();
  });
});
