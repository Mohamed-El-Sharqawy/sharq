// @sharq/locales — settings screens' field labels + copy (SPEC §11 rows
// /settings/entry|reasons|statuses|periods|policies|branding). Split from
// settings.ts for the §9.2 line gate — same review rules: change a string
// here and its consumer together, never halfway.
import type { SettingValues } from "@sharq/schemas";

// /settings/entry (FR-SET-11): bounds, quick-picks, entry mode.
export const ENTRY_MIN_LABEL = "أقل مبلغ في اليوم";
export const ENTRY_MAX_LABEL = "أكبر مبلغ في اليوم";
export const ENTRY_QUICK_PICKS_LABEL = "الأزرار السريعة";
export const ENTRY_QUICK_PICK_INPUT = "قيمة زرار جديد";
export const ENTRY_QUICK_PICK_ADD = "ضيف زرار";
export const ENTRY_QUICK_PICK_REMOVE = "امسح";
export const ENTRY_MODE_LABEL = "طريقة الإدخال";
export const ENTRY_MODE_FREE = "حرة";
export const ENTRY_MODE_PICKS_ONLY = "الأزرار السريعة بس";
export const ENTRY_PREVIEW_TITLE = "شكل الأزرار في الإدخال";
export const QUICK_PICKS_UNIQUE = "مفيش زرار سريع يتكرر.";

// /settings/reasons (FR-SET-04): «مفيش أسباب» is §11-verbatim.
export const REASONS_EMPTY = "مفيش أسباب";
export const REASONS_ADD = "ضيف سبب";
export const REASONS_TAB_OVERRIDE = "أسباب التعديل";
export const REASONS_TAB_DEDUCTION = "أسباب الخصم";
export const REASONS_NAME_LABEL = "الاسم بالعربي";
export const REASONS_DEFAULT_AMOUNT = "المبلغ الافتراضي (اختياري)";
export const REASONS_DEACTIVATE = "إيقاف";
export const REASONS_REACTIVATE = "تشغيل تاني";
export const REASONS_INACTIVE_BADGE = "موقوف";
export const REASONS_DEACTIVATE_CONFIRM =
  "هيختفي من قايمة الأسباب في الإدخال — السجلات القديمة هتفضل بتقرأ باسمه (EC-46).";
export const REASONS_NAME_REQUIRED = "اكتب اسم السبب.";

// Generic row action label (reasons/statuses rows).
export const EDIT_ACTION = "عدّل";

// /settings/statuses (FR-SET-05): custom statuses; system rows locked.
export const STATUSES_ADD = "ضيف حالة";
export const STATUSES_CODE_LABEL = "الكود";
export const STATUSES_NAME_LABEL = "الاسم بالعربي";
export const STATUSES_CARRIES_PAY = "بتتحسب بفلوس";
export const STATUSES_SYSTEM_BADGE = "أساسية";
export const STATUSES_DEACTIVATE_CONFIRM =
  "هتختفي من اختيارات الحالة في الجريد — سجلاتها القديمة زي ما هي.";
export const STATUSES_DEACTIVATE_TITLE = "إيقاف حالة";
export const STATUSES_CODE_REQUIRED = "اكتب كود الحالة واسمها.";

// /settings/periods (FR-SET-07): week start + payday + boundary preview.
export const PERIODS_WEEK_START_LABEL = "أول يوم في الأسبوع";
export const PERIODS_PAYDAY_LABEL = "يوم الصرف";
export const PERIODS_PREVIEW_TITLE = "شكل أول أسبوعين جايين بالإعدادات الجديدة";
export const PERIODS_PREVIEW_PERIOD = "الأسبوع";
export const PERIODS_PREVIEW_PAYDAY = "يوم الصرف";

// /settings/policies: edit window, lock/pay flags, deduction rules.
export const POLICIES_WINDOW_TITLE = "نافذة التعديل";
export const POLICIES_DAYS_BACK = "عدد الأيام الراجعة اللي تنفع يتعدلها";
export const POLICIES_BLOCK_FUTURE = "منع إدخال أيام المستقبل";
export const POLICIES_AUTO_LOCK = "قفل تلقائي بعد أيام من نهاية الأسبوع";
export const POLICIES_AUTO_LOCK_OFF = "بدون قفل تلقائي";
export const POLICIES_FLAGS_TITLE = "الأقفال والصلاحيات";
export const POLICIES_SUPERVISOR_LOCK = "المشرف يقدر يقفل الأسبوع";
export const POLICIES_SUPERVISOR_PAID = "المشرف يقدر يعلّم الأسبوع مدفوع";
export const POLICIES_ADMIN_UNLOCK = "مدير النظام يقدر يفتح أسبوع مدفوع";
export const POLICIES_DEDUCTION_TITLE = "حدود الخصومات";
export const POLICIES_EXCEED_DAY = "الخصم ينفع يعدي أجر اليوم";
export const POLICIES_EXCEED_WEEK = "الخصم ينفع يعدي إجمالي الأسبوع";
export const POLICIES_FLOOR_ZERO = "إجمالي الأسبوع ميرجعش تحت الصفر";
export const POLICIES_MAX_PER_ENTRY = "أقصى خصم في السجل الواحد";
export const POLICIES_MAX_PER_ENTRY_HINT = "سيبها فاضية لو مفيش حد أقصى";

// /settings/branding (FR-SET-12) with live header/filename previews.
export const BRANDING_COMPANY_NAME = "اسم الشركة";
export const BRANDING_LOGO_URL = "رابط الشعار";
export const BRANDING_LOGO_HINT = "رابط http/https — سيبه فاضي لو مفيش شعار";
export const BRANDING_CURRENCY_CODE = "كود العملة";
export const BRANDING_SCALE_LABEL = "خانات الوحدة الصغيرة";
export const BRANDING_SCALE_HINT = "بتتقفل أول ما يتنظم حضور (EC-52)";
export const BRANDING_DIGIT_STYLE = "شكل الأرقام";
export const DIGIT_STYLE_WESTERN = "إنجليزي (1234)";
export const DIGIT_STYLE_ARABIC = "عربي (١٢٣٤)";
export const BRANDING_HEADER_TEXT = "ترويسة كشف المرتبات";
export const BRANDING_COLUMNS_LABEL = "أعمدة الكشف وترتيبها";
export const BRANDING_FILENAME_PATTERN = "شكل اسم ملف الإكسل";
export const BRANDING_PREVIEW_TITLE = "معاينة";
export const BRANDING_PREVIEW_HEADER = "الترويسة";
export const BRANDING_PREVIEW_FILENAME = "اسم الملف";
export const BRANDING_TOKENS_HINT =
  "التوكِنات المتاحة: {team} الفريق، {from} من تاريخ، {to} لحد تاريخ، {period} الأسبوع";

// §5.2 export.columns allowed set → Arabic labels (the seed order is the
// canonical display order; the editor preserves it). Keyed by the registry's
// own column union — a §5.2 column change fails typecheck here on purpose.
export const EXPORT_COLUMN_LABELS = {
  name: "الاسم",
  sat: "السبت",
  sun: "الأحد",
  mon: "الاتنين",
  tue: "التلات",
  wed: "الأربع",
  thu: "الخميس",
  fri: "الجمعة",
  deductions: "الخصومات",
  adjustments: "التعديلات",
  total: "الإجمالي",
} as const satisfies Record<SettingValues["export.columns"][number], string>;
