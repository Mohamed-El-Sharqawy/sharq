// App document shell (SPEC §8.1/§11/§14): every route renders inside it.
// lang="ar-EG" + dir="rtl" are global (SPEC §14.1); Arabic strings come from
// @sharq/locales only (SPEC §9); tokens + fonts from @sharq/ui (SPEC §14.4).
import "./styles/app.css";
import {
  APP_NAME,
  ERROR_MESSAGE,
  ERROR_TITLE,
  HOME_LINK,
  NOT_FOUND_MESSAGE,
  NOT_FOUND_TITLE,
} from "@sharq/locales";
import type { ReactNode } from "react";
import {
  isRouteErrorResponse,
  Link,
  Links,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
  useRouteError,
} from "react-router";

export function Layout({ children }: { children: ReactNode }) {
  return (
    <html lang="ar-EG" dir="rtl">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>{APP_NAME}</title>
        <Meta />
        <Links />
      </head>
      <body>
        {children}
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
}

export default function App() {
  return <Outlet />;
}

// SPEC §11: one boundary at the root until screens grow their own.
export function ErrorBoundary() {
  const notFound = isRouteErrorResponse(useRouteError());
  return (
    <main>
      <h1>{notFound ? NOT_FOUND_TITLE : ERROR_TITLE}</h1>
      <p>{notFound ? NOT_FOUND_MESSAGE : ERROR_MESSAGE}</p>
      <Link to="/">{HOME_LINK}</Link>
    </main>
  );
}
