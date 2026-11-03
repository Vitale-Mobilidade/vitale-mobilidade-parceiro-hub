import { expect, it } from "vitest";
import { memberPhone, memberIdentitySchema } from "./member-identity";
it.each([
  ["(11) 99999-9999", "+5511999999999"],
  ["+55 (21) 98888-8888", "+5521988888888"],
  ["11999999999", "+5511999999999"],
])("normalizes a Brazilian mobile %s", (input, expected) =>
  expect(memberPhone(input)).toBe(expected),
);
it.each([
  "1199999999",
  "abc11999999999",
  "+1 202 555 0100",
  "5511999999999999",
  "",
])("rejects invalid mobiles %s", (input) =>
  expect(memberPhone(input)).toBeUndefined(),
);
it("projects only status, with no private verification data", () => {
  const result = memberIdentitySchema.parse({
    emailVerified: false,
    phoneVerified: false,
    phoneMasked: null,
    canInteract: false,
    code: "123456",
    destination: "private",
  });
  expect(result).not.toHaveProperty("code");
  expect(result).not.toHaveProperty("destination");
});
