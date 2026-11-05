export const memberAccountsEnabled =
  import.meta.env.VITE_MEMBER_ACCOUNTS_ENABLED !== "false";

// Public accounts and classifieds launched with the server eligibility gate on 05/11/2026.
export const memberPublicNavigationEnabled = memberAccountsEnabled;
