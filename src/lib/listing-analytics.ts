import { googleAnalyticsDisabled } from "./gtm-script";
import { supabase } from "@/integrations/supabase/client";
import { createClientOnlyFn } from "@tanstack/react-start";
/** Nonblocking, pseudonymous and deduplicated on the server. Never records contact data. */
export const trackListing = createClientOnlyFn(
  (id: string, event: "impression" | "visit" | "whatsapp") => {
    if (
      !["vitalemobilidade.com", "www.vitalemobilidade.com"].includes(
        window.location.hostname,
      ) ||
      googleAnalyticsDisabled()
    )
      return;
    try {
      let visitor = localStorage.getItem("vitale-listing-visitor");
      if (!visitor || !/^[a-f0-9-]{36}$/.test(visitor)) {
        visitor = crypto.randomUUID();
        localStorage.setItem("vitale-listing-visitor", visitor);
      }
      void supabase
        .rpc(
          "member_listing_track" as never,
          { p_id: id, p_event: event, p_visitor: visitor } as never,
        )
        .then(
          () => {},
          () => {},
        );
    } catch {
      /* Storage/analytics must never prevent a visit or WhatsApp contact. */
    }
  },
);
