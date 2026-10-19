// Membership date arithmetic on ISO labels. Pure calendar math anchored to
// UTC keeps it offset-free — the Cairo boundary (§7) is the plugin layer's
// duty (roadmap row 4); the service only ever sees date labels.
export function prevDay(iso: string): string {
  const day = new Date(`${iso}T00:00:00Z`);
  day.setUTCDate(day.getUTCDate() - 1);
  return day.toISOString().slice(0, 10);
}
