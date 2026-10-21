// @sharq/ui — the app's one Modal (SPEC §9.7: no HOCs — a plain
// component over the native <dialog> element). showModal() gives the
// a11y contract for free: focus trap, Esc → cancel, top layer, backdrop.
// Open state stays controlled by the caller (`open` + `onClose`); RTL is
// inherited from the document (§14.1 — no physical directions here).
import { DIALOG_CLOSE } from "@sharq/locales";
import { cn } from "cn";
import { useEffect, useRef, type ReactNode } from "react";

export type ModalProps = {
  open: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
  className?: string;
};

export function Modal({
  open,
  title,
  onClose,
  children,
  footer,
  className,
}: ModalProps) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    if (open && !element.open) element.showModal();
    else if (!open && element.open) element.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      data-slot="modal"
      aria-label={title}
      onClose={onClose}
      onCancel={onClose}
      // Backdrop click closes: the click target is the dialog itself only
      // when the backdrop (not the content box) was hit.
      onClick={(event) => {
        if (event.target === ref.current) onClose();
      }}
      className={cn(
        "m-auto w-[min(28rem,calc(100dvw-2rem))] rounded-lg border border-border bg-card p-4 text-card-foreground shadow-lg backdrop:bg-black/50",
        className,
      )}
    >
      <h2 className="mb-3 text-base font-semibold">{title}</h2>
      {children}
      {footer ? (
        <div className="mt-4 flex justify-end gap-2">{footer}</div>
      ) : null}
      {/* A visible affordance for pointer + keyboard users who expect a
       * close action besides Esc (native dialogs cancel on Esc). */}
      <button
        type="button"
        onClick={onClose}
        className="absolute end-3 top-3 rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
      >
        <span aria-hidden>✕</span>
        <span className="sr-only">{DIALOG_CLOSE}</span>
      </button>
    </dialog>
  );
}
