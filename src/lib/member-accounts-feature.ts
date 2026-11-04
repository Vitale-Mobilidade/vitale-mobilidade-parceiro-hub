export const memberAccountsEnabled =
  import.meta.env.VITE_MEMBER_ACCOUNTS_ENABLED !== "false";

// Keep public discovery on hold; direct access and existing sessions stay available.
export const memberPublicNavigationEnabled = false;
