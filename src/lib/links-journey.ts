import {
  journeyPath,
  validateJourneyHit,
  type BioChoice,
  type JourneyHit,
  type JourneyStage,
} from "../../supabase/functions/_shared/links-journey";
export const LINKS_SESSION_KEY = "vitale_links_journey_v1";
type State = {
  id: string;
  started: number;
  last: number;
  sequence: number;
  path: string;
};
type Options = {
  storage: Pick<Storage, "getItem" | "setItem" | "removeItem">;
  allowed: () => boolean;
  send: (hit: JourneyHit) => Promise<unknown>;
  now: () => number;
  uuid: () => string;
};
/** Per-tab navigation sessions, never people. No identifier appears in URLs or tags. */
export function makeLinksJourney(options: Options) {
  let state: State | null = null;
  const clear = () => {
    state = null;
    try {
      options.storage.removeItem(LINKS_SESSION_KEY);
    } catch {
      /* no storage */
    }
  };
  const load = () => {
    if (!options.allowed()) {
      clear();
      return null;
    }
    try {
      if (!state)
        state = JSON.parse(
          options.storage.getItem(LINKS_SESSION_KEY) ?? "null",
        );
      const now = options.now();
      if (
        !state ||
        !/^[0-9a-f-]{36}$/.test(state.id) ||
        !Number.isInteger(state.sequence) ||
        state.sequence < 0 ||
        state.sequence > 100 ||
        !Number.isFinite(state.started) ||
        !Number.isFinite(state.last) ||
        state.started > now ||
        state.last > now ||
        now - state.last > 30 * 60_000 ||
        now - state.started > 2 * 60 * 60_000
      ) {
        clear();
        return null;
      }
      return state;
    } catch {
      clear();
      return null;
    }
  };
  const emit = (
    stage: JourneyStage,
    path: string,
    choice: BioChoice | "" = "",
    bikeId = "",
  ) => {
    const current = load();
    if (!current || current.sequence >= 100) return;
    const hit = validateJourneyHit({
      event: "links_journey",
      session: current.id,
      sequence: current.sequence,
      stage,
      path,
      choice,
      bikeId,
    });
    if (!hit) return;
    current.sequence++;
    current.last = options.now();
    try {
      options.storage.setItem(LINKS_SESSION_KEY, JSON.stringify(current));
    } catch {
      /* memory only */
    }
    try {
      void options.send(hit).catch(() => {});
    } catch {
      /* never blocks links */
    }
  };
  return {
    page(pathname: string) {
      const current = load();
      const path = journeyPath(pathname);
      if (!path) return;
      if (!current && path === "/links" && options.allowed()) {
        state = {
          id: options.uuid(),
          started: options.now(),
          last: options.now(),
          sequence: 0,
          path,
        };
        // Persist before emit so a full document navigation can continue this session.
        try {
          options.storage.setItem(LINKS_SESSION_KEY, JSON.stringify(state));
        } catch {
          /* memory only */
        }
        emit("landing", path);
        return;
      }
      if (current && current.path !== path) {
        current.path = path;
        emit("page_view", path);
      }
    },
    click(choice: BioChoice, path: string) {
      emit("button_click", path, choice);
    },
    conversion(
      stage:
        | "quiz_started"
        | "quiz_completed"
        | "newsletter_subscribed"
        | "offer_click",
      path: string,
      bikeId = "",
    ) {
      emit(stage, path, "", bikeId);
    },
  };
}
let active: ReturnType<typeof makeLinksJourney> | undefined;
export function startLinksJourney(allowed: () => boolean) {
  if (typeof window === "undefined") return;
  try {
    if (!active)
      active = makeLinksJourney({
        storage: window.sessionStorage,
        allowed,
        now: Date.now,
        uuid: () => crypto.randomUUID(),
        send: (hit) =>
          fetch(
            `${import.meta.env.VITE_SUPABASE_URL ?? ""}/functions/v1/site-analytics`,
            {
              method: "POST",
              credentials: "omit",
              keepalive: true,
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(hit),
            },
          ),
      });
    active.page(window.location.pathname);
  } catch {
    /* SSR/storage/analytics cannot break navigation */
  }
}
export function trackBioChoice(choice: BioChoice) {
  try {
    if (typeof window !== "undefined")
      active?.click(choice, window.location.pathname);
  } catch {
    /* no-op */
  }
}
export function trackLinksConversion(
  stage:
    "quiz_started" | "quiz_completed" | "newsletter_subscribed" | "offer_click",
  bikeId = "",
) {
  try {
    if (typeof window !== "undefined")
      active?.conversion(stage, window.location.pathname, bikeId);
  } catch {
    /* no-op */
  }
}
