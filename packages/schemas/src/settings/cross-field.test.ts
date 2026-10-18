import { describe, expect, test } from "bun:test";
import { SETTINGS_REGISTRY, validateSettingsCrossField } from "../index";

// Full default map assembled from the registry — the validator must accept it.
function defaultValues(): Record<string, unknown> {
  return Object.fromEntries(
    Object.values(SETTINGS_REGISTRY).map((e) => [e.key, e.seededDefault]),
  );
}

describe("FR-SET-08 cross-field validation — bounds rules (TESTING §6.2)", () => {
  test("empty update and full defaults produce no issues", () => {
    expect(validateSettingsCrossField({})).toEqual([]);
    expect(validateSettingsCrossField(defaultValues())).toEqual([]);
  });

  test("min > max is rejected (against provided max)", () => {
    const issues = validateSettingsCrossField({
      "attendance.amount.minMinor": 600000,
    });
    expect(issues).toEqual([
      {
        key: "attendance.amount.minMinor",
        code: "MIN_EXCEEDS_MAX",
      },
    ]);
  });

  test("lowering max below the seeded picks is rejected", () => {
    // max 10000 > min 0 passes the min/max rule, but the seeded picks
    // (40000/60000/80000 merged from defaults) fall outside the new bounds.
    const issues = validateSettingsCrossField({
      "attendance.amount.maxMinor": 10000,
    });
    expect(issues).toEqual([
      {
        key: "attendance.quickPicks",
        code: "QUICK_PICK_OUT_OF_BOUNDS",
      },
    ]);
  });

  test("min == max boundary is accepted when picks equal the bound", () => {
    expect(
      validateSettingsCrossField({
        "attendance.amount.minMinor": 50000,
        "attendance.amount.maxMinor": 50000,
        "attendance.quickPicks": [50000, 50000],
      }),
    ).toEqual([]);
  });

  test("partial updates merge over seeded defaults before cross-checking", () => {
    // Only min provided: compared against the DEFAULT max (500000), passes —
    // and equal to the smallest seeded pick, so bounds still hold.
    expect(
      validateSettingsCrossField({ "attendance.amount.minMinor": 40000 }),
    ).toEqual([]);
  });
});

describe("FR-SET-08 cross-field validation — quick-picks rules (TESTING §6.2)", () => {
  test("quick-pick outside bounds is rejected (raised min)", () => {
    const issues = validateSettingsCrossField({
      "attendance.amount.minMinor": 50000,
    });
    expect(issues).toContainEqual({
      key: "attendance.quickPicks",
      code: "QUICK_PICK_OUT_OF_BOUNDS",
    });
  });

  test("quick-pick above max is rejected", () => {
    const issues = validateSettingsCrossField({
      "attendance.amount.maxMinor": 70000,
    });
    expect(issues).toEqual([
      { key: "attendance.quickPicks", code: "QUICK_PICK_OUT_OF_BOUNDS" },
    ]);
  });

  test("more than 8 quick-picks is rejected", () => {
    const issues = validateSettingsCrossField({
      "attendance.quickPicks": [1, 2, 3, 4, 5, 6, 7, 8, 9],
    });
    expect(issues).toEqual([
      { key: "attendance.quickPicks", code: "TOO_MANY_QUICK_PICKS" },
    ]);
  });

  test("exactly 8 in-bounds quick-picks is accepted", () => {
    expect(
      validateSettingsCrossField({
        "attendance.quickPicks": [1, 2, 3, 4, 5, 6, 7, 8],
      }),
    ).toEqual([]);
  });
});
