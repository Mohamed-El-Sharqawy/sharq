// SPEC §7/EC-28 — the server's date-only "today" is Africa/Cairo at the
// boundary layer (membership-dates.ts keeps pure label math; the plugin
// layer owns the Cairo boundary). One Intl format (en-CA → YYYY-MM-DD),
// DST-safe via the IANA database. §5.2 defines no setting for it — fixed
// in code with this citation.
export function cairoToday(now: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Africa/Cairo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}
