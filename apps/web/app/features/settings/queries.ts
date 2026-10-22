// apps/web — settings feature query keys + hooks (SPEC §9.6/§5.8). The
// `['settings']` key is §5.8-dedicated: staleTime 5 min (the resolved map
// moves rarely) with refetchOnWindowFocus left on (the default), and EVERY
// settings mutation invalidates the whole root (mutations.ts).
import { queryOptions, useQuery } from "@tanstack/react-query";
import {
  getSettings,
  listHolidays,
  listRates,
  listReasons,
  listStatuses,
} from "./api";

export const settingsKeys = {
  all: ["settings"] as const,
};
export const ratesKeys = {
  all: ["rates"] as const,
};
export const reasonsKeys = {
  all: ["reason-catalog"] as const,
};
export const statusesKeys = {
  all: ["attendance-statuses"] as const,
};
export const holidaysKeys = {
  all: ["holidays"] as const,
};

// §5.8 verbatim: staleTime 5 min. RefetchOnWindowFocus stays the provider
// default (true) — a second admin's change shows up on window focus even
// inside the stale window's absence.
export function settingsOptions() {
  return queryOptions({
    queryKey: settingsKeys.all,
    queryFn: getSettings,
    staleTime: 5 * 60 * 1000,
  });
}

export function useSettings() {
  return useQuery(settingsOptions());
}

const listOptions = <T>(
  queryKey: readonly string[],
  queryFn: () => Promise<T>,
) => queryOptions({ queryKey, queryFn });

export function useRates() {
  return useQuery(listOptions(ratesKeys.all, listRates));
}

export function useReasons() {
  return useQuery(listOptions(reasonsKeys.all, listReasons));
}

export function useStatuses() {
  return useQuery(listOptions(statusesKeys.all, listStatuses));
}

export function useHolidays() {
  return useQuery(listOptions(holidaysKeys.all, listHolidays));
}
