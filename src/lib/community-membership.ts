import { referralCode } from "./newsletter-referrals";
export const COMMUNITY_CONSENT_VERSION = "2026-11-03";
export function communitySignupMetadata(
  displayName: string,
  invitation?: string,
) {
  const code = referralCode(invitation);
  return {
    display_name: displayName,
    community_consent_version: COMMUNITY_CONSENT_VERSION,
    community_newsletter_consent: true,
    ...(code ? { community_invitation_code: code } : {}),
  };
}
export function hasCommunityConsent(
  metadata: Record<string, unknown> | undefined,
) {
  return (
    metadata?.community_consent_version === COMMUNITY_CONSENT_VERSION &&
    metadata.community_newsletter_consent === true
  );
}
