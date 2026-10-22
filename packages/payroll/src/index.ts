// @sharq/payroll — PURE payroll math + scope/date resolvers, no I/O (SPEC §8.1, §6.2).
export * from "./config";
export * from "./periods";

// TEMP hello-wiring export — proven by src/hello.test.ts. The test-deferral
// protocol (2026-10-22) moves the resolver's TEST row to the end-of-project
// Testing effort; deleting this spec before replacement tests exist would
// leave the package with zero test files (bun test exits 1). Discharged in
// the same commit as the resolver tests (tracked in PROGRESS).
export const runnerInfo = "bun";
