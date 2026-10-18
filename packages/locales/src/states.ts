// @sharq/locales — shared state-component strings (SPEC §9.9). The three
// components in @sharq/ui import these keys for their fixed Arabic labels;
// screen-specific empty/error messages stay in @sharq/locales too and reach
// the components via props (SPEC §11 rows).
export const LOADING_LABEL = "جارٍ التحميل…";
export const RETRY_ACTION = "حاول تاني";

// SPEC §11 dashboard row — «مفيش فرق لسه»; the canonical screen-supplied
// empty message (also used by the §9.9 render specs as the prop proof).
export const EMPTY_DASHBOARD_TEAMS = "مفيش فرق لسه";
