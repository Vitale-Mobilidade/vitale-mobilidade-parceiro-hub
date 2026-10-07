import { describe, expect, it } from "vitest";
import { minimumAlertPrice, minimumAlertMessage } from "../../supabase/functions/_shared/price-alert-policy";
describe("price alert minimum", () => {
  it("sets a 30% maximum reduction", () => {
    expect(minimumAlertPrice(7200)).toBe(5040);
    expect(1700 < minimumAlertPrice(7200)).toBe(true);
    expect(5040 >= minimumAlertPrice(7200)).toBe(true);
  });
  it("rounds the minimum upwards to cents", () => {
    expect(minimumAlertPrice(100.01)).toBe(70.01);
    expect(minimumAlertPrice(7970)).toBe(5579);
  });
  it("rejects missing or invalid current prices", () => {
    for (const value of [0, -1, NaN, Infinity]) expect(minimumAlertPrice(value)).toBeNaN();
  });
  it("provides the requested minimum message", () => {
    expect(minimumAlertMessage(7200).replace(/\u00a0/g, " ")).toBe("O valor mínimo para esta bike é R$ 5.040,00.");
  });
});
