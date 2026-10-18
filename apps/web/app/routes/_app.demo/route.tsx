// `/demo` — the RTL demo page (SPEC §14.3's navigation vehicle and row
// 13's visual baseline): the three shared states (§9.9) on one page plus
// view-transition links. TEMP demo scaffold — it grows with each
// design-system batch and is replaced by real screens from Phase 3 on.
import {
  EmptyState,
  ErrorState,
  LoadingState,
} from "@sharq/ui/components/states";
import { DEMO_TITLE, EMPTY_DASHBOARD_TEAMS, HOME_LINK } from "@sharq/locales";
import { Link, useViewTransitionState } from "react-router";

export default function Demo() {
  // SPEC §14.3 useViewTransitionState: exposed as data-vt-active so the
  // transitioning link is styleable + assertable.
  const transitioning = useViewTransitionState("/");
  return (
    <main className="flex flex-col gap-4 p-4">
      <h1>{DEMO_TITLE}</h1>
      <EmptyState message={EMPTY_DASHBOARD_TEAMS} />
      <LoadingState />
      {/* onRetry fixed in code: demo-only no-op, not a business value. */}
      <ErrorState onRetry={() => {}} />
      <Link to="/" viewTransition data-vt-active={transitioning}>
        {HOME_LINK}
      </Link>
    </main>
  );
}
