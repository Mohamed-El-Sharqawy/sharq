// apps/web — Cairo "today" as an ISO date label (SPEC §7: dates carry
// Cairo semantics at the boundary layer). Mirrors
// apps/api/src/lib/cairo-today.ts for date-input DEFAULTS only — the
// server re-validates every date it stores. en-CA yields YYYY-MM-DD.
export function cairoTodayIso(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Africa/Cairo",
  }).format(new Date());
}
