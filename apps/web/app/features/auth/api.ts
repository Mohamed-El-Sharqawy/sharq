// apps/web — auth feature API calls (SPEC §9.1/§9.6: feature api.ts files
// are the ONE sanctioned fetch context in web; the eslint config whitelists
// exactly this path). Transport swaps to the shared Eden treaty client when
// app/lib/eden.ts lands (Phase 2+, per the row-10 decision) — the envelope
// mapping below is §10.4's { error: { message } } either way.
import { API_ERROR_MESSAGES, LOGIN_UNAVAILABLE } from "@sharq/locales";

export type LoginResult = { ok: true } | { ok: false; message: string };

type ErrorEnvelopeBody = { error?: { message?: string } };

/** POST /api/auth/login — 200 sets the session cookie; any failure returns
 * the envelope's Arabic message (or a transport fallback). */
export async function loginRequest(
  identifier: string,
  password: string,
): Promise<LoginResult> {
  try {
    const response = await fetch("/api/auth/login", {
      method: "POST",
      credentials: "include",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ identifier, password }),
    });
    if (response.ok) return { ok: true };
    const body = (await response
      .json()
      .catch(() => null)) as ErrorEnvelopeBody | null;
    return {
      ok: false,
      message: body?.error?.message ?? API_ERROR_MESSAGES.INTERNAL,
    };
  } catch {
    return { ok: false, message: LOGIN_UNAVAILABLE };
  }
}
