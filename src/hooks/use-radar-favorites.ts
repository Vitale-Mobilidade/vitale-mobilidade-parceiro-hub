import { useEffect, useRef, useState } from "react";
import { useMemberSession } from "./use-member-session";
import { memberAccountsEnabled } from "@/lib/member-accounts-feature";
import { memberLoginHref } from "@/lib/member-community";
import {
  readFavoriteIntent,
  clearFavoriteIntent,
  rememberFavoriteIntent,
} from "@/lib/radar-favorites";
import {
  listRadarFavorites,
  setRadarFavorite,
} from "@/lib/radar-favorites-api";

const EMPTY = new Set<string>();
type State = {
  owner?: string;
  ids: Set<string>;
  ready: boolean;
  error: string;
};

/** One private read/auth listener per catalog, never one per card. */
export function useRadarFavorites() {
  const { session, loading: sessionLoading } = useMemberSession();
  const userId = session?.user.id;
  const currentUser = useRef(userId);
  currentUser.current = userId;
  const [state, setState] = useState<State>({
    ids: EMPTY,
    ready: false,
    error: "",
  });
  const [retry, setRetry] = useState(0);
  const [pending, setPending] = useState<Set<string>>(EMPTY);
  const locks = useRef(new Set<string>());
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    let active = true;
    locks.current = new Set();
    setPending(EMPTY);
    setErrors({});
    setState({ owner: userId, ids: EMPTY, ready: false, error: "" });
    if (!userId || !memberAccountsEnabled) return;
    void (async () => {
      try {
        const ids = new Set(await listRadarFavorites());
        if (!active) return;
        let intent: string | null = null;
        try {
          intent = readFavoriteIntent(window.sessionStorage);
        } catch {
          /* Blocked storage. */
        }
        if (intent) {
          try {
            await setRadarFavorite(intent, true);
            if (!active) return;
            ids.add(intent);
            try {
              clearFavoriteIntent(window.sessionStorage);
            } catch {
              /* Blocked storage. */
            }
          } catch {
            if (!active) return;
            try {
              clearFavoriteIntent(window.sessionStorage);
            } catch {
              /* Blocked storage. */
            }
            setErrors({
              [intent]: "Não foi possível favoritar. Tente novamente.",
            });
          }
        }
        if (active) setState({ owner: userId, ids, ready: true, error: "" });
      } catch {
        if (active)
          setState({
            owner: userId,
            ids: EMPTY,
            ready: false,
            error: "Não foi possível carregar seus favoritos.",
          });
      }
    })();
    return () => {
      active = false;
    };
  }, [userId, retry]);

  const ownsState = state.owner === userId;
  const savedIds = ownsState ? state.ids : EMPTY;
  async function toggle(bikeId: string) {
    if (sessionLoading || !memberAccountsEnabled) return;
    if (!userId) {
      try {
        rememberFavoriteIntent(window.sessionStorage, bikeId);
      } catch {
        /* Blocked storage. */
      }
      window.location.assign(
        memberLoginHref(
          window.location.pathname + window.location.search + `#bike-${bikeId}`,
        ),
      );
      return;
    }
    if (!ownsState || !state.ready || locks.current.has(bikeId)) return;
    const owner = userId;
    const requestLocks = locks.current;
    requestLocks.add(bikeId);
    setPending(new Set(requestLocks));
    setErrors((prev) => ({ ...prev, [bikeId]: "" }));
    const saved = !savedIds.has(bikeId);
    try {
      await setRadarFavorite(bikeId, saved);
      if (currentUser.current !== owner) return;
      setState((prev) => {
        if (prev.owner !== owner) return prev;
        const ids = new Set(prev.ids);
        if (saved) ids.add(bikeId);
        else ids.delete(bikeId);
        return { ...prev, ids };
      });
    } catch {
      if (currentUser.current === owner)
        setErrors((prev) => ({
          ...prev,
          [bikeId]: "Não foi possível atualizar o favorito. Tente novamente.",
        }));
    } finally {
      requestLocks.delete(bikeId);
      if (currentUser.current === owner) setPending(new Set(requestLocks));
    }
  }
  return {
    enabled: memberAccountsEnabled,
    authenticated: Boolean(userId),
    savedIds,
    loading:
      sessionLoading ||
      Boolean(userId && (!ownsState || !state.ready) && !state.error),
    unavailable: Boolean(userId && (!ownsState || !state.ready)),
    error: ownsState ? state.error : "",
    errors: ownsState ? errors : {},
    pending: ownsState ? pending : EMPTY,
    toggle,
    retry: () => setRetry((n) => n + 1),
  };
}
