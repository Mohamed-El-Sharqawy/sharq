// @sharq/locales — the §10.4 Arabic error map (row 12): every stable API
// error code carries its fixed Egyptian-Arabic message here, and the api
// reads it at envelope construction (lib/errors.ts). SPEC-grounded strings
// are exact quotes (FR-AUTH-01 §4.1; the §2 UI string table); the rest are
// the app's canonical wording, pinned verbatim by errors.test.ts — change
// a message there and in the test together, never halfway.
import type { ApiErrorCode } from "@sharq/schemas";

export const API_ERROR_MESSAGES = {
  // FR-AUTH-01 §4.1 (wrong credentials). Doubles as the generic 401
  // message: an anonymous/expired session gets the same sentence — no
  // user enumeration, one message per code (§10.4).
  AUTH_REQUIRED: "البيانات مش صح",
  AUTH_FORBIDDEN: "مش مسموح لك تدخل هنا",
  VALIDATION_FAILED: "راجع البيانات وجرّب تاني",
  NOT_FOUND: "اللي بتدور عليه مش موجود",
  CONFLICT_VERSION: "البيانات اتغيّرت من حد تاني، حدّث الصفحة وحاول تاني",
  // §2 UI string table verbatim («Settings changed (server)»).
  SETTINGS_CHANGED: "الإعدادات اتحدثت من مدير النظام",
  EDIT_WINDOW_CLOSED: "وقت التعديل للاسبوع ده قفل",
  // «مقفول» / «متصرف» per the §2 UI string table.
  PERIOD_LOCKED: "الأسبوع ده مقفول",
  PERIOD_PAID: "الأسبوع ده متصرف",
  AMOUNT_OUT_OF_BOUNDS: "المبلغ مش في الحدود المسموحة",
  // §2 UI string table verbatim («Reason required»).
  REASON_REQUIRED: "لازم تكتب السبب",
  RATE_LIMITED: "محاولات كتير، استنى شويّة وحاول تاني",
  DUPLICATE: "القيمة دي مستخدمة قبل كده",
  INTERNAL: "حصلت مشكلة عندنا، حاول تاني",
} as const satisfies Record<ApiErrorCode, string>;
