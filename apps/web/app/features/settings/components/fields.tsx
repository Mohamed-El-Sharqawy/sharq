// apps/web — settings input primitives (SPEC §9.9 reuse rule: one styling,
// feature-local until a second feature needs them). MoneyField wraps the
// shared TextField: the value stays a raw string (the §6.2 input boundary —
// Arabic digits and ٫ welcome) and parsing happens at submit via
// parseMoneyInput, never per keystroke. CheckField is the boolean row the
// policies/statuses screens share.
import { TextField } from "@sharq/ui";
import type { ReactNode } from "react";

export type MoneyFieldProps = {
  label: string;
  value: string;
  onChange: (value: string) => void;
  hint?: string;
  error?: string;
};

export function MoneyField({
  label,
  value,
  onChange,
  hint,
  error,
}: MoneyFieldProps) {
  return (
    <div className="space-y-1">
      <TextField
        label={label}
        value={value}
        onChange={onChange}
        inputMode="numeric"
      />
      {hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
      {error ? (
        <p role="alert" className="text-xs text-destructive">
          {error}
        </p>
      ) : null}
    </div>
  );
}

export function CheckField({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label className="flex items-center gap-2 text-sm">
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        className="size-4"
      />
      <span>{label}</span>
    </label>
  );
}

export function FieldGroup({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="space-y-3 rounded-md border border-border p-3">
      <h2 className="text-sm font-semibold">{title}</h2>
      {children}
    </section>
  );
}
