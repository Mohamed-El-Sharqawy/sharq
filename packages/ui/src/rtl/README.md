# RTL patches (@sharq/ui)

SPEC §14.1: the app is `<html lang="ar-EG" dir="rtl">` and feature code uses
**logical Tailwind utilities only** (`ms-/me-/ps-/pe-`, `text-start/end`,
`start-/end-`). Physical `left/right` utilities are banned by lint
(`sharq/no-physical-utilities` in `@sharq/eslint-config`) **everywhere except
this directory** — it is the single sanctioned escape hatch.

## Protocol

1. Radix/Base UI primitives compute positions from `dir`, but generated code
   can still hard-code physical sides. Two patch levels, both inside this
   package:
   - **Token-level fixes** (e.g. `pl-/pr-` → logical `ps-/pe-`): applied in
     place in `../components/<name>.tsx` — vendored source is ours to own,
     and logical utilities are correct in LTR too. Noted with a
     `SPEC §14.1 RTL patch` comment.
   - **Behavioral flips** (chevron direction, side mapping, week order): a
     wrapper in this directory (`select-rtl.tsx`, …); screens import the
     patched variant from here.
2. Physical utilities may appear **only** inside this directory (the lint
   exemption); every patch states which §14.1 row it fulfills.
3. When regenerating a component via the shadcn CLI, re-apply its patch
   (grep the file for `pl-|pr-|left-|right-` after re-adding).

## Patch checklist (SPEC §14.1, patch lands with the component)

- [ ] `Select` — chevron direction
- [ ] `Pagination` — chevron direction
- [ ] `Breadcrumb` — chevron direction
- [ ] `Popover` — alignment
- [ ] `Sheet` / `Drawer` — side mapping (start/end)
- [ ] `DropdownMenu` — alignment
- [ ] `Tooltip` — alignment
- [ ] `Table` — alignment
- [ ] `Toast` — position (top-start)
- [ ] `Tabs` — indicator direction
- [ ] `Calendar` — week order + chevrons
- [ ] `Carousel` — direction
- [ ] `Dialog` / `AlertDialog` — focus traversal
- [ ] `Input` — adornments (`ps-`)
