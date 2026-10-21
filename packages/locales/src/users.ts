// @sharq/locales — /users + /users/:id screen strings (SPEC §11 users
// row: list/search; create/reset/deactivate; profile). SPEC pins no
// users-screen wording (§2 table covers role nouns only, reused verbatim
// below); this file is the canonical choice — change with the render
// specs together (Testing phase), never halfway.
import type { AuthUserResponse } from "@sharq/schemas";

export const USERS_TITLE = "المستخدمين";
export const USERS_ADD = "ضيف مستخدم";
export const USERS_EMPTY = "مفيش مستخدمين";
export const USERS_SEARCH_LABEL = "البحث";
export const USERS_SEARCH_PLACEHOLDER = "دوّر بالاسم أو الموبايل";
export const USERS_SEARCH_SUBMIT = "دوّر";

// §2 UI string table verbatim: المشرف / مدير النظام / الموظف.
export const ROLE_LABELS: Record<AuthUserResponse["role"], string> = {
  employee: "موظف",
  supervisor: "مشرف",
  admin: "مدير النظام",
};

export const USERS_ACTIVE = "شغّال";
export const USERS_INACTIVE = "موقوف";
export const USERS_MUST_CHANGE_PASSWORD = "لازم يغيّر كلمة السر";

// Create dialog (FR-AUTH-04).
export const USER_CREATE_TITLE = "ضيف مستخدم";
export const USER_CREATE_USERNAME = "اسم المستخدم";
export const USER_CREATE_PHONE = "الموبايل";
export const USER_CREATE_DISPLAY_NAME = "الاسم";
export const USER_CREATE_ROLE = "الدور";
export const USER_CREATE_SUBMIT = "ضيف";

// Lifecycle actions + confirm copy (FR-AUTH-05/06).
export const USER_RESET_PASSWORD = "كلمة سر جديدة";
export const USER_RESET_CONFIRM = "هتتولد كلمة سر جديدة وكل جلساته هتقفل.";
export const USER_DEACTIVATE = "وقّف الحساب";
export const USER_DEACTIVATE_CONFIRM =
  "هيخرج من كل الأجهزة ومش هيقدر يدخل لحد ما ترجّعه.";
export const USER_REACTIVATE = "رجّع الحساب";
export const USER_REACTIVATE_CONFIRM = "يرجع يدخل تاني بنفس بياناته.";

// Temp-password reveal (FR-AUTH-04: shared out-of-band, shown once).
export const TEMP_PASSWORD_TITLE = "كلمة السر المؤقتة";
export const TEMP_PASSWORD_HINT =
  "انسخها وابعتها للموظف برّه النظام — هتظهر هنا مرة واحدة بس.";

// Profile rows (/users/:id — history lands with the audit screen, Phase 8).
export const USER_PROFILE_TITLE = "الملف";
export const USERS_BACK_TO_LIST = "رجوع للمستخدمين";
