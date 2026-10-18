// SPEC §11 catch-all: unknown URLs render the Arabic 404 page. SPA mode has
// no server loader, so the not-found UI is client-rendered (the rr docs'
// `data(null, 404)` status pattern is SSR-only).
import { Link } from "react-router";
import { HOME_LINK, NOT_FOUND_MESSAGE, NOT_FOUND_TITLE } from "@sharq/locales";

export default function NotFound() {
  return (
    <main>
      <h1>{NOT_FOUND_TITLE}</h1>
      <p>{NOT_FOUND_MESSAGE}</p>
      <Link to="/">{HOME_LINK}</Link>
    </main>
  );
}
