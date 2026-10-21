// @sharq/ui — labeled form primitives for the app's dialogs (SPEC §9.9
// reuse: one input/select styling; RTL-neutral classes only per §14.1).
// Values travel as plain strings; owners validate before submit.
import type { ChangeEvent, ReactNode } from "react";

const FIELD_CLASS =
  "h-10 w-full rounded-md border border-input bg-transparent px-3";

export type TextFieldProps = {
  label: string;
  value: string;
  onChange: (value: string) => void;
  dir?: "ltr" | "rtl" | "auto";
  type?: "text" | "search" | "date" | "tel" | "password";
  inputMode?: "text" | "tel" | "numeric";
  placeholder?: string;
};

export function TextField({
  label,
  value,
  onChange,
  dir,
  type = "text",
  inputMode,
  placeholder,
}: TextFieldProps) {
  return (
    <label className="block space-y-1">
      <span className="text-sm">{label}</span>
      <input
        className={FIELD_CLASS}
        dir={dir}
        type={type}
        inputMode={inputMode}
        placeholder={placeholder}
        value={value}
        onChange={(event: ChangeEvent<HTMLInputElement>) =>
          onChange(event.target.value)
        }
      />
    </label>
  );
}

export type SelectFieldProps = {
  label: string;
  value: string;
  onChange: (value: string) => void;
  /** The leading empty option's label (omitted when undefined). */
  placeholderOption?: string;
  children: ReactNode;
};

export function SelectField({
  label,
  value,
  onChange,
  placeholderOption,
  children,
}: SelectFieldProps) {
  return (
    <label className="block space-y-1">
      <span className="text-sm">{label}</span>
      <select
        className={FIELD_CLASS}
        value={value}
        onChange={(event: ChangeEvent<HTMLSelectElement>) =>
          onChange(event.target.value)
        }
      >
        {placeholderOption !== undefined ? (
          <option value="">{placeholderOption}</option>
        ) : null}
        {children}
      </select>
    </label>
  );
}

/** The shared inline dialog error (§10.4 Arabic message, role=alert). */
export function DialogError({ message }: { message: string | null }) {
  return message ? (
    <p role="alert" className="text-sm text-destructive">
      {message}
    </p>
  ) : null;
}

/** Hidden submit so Enter in any field submits the enclosing form. */
export function HiddenSubmit() {
  return (
    <button type="submit" className="hidden" aria-hidden>
      submit
    </button>
  );
}
