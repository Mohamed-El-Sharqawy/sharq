// SPEC §14.3 view-transition machinery: travel direction (forward/back)
// derived from react-router's history idx deltas, plus the fallback
// marker when document.startViewTransition is absent. The slide
// animations and the prefers-reduced-motion kill switch live in
// @sharq/ui globals.css — this module only feeds them state.
import { useEffect, useRef } from "react";
import { useLocation } from "react-router";

export type VtDirection = "forward" | "back";

// Pure direction math: a deeper idx is forward travel, a shallower one
// is back; first paint and replace navigations read as forward (a swap
// is not travel back).
export function nextDirection(
  previous: number | undefined,
  current: number | undefined,
): VtDirection {
  if (previous === undefined || current === undefined || current >= previous) {
    return "forward";
  }
  return "back";
}

// Toggles the class the fallback fade keys off (SPEC §14.3).
export function applyViewTransitionFallbackClass(doc: Document): void {
  doc.documentElement.classList.toggle(
    "vt-fallback",
    typeof doc.startViewTransition !== "function",
  );
}

// Renders nothing. Mounted once from the root App: maintains
// html[data-vt-dir] on every location change and the html.vt-fallback
// boot class for the whole session.
export function ViewTransitionDirector() {
  const lastIdx = useRef<number | undefined>(undefined);
  const location = useLocation();

  useEffect(() => {
    applyViewTransitionFallbackClass(document);
  }, []);

  useEffect(() => {
    // react-router's browser history stores its stack index in
    // history.state.idx — the same source ScrollRestoration uses.
    const idx = (window.history.state as { idx?: number } | null)?.idx;
    document.documentElement.dataset.vtDir = nextDirection(
      lastIdx.current,
      idx,
    );
    lastIdx.current = idx;
  }, [location]);

  return null;
}
