import { expect, it } from "vitest";
import { isMemberPrivatePath } from "./member-private-path";
it.each([
  "/conta",
  "/conta/",
  "/conta/anuncios",
  "/conta/anuncios/",
  "/newsletter/confirmar",
  "/newsletter/confirmar/",
])("keeps private path %s outside tracking", (path) =>
  expect(isMemberPrivatePath(path)).toBe(true),
);
it("keeps the newsletter information page public", () =>
  expect(isMemberPrivatePath("/newsletter")).toBe(false));
