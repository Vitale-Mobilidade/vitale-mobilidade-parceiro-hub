import { expect, it } from "vitest";
import {
  communitySignupMetadata,
  hasCommunityConsent,
} from "./community-membership";
it("records combined community/newsletter adhesion and only a valid invitation", () => {
  const meta = communitySignupMetadata("Ana", "a".repeat(32));
  expect(hasCommunityConsent(meta)).toBe(true);
  expect(meta.community_invitation_code).toBe("a".repeat(32));
  expect(
    communitySignupMetadata("Ana", "https://evil.invalid"),
  ).not.toHaveProperty("community_invitation_code");
  expect(meta).not.toHaveProperty("role");
  expect(meta).not.toHaveProperty("admin");
});
it("an old or unacknowledged account must explicitly join once", () => {
  expect(hasCommunityConsent({ display_name: "Ana" })).toBe(false);
  expect(
    hasCommunityConsent({
      community_consent_version: "2026-11-03",
      community_newsletter_consent: false,
    }),
  ).toBe(false);
  expect(
    hasCommunityConsent({
      community_consent_version: "outdated",
      community_newsletter_consent: true,
    }),
  ).toBe(false);
});
