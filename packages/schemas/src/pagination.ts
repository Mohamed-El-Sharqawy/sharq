// SPEC §10.4 — the one pagination shape: { items, page, pageSize, total,
// hasNext }. The wire caps pageSize at 100 (verbatim); the default page size
// is fixed in code with this citation — §10.4 defines no default and the
// list screens need one.
import { type Static, type TSchema, Type } from "@sinclair/typebox";

export const PAGE_SIZE_MAX = 100;
export const PAGE_SIZE_DEFAULT = 20;
export const PAGE_DEFAULT = 1;

export const ListQuery = Type.Object({
  page: Type.Optional(Type.Integer({ minimum: 1 })),
  pageSize: Type.Optional(Type.Integer({ minimum: 1, maximum: PAGE_SIZE_MAX })),
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
