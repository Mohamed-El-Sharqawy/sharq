// apps/web — the settings section nav (SPEC §11: seven v1 screens;
// /settings/calendar + /settings/security join in v1.1). Rendered on every
// settings screen; NavLink keeps the active screen highlighted. In-app
// navigation carries view transitions (§14.3).
import { NavLink } from "react-router";
import {
  SETTINGS_NAV_BRANDING,
  SETTINGS_NAV_ENTRY,
  SETTINGS_NAV_PERIODS,
  SETTINGS_NAV_POLICIES,
  SETTINGS_NAV_RATES,
  SETTINGS_NAV_REASONS,
  SETTINGS_NAV_STATUSES,
} from "@sharq/locales";

const LINKS = [
  { to: "/settings/rates", label: SETTINGS_NAV_RATES },
  { to: "/settings/entry", label: SETTINGS_NAV_ENTRY },
  { to: "/settings/reasons", label: SETTINGS_NAV_REASONS },
  { to: "/settings/statuses", label: SETTINGS_NAV_STATUSES },
  { to: "/settings/periods", label: SETTINGS_NAV_PERIODS },
  { to: "/settings/policies", label: SETTINGS_NAV_POLICIES },
  { to: "/settings/branding", label: SETTINGS_NAV_BRANDING },
];

export function SettingsNav() {
  return (
    <nav aria-label="الإعدادات" className="flex flex-wrap gap-2">
      {LINKS.map((link) => (
        <NavLink
          key={link.to}
          to={link.to}
          viewTransition
          className={({ isActive }) =>
            `rounded-md border border-border px-3 py-1.5 text-sm ${
              isActive
                ? "bg-primary text-primary-foreground"
                : "bg-transparent text-foreground"
            }`
          }
        >
          {link.label}
        </NavLink>
      ))}
    </nav>
  );
}
