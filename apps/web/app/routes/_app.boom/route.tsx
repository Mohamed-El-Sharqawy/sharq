// TEMP hello-wiring (see PROGRESS): deliberate throw so the e2e suite proves
// the root ErrorBoundary renders instead of a blank page (SPEC §11). Deleted
// when real erroring screens exist. SPA mode: clientLoader, not loader.
export function clientLoader(): never {
  throw new Error("TEMP /boom — boundary wiring proof");
}

export default function Boom() {
  return null;
}
