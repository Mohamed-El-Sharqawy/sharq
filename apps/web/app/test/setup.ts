import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach } from "vitest";

// Vitest globals are off, so Testing Library cannot self-register cleanup —
// wire it explicitly (TESTING §2.1).
afterEach(cleanup);
