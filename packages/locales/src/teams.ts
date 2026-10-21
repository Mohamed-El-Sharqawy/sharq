// @sharq/locales — /teams + /teams/:id screen strings (SPEC §11 teams
// row). «اعمل فريق» is §11-verbatim (the empty-CTA string); «المشرف» /
// «الفريق» nouns are the §2 UI string table verbatim. Everything else is
// the app's canonical wording — change with the render specs together
// (Testing phase).
export const TEAMS_TITLE = "الفرق";
export const TEAMS_EMPTY = "مفيش فرق";
// SPEC §11 teams row — the empty-CTA string, verbatim; doubles as the
// create-dialog title/submit so one wording owns "create team" everywhere.
export const TEAMS_CREATE = "اعمل فريق";
export const TEAM_CREATE_NAME = "اسم الفريق";
// §2 UI string table verbatim (Supervisor = المشرف).
export const TEAM_SUPERVISOR_LABEL = "المشرف";
export const TEAM_SUPERVISOR_NONE = "من غير مشرف";

// Team detail.
export const TEAM_MEMBERS_TITLE = "الأعضاء";
export const TEAM_MEMBERS_EMPTY = "مفيش أعضاء في الفريق ده";
export const TEAM_ADD_MEMBER = "ضيف عضو";
export const TEAM_ADD_MEMBER_USER = "الموظف";
export const TEAM_ADD_MEMBER_FROM = "يبدأ من يوم";
// FR-ADM-05 client-side impact note: adding a user who lives in another
// team is the transfer (the service closes his old membership at D−1 and
// opens here at D — no separate transfer call exists).
export const TEAM_ADD_MEMBER_TRANSFER_NOTE =
  "لو الموظف في فريق تاني، هيتم نقله هنا وعضويته القديمة تقفل من يوم دخوله.";
export const TEAM_MEMBER_SINCE = "في الفريق";
export const TEAMS_BACK_TO_LIST = "رجوع للفرق";
