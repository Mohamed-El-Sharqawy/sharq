// SPEC §10.4 — the one pagination shape: { items, page, pageSize, total,
// hasNext }. The wire caps pageSize at 100 (verbatim); the default page size
// is fixed in code with this citation — §10.4 defines no default and the
// list screens need one.
//
// Query params travel as digit strings (an HTTP query string IS a string;
// Elysia 1.4 validates the raw query without numeric coercion, so an
// Integer schema 422s every real request). The pattern keeps the numeric
// semantics at the edge — positive integers only — and the handlers convert
// to numbers for the services, which clamp pageSize ≤ 100 (§10.4's
// re-validation layer).
import { type Static, type TSchema, Type } from "@sinclair/typebox";

/** A positive integer as a query-string digit run: no zero, no sign, no
 * leading zeros. `page ≥ 1` and `pageSize ≥ 1` ride this pattern. */
export const PAGE_QUERY_PATTERN = "^[1-9][0-9]*$";

export const PAGE_SIZE_MAX = 100;
export const PAGE_SIZE_DEFAULT = 20;
export const PAGE_DEFAULT = 1;

export const ListQuery = Type.Object({
  page: Type.Optional(Type.String({ pattern: PAGE_QUERY_PATTERN })),
  pageSize: Type.Optional(Type.String({ pattern: PAGE_QUERY_PATTERN })),
});
export type ListQuery = Static<typeof ListQuery>;

/** §10.4 envelope for a page of `item` — closed, reused by every list. */
export function paginated<T extends TSchema>(item: T) {
  return Type.Object(
    {
      items: Type.Array(item),
      page: Type.Integer({ minimum: 1 }),
      pageSize: Type.Integer({ minimum: 1, maximum: PAGE_SIZE_MAX }),
      total: Type.Integer({ minimum: 0 }),
      hasNext: Type.Boolean(),
    },
    { additionalProperties: false },
  );
}
