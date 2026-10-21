// apps/web — the one QueryClient + provider (SPEC §9.6 defaults). SSR is
// on (RR7 framework mode) but no loader prefetches queries: on the server
// useQuery renders its pending state (screens show skeletons), and the
// browser client is a singleton so cache survives layout remounts.
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState, type ReactNode } from "react";
import { isSharqError } from "./sharq-error";

function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        // §9.6 defaults, fixed in code with this citation (§5.2 defines
        // no data-layer settings; the settings-query override lands with
        // the Phase 3 settings screens).
        staleTime: 30_000,
        refetchOnWindowFocus: true,
        retry: (failureCount, error) => {
          const isClientError =
            isSharqError(error) && error.status >= 400 && error.status < 500;
          return !isClientError && failureCount < 2;
        },
      },
    },
  });
}

let browserClient: QueryClient | undefined;

function getQueryClient() {
  if (typeof window === "undefined") return makeQueryClient();
  browserClient ??= makeQueryClient();
  return browserClient;
}

export function QueryProvider({ children }: { children: ReactNode }) {
  const [client] = useState(getQueryClient);
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}
