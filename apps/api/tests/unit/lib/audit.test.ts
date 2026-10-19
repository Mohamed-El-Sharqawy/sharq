// Row 12 — §15 audit standards on the shared writer: every entry carries
// actor/entity/old/new/note/ip, optionals collapse to NULL columns (never
// undefined), and JSON values pass through as jsonb-ready objects. The
// DB-level behavior (append-only grants, real inserts) is already pinned
// by migration + contract suites; this unit pins the mapping contract.
import { describe, expect, it } from "bun:test";
import { createDrizzleAudit } from "../../../src/lib/audit";

type Captured = Record<string, unknown> | undefined;

/** Minimal drizzle-insert double: captures the single values() payload. */
const makeDb = () => {
  let captured: Captured;
  const db = {
    insert: () => ({
      values: async (v: Record<string, unknown>) => {
        captured = v;
      },
    }),
  };
  return { db, captured: () => captured };
};

describe("createDrizzleAudit · §15 field plumbing", () => {
  it("writes every present field verbatim (actor, old/new jsonb, note, ip)", async () => {
    const h = makeDb();
    await createDrizzleAudit(h.db as never).record({
      action: "users.update",
      entityType: "user",
      entityId: "u-1",
      actorId: "u-admin",
      oldValue: { role: "employee" },
      newValue: { role: "supervisor" },
      note: "ترقية لمشرف",
      ip: "10.0.0.9",
    });
    expect(h.captured()).toEqual({
      action: "users.update",
      entityType: "user",
      entityId: "u-1",
      actorId: "u-admin",
      oldValue: { role: "employee" },
      newValue: { role: "supervisor" },
      note: "ترقية لمشرف",
      ip: "10.0.0.9",
    });
  });

  it("collapses every absent optional to NULL (never undefined)", async () => {
    const h = makeDb();
    await createDrizzleAudit(h.db as never).record({
      action: "auth.lockout",
      entityType: "user",
      entityId: "u-2",
    });
    const captured = h.captured()!;
    expect(captured.actorId).toBeNull();
    expect(captured.oldValue).toBeNull();
    expect(captured.newValue).toBeNull();
    expect(captured.note).toBeNull();
    expect(captured.ip).toBeNull();
    expect(Object.values(captured).every((v) => v !== undefined)).toBeTrue();
  });

  it("keeps explicit nulls null (anonymous actor is representable)", async () => {
    const h = makeDb();
    await createDrizzleAudit(h.db as never).record({
      action: "auth.login_denied",
      entityType: "user",
      entityId: "u-3",
      actorId: null,
      note: null,
      ip: "185.1.2.3",
    });
    expect(h.captured()!.actorId).toBeNull();
    expect(h.captured()!.note).toBeNull();
    expect(h.captured()!.ip).toBe("185.1.2.3");
  });
});
