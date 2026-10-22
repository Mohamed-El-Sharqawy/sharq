// @sharq/payroll/periods — period generation (SPEC §6.1): pure date math,
// no I/O, no clock reads; the api service owns persistence and lifecycle.
export * from "./types";
export * from "./calendar";
export * from "./payday";
export * from "./generate";
