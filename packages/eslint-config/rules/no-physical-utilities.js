// SPEC §14.1: Tailwind logical utilities only in feature code. Physical
// left/right utilities are banned everywhere except the sanctioned RTL patch
// area (packages/ui/src/rtl/**), where direction flips are patched once.
//
// The rule inspects string literals and template-literal text and flags any
// whitespace-separated token that is a physical Tailwind utility (variant
// prefixes like `sm:` / `rtl:` / `dark:hover:` are stripped first). It does
// not try to parse JSX class attributes — any matching string is flagged.
// Crude by design: the monorepo has no left/right-bearing identifiers today,
// and the escape hatch is the exempt patch area, not per-call tweaks.
const BANNED = [
  /^-?(left|right)-/, // inset: left-0, -left-4, right-1/2, right-[3px]
  /^-?[pm][lr]-/, // padding/margin: pl-, pr-, ml-, mr- (+ negatives)
  /^-?scroll-[pm][lr]-/, // scroll-margin/padding physical sides
  /^text-(left|right)(-\S+)?$/, // text alignment (text-left, text-right-…)
  /^-?(float|clear)-(left|right)$/,
  /^-?(border|rounded)-(left|right)(-\S+)?$/, // border-left, rounded-right-…
  /^-?(border|rounded)-[tb]?[lr](-|$)/, // border-l, rounded-tl-md, border-r-2
];

/** True when the token is a physical utility. */
function isPhysical(token) {
  // Variant prefixes: everything before the last `:` is a variant stack.
  const utility = token.split(":").pop() ?? token;
  return BANNED.some((re) => re.test(utility));
}

const exempt = (filename) =>
  filename.replace(/\\/g, "/").includes("packages/ui/src/rtl/");

export const noPhysicalUtilities = {
  meta: {
    type: "problem",
    docs: {
      description:
        "Ban physical left/right Tailwind utilities outside @sharq/ui RTL patches (SPEC §14.1).",
    },
    schema: [],
    messages: {
      physical:
        "'{{token}}' is a physical utility — use the logical form (ms-/me-/ps-/pe-, text-start/end, start-/end-) per SPEC §14.1, or move the code into packages/ui/src/rtl/.",
    },
  },
  create(context) {
    if (exempt(context.filename)) return {};
    const report = (node, raw) => {
      for (const token of raw.split(/\s+/)) {
        if (token && isPhysical(token)) {
          context.report({
            node,
            messageId: "physical",
            data: { token },
          });
        }
      }
    };
    return {
      Literal(node) {
        if (typeof node.value === "string") report(node, node.value);
      },
      TemplateLiteral(node) {
        for (const quasi of node.quasis) {
          report(quasi, quasi.value.raw);
        }
      },
    };
  },
};
