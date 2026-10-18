# RTL patches (@sharq/ui)

SPEC §14.1: the app is `<html lang="ar-EG" dir="rtl">` and feature code uses
**logical Tailwind utilities only** (`ms-/me-/ps-/pe-`, `text-start/end`,
`start-/end-`). Physical `left/right` utilities are banned by lint
(`sharq/no-physical-utilities` in `@sharq/eslint-config`) **everywhere except
this directory** — it is the single sanctioned escape hatch.

## Protocol

1. Radix/shadcn primitives compute positions from `dir`, but a few hard-code
   physical sides (chevrons, side offsets, text alignment). Those components
   get a patch file here instead of a fork or inline hacks in feature code.
2. One file per component: `select-rtl.tsx`, `pagination-rtl.tsx`, … each
   exports the fixed variant. The generic component stays in
   `../components/`; screens import the RTL-patched one from here.
3. Physical utilities may appear **only** inside this directory (that is the
   lint exemption); every patch file states which §14.1 row it fulfills.

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
