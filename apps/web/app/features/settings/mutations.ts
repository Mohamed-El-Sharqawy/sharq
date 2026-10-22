// apps/web — settings feature mutations (SPEC §9.6 invalidation map +
// §5.8: any settings mutation invalidates the ['settings'] root so every
// screen re-resolves). Catalog mutations invalidate only their own root —
// settings values are untouched by them.
import { useMutation, useQueryClient } from "@tanstack/react-query";
import type {
  CreateRateBody,
  CreateReasonBody,
  CreateStatusBody,
  UpdateRateBody,
  UpdateReasonBody,
  UpdateStatusBody,
} from "@sharq/schemas";
import {
  createRate,
  createReason,
  createStatus,
  patchSetting,
  updateRate,
  updateReason,
  updateStatus,
} from "./api";
import { ratesKeys, reasonsKeys, settingsKeys, statusesKeys } from "./queries";

function useInvalidate(...roots: readonly (readonly string[])[]) {
  const queryClient = useQueryClient();
  return () => {
    for (const root of roots) {
      void queryClient.invalidateQueries({ queryKey: root });
    }
  };
}

export function usePatchSetting() {
  const invalidate = useInvalidate(settingsKeys.all);
  return useMutation({
    mutationFn: (input: {
      key: string;
      value: unknown;
      note?: string;
      version: number;
    }) => patchSetting(input.key, input),
    onSettled: invalidate,
  });
}

export function useCreateRate() {
  const invalidate = useInvalidate(ratesKeys.all);
  return useMutation({
    mutationFn: (body: CreateRateBody) => createRate(body),
    onSettled: invalidate,
  });
}

export function useUpdateRate() {
  const invalidate = useInvalidate(ratesKeys.all);
  return useMutation({
    mutationFn: (input: { id: string; body: UpdateRateBody }) =>
      updateRate(input.id, input.body),
    onSettled: invalidate,
  });
}

export function useCreateReason() {
  const invalidate = useInvalidate(reasonsKeys.all);
  return useMutation({
    mutationFn: (body: CreateReasonBody) => createReason(body),
    onSettled: invalidate,
  });
}

export function useUpdateReason() {
  const invalidate = useInvalidate(reasonsKeys.all);
  return useMutation({
    mutationFn: (input: { id: string; body: UpdateReasonBody }) =>
      updateReason(input.id, input.body),
    onSettled: invalidate,
  });
}

export function useCreateStatus() {
  const invalidate = useInvalidate(statusesKeys.all);
  return useMutation({
    mutationFn: (body: CreateStatusBody) => createStatus(body),
    onSettled: invalidate,
  });
}

export function useUpdateStatus() {
  const invalidate = useInvalidate(statusesKeys.all);
  return useMutation({
    mutationFn: (input: { id: string; body: UpdateStatusBody }) =>
      updateStatus(input.id, input.body),
    onSettled: invalidate,
  });
}
