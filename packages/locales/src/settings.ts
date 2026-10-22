// @sharq/locales — settings section strings (SPEC §11 settings rows, Phase 3
// row 12): section title + nav, rates screen, the shared ImpactPreviewDialog
// (FR-SET-02), the §5.8 stale-write banner, the deferred money-input error
// messages (row 6 decision: «Arabic messages for them will live in
// @sharq/locales when the input screens land») and the server's machine
// `details.reason` codes. Screen field labels live in settings-screens.ts.
import type { SettingValues } from "@sharq/schemas";

export const SETTINGS_TITLE = "الإعدادات";

// The seven v1 screens (§11); /settings/calendar + /settings/security are
// v1.1 UI and have no nav entries yet (FR-SET-06).
export const SETTINGS_NAV_RATES = "الأسعار";
export const SETTINGS_NAV_ENTRY = "إعدادات الإدخال";
export const SETTINGS_NAV_REASONS = "أسباب التعديل والخصم";
export const SETTINGS_NAV_STATUSES = "حالات الحضور";
export const SETTINGS_NAV_PERIODS = "بداية الأسبوع والصرف";
export const SETTINGS_NAV_POLICIES = "الصلاحيات والخصومات";
export const SETTINGS_NAV_BRANDING = "الهوية والتصدير";

// §14.2 Arabic day names (السبت..الجمعة), keyed by the §5.2 registry enums.
export const WEEKDAY_LABELS: Record<
  SettingValues["payroll.weekStartDay"],
  string
> = {
  sat: "السبت",
  sun: "الأحد",
  mon: "الاتنين",
  tue: "التلات",
  wed: "الأربع",
  thu: "الخميس",
  fri: "الجمعة",
};

// /settings/rates (FR-SET-03). «مفيش أسعار» is the §11-verbatim empty state.
export const RATES_EMPTY = "مفيش أسعار";
export const RATES_ADD = "ضيف سعر";
export const RATES_SCOPE_LABEL = "النطاق";
export const RATES_SCOPE_COMPANY = "سعر الشركة";
export const RATES_SCOPE_TEAM = "سعر فريق";
export const RATES_SCOPE_EMPLOYEE = "سعر موظف";
export const RATES_TARGET_TEAM = "الفريق";
export const RATES_TARGET_USER = "الموظف";
export const RATES_AMOUNT_LABEL = "السعر اليومي";
export const RATES_VALID_FROM = "يبدأ من";
export const RATES_VALID_TO = "لغاية";
export const RATES_OPEN_ENDED = "لسه شغال";
export const RATES_NOTE_LABEL = "ملاحظة (اختياري)";
export const RATES_CLOSE_ROW = "اقفل الصف";
export const RATES_REOPEN = "أعد فتحه";
export const RATES_REOPEN_MESSAGE =
  "الصف هيرجع شغال — لازم يفضل فيه سعر شركة شغال بعده (EC-56).";
export const RATES_CLOSE_TITLE = "قفل صف سعر";
export const RATES_CLOSE_ACTION = "اقفل الصف";
export const RATES_CLOSE_MESSAGE =
  "بعد التاريخ ده السعر ده مبقاش ساري — الحسابات الجاية تاخد السعر اللي بعده.";
export const RATES_IMPACT_NOTE =
  "السجلات القديمة محفوظة بسعرها وقتها — التغيير بيأثر على الحسابات الجاية بس.";
export const RATES_UNTITLED_SCOPE = "نطاق محذوف";
export const RATES_TARGET_MISSING = "اختار الفريق أو الموظف الأول.";

// ImpactPreviewDialog (FR-SET-02 / §5.5.6): every settings save flows here.
export const IMPACT_TITLE = "معاينة التأثير";
export const IMPACT_EMPLOYEES_LINE = (n: number, date: string): string =>
  `هيأثر على ${n} موظف من ${date}.`;
export const IMPACT_PERIODS_LINE =
  "هيأثر على الأسبوعات الجديدة من التاريخ ده — الأسبوعات القديمة زي ما هي.";
export const IMPACT_NONE_LINE = "مفيش تأثير على البيانات الحالية.";
export const IMPACT_VIOLATING_LINE = (n: number): string =>
  `و${n} سجل جاي هيبقى خارج الحدود الجديدة.`;
export const IMPACT_PAST_SAFE_LINE = "السجلات القديمة مش هتتغير.";

// §5.8 stale-write protocol (EC-48) — the banner sentence is the §2-table
// verbatim «Settings changed (server)», the same string
// API_ERROR_MESSAGES.SETTINGS_CHANGED carries for the envelope (one
// wording, two homes per locale convention — errors.test.ts pins it there).
export const SETTINGS_STALE_BANNER = "الإعدادات اتحدثت من مدير النظام";

// Money-input failure messages (EC-31..34) — the @sharq/schemas normalizer's
// machine codes, phrased for the input boundary. TOO_MANY_DECIMALS needs the
// key's scale to make sense, so it is a function.
export const MONEY_ERROR_MESSAGES = {
  EMPTY: "اكتب المبلغ",
  INVALID_CHARS: "اكتب المبلغ بالأرقام",
  NEGATIVE: "المبلغ مينفعش يكون سالب",
  MULTIPLE_DECIMAL_SEPARATORS: "فيه أكتر من علامة عشرية",
  OVERFLOW: "الرقم كبير أوي",
} as const;
export const MONEY_TOO_MANY_DECIMALS = (scale: number): string =>
  `مينفعش أكتر من ${scale} خانات عشرية`;

// The server's machine `details.reason` codes → Arabic (§10.4 VALIDATION_
// FAILED details; EC-52/56 and the catalog/rate guards).
export const SETTINGS_REASON_MESSAGES: Record<string, string> = {
  IMMUTABLE_ONCE_ATTENDANCE_EXISTS:
    "خانات الوحدة بتتقفل أول ما يتنظم حضور — مش ممكن تتغير (EC-52).",
  SYSTEM_PROTECTED: "الحالة دي أساسية في المنظومة ومش بتتعدل.",
  FUTURE_ROWS_ONLY:
    "الصف ده بدأ خلاص — معدّلوش؛ اقفله وافتح صف جديد من تاريخ جديد.",
  BEFORE_VALID_FROM: "التاريخ ده قبل بداية الصف نفسه.",
  COMPANY_RATE_NEEDS_SUCCESSOR:
    "لازم يكون فيه سعر شركة شغال بعد الصف ده قبل ما تقفله (EC-56).",
  DEFAULT_EXCEEDS_DEDUCTION_MAX:
    "المبلغ الافتراضي أكبر من أقصى خصم مسموح به في الإعدادات.",
};

// FR-SET-08 cross-field issue codes → Arabic (the same codes the server
// returns inside `details.issues[]`; client pre-checks with the shared
// @sharq/schemas validator before any round trip).
export const CROSS_FIELD_MESSAGES: Record<string, string> = {
  MIN_EXCEEDS_MAX: "أقل مبلغ في اليوم أكبر من أكبر مبلغ — عدّل الحدود.",
  QUICK_PICK_OUT_OF_BOUNDS:
    "فيه زرار سريع خارج حدود المبلغ — الأزرار لازم تقع بين الحدين.",
  TOO_MANY_QUICK_PICKS: "أقصى عدد أزرار سريعة هو ٨.",
};

// Generic §5.2 registry-schema failure (a constrained select or a bad
// pattern) — precise messages live at the specific fields.
export const SETTINGS_INVALID_VALUE = "القيمة دي مش صح حسب قواعد النظام.";
