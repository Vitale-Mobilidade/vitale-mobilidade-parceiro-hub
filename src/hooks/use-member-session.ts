import { useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

export function useMemberSession() {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    let active = true;
    let observed = false;
    const { data: listener } = supabase.auth.onAuthStateChange(
      (_event, value) => {
        observed = true;
        if (active) {
          setSession(value);
          setLoading(false);
        }
      },
    );
    void supabase.auth
      .getSession()
      .then(({ data, error }) => {
        if (active && !observed) {
          setSession(error ? null : data.session);
          setLoading(false);
        }
      })
      .catch(() => {
        if (active && !observed) setLoading(false);
      });
    return () => {
      active = false;
      listener.subscription.unsubscribe();
    };
  }, []);
  return { session, loading };
}
