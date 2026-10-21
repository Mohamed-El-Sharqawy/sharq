// @sharq/locales — shared state-component strings (SPEC §9.9). The three
// components in @sharq/ui import these keys for their fixed Arabic labels;
// screen-specific empty/error messages stay in @sharq/locales too and reach
// the components via props (SPEC §11 rows).
export const LOADING_LABEL = "جارٍ التحميل…";
export const RETRY_ACTION = "حاول تاني";

// SPEC §11 dashboard row — «مفيش فرق لسه»; the canonical screen-supplied
// empty message (also used by the §9.9 render specs as the prop proof).
export const EMPTY_DASHBOARD_TEAMS = "مفيش فرق لسه";

// Shared dialog + pagination strings (SPEC §2 table: Save/Saving verbatim;
// the rest is canonical wording — one home, reused by every dialog).
export const DIALOG_CANCEL = "إلغاء";
export const DIALOG_CLOSE = "اقفل";
export const SAVE_SUBMIT = "حفظ";
export const SAVE_SUBMITTING = "بيحفظ…";
export const NEXT_PAGE = "اللي بعديه";
export const PREVIOUS_PAGE = "اللي فات";
export const TOTAL_COUNT = "الإجمالي";

// Transport-level failure (server unreachable) — the same sentence login
// coined (LOGIN_UNAVAILABLE); re-exported under a screen-neutral name for
// the shared data layer (app/lib/sharq-error.ts).
export { LOGIN_UNAVAILABLE as SERVER_UNAVAILABLE } from "./login";
