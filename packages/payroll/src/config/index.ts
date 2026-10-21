// @sharq/payroll/config — the one resolver (SPEC §5.1): pure scope/date
// resolution shared by api and web, so the §5.3 cascade exists exactly once.
export * from "./types";
export * from "./dates";
export * from "./resolve-rate";
export * from "./resolve-setting";
