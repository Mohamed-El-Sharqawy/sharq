// Row 12 — TESTING §8.3 inventory parity: the /openapi.json route list is
// diffed against §10.6 (via the role-matrix data — the same single source
// the §3 harness consumes). A live matrix row MUST appear in the spec; a
// planned row MUST NOT (landing a route without flipping its row fails
// here, and so does a route nobody put in SPEC). No container: parity is
// a routing contract, not a data one — the ports stay mocked.
import { describe, expect, it } from "bun:test";
import { createApp } from "../../src/app";
import { makeAudit, makeRepo, makeUser } from "../unit/auth/helpers";
import { apiCall } from "./contract.helpers";
import { MATRIX } from "./role-matrix.data";

const app = createApp({
  repo: makeRepo([makeUser()]).repo,
  audit: makeAudit(),
  isTeamSupervisor: async () => false,
  dbCheck: async () => true,
});

// OpenAPI params are {id}; the matrix writes :id.
const openapiPath = (matrixPath: string) =>
  matrixPath.replace(/:(\w+)/g, "{$1}");

type Spec = { paths: Record<string, Record<string, unknown>> };

const loadSpec = async (): Promise<Set<string>> => {
  const res = await apiCall(app, "/openapi.json");
  expect(res.status).toBe(200);
  const spec = (await res.json()) as Spec;
  return new Set(
    Object.entries(spec.paths ?? {}).flatMap(([path, methods]) =>
      Object.keys(methods)
        .map((m) => m.toUpperCase())
        .filter((m) => ["GET", "POST", "PATCH", "DELETE"].includes(m))
        .map((m) => `${m} ${path}`),
    ),
  );
};

describe("OpenAPI inventory parity · §10.6 vs /openapi.json", () => {
  it("every live matrix row is documented", async () => {
    const documented = await loadSpec();
    const missing = MATRIX.filter(
      (row) =>
        row.live && !documented.has(`${row.method} ${openapiPath(row.path)}`),
    ).map((row) => `${row.method} ${row.path}`);
    expect(missing).toEqual([]);
  });

  it("no planned matrix row leaked into the spec early", async () => {
    const documented = await loadSpec();
    const leaked = MATRIX.filter(
      (row) =>
        !row.live && documented.has(`${row.method} ${openapiPath(row.path)}`),
    ).map((row) => `${row.method} ${row.path}`);
    expect(leaked).toEqual([]);
  });

  it("the spec documents nothing outside §10.6 (+ the openapi plugin's own routes)", async () => {
    const documented = await loadSpec();
    const known = new Set([
      ...MATRIX.map((row) => `${row.method} ${openapiPath(row.path)}`),
      "GET /openapi.json",
      "GET /docs",
    ]);
    const extras = [...documented].filter((entry) => !known.has(entry));
    expect(extras).toEqual([]);
  });

  it("/docs serves the Scalar frontend in the dev shape (§10.7)", async () => {
    const res = await apiCall(app, "/docs");
    expect(res.status).toBe(200);
    expect(
      (res.headers.get("content-type") ?? "").startsWith("text/html"),
    ).toBeTrue();
  });
});
