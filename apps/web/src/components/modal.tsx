"use client";

import { useEffect, useId, useRef, useState, type ComponentProps, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { Button } from "./button";
import { buttonClass } from "./button-styles";

/**
 * Modal (Carta item 13): 480 wide, radius 24, padding 24, Titolo 3, body, secondary + primary on the
 * right, over the veil. Esc and the veil close it; focus stays inside and goes back where it was.
 * On phones it comes up from the bottom as a sheet (item 14).
 */
export function Modal({ open, onClose, title, children, footer }: { open: boolean; onClose: () => void; title: string; children?: ReactNode; footer: ReactNode }) {
  const panel = useRef<HTMLDivElement>(null);
  const id = useId();

  useEffect(() => {
    if (!open) return;
    const before = document.activeElement as HTMLElement | null;
    const focusables = () => Array.from(panel.current?.querySelectorAll<HTMLElement>("button, a[href], input, textarea, select, [tabindex]:not([tabindex='-1'])") ?? []).filter((el) => !el.hasAttribute("disabled"));
    // The primary action is last; start on the first control so Enter never confirms by accident.
    focusables()[0]?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      } else if (e.key === "Tab") {
        const all = focusables();
        const first = all[0];
        const last = all[all.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last?.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first?.focus();
        }
      }
    };
    window.addEventListener("keydown", onKey);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = overflow;
      before?.focus();
    };
  }, [open, onClose]);

  if (!open) return null;
  return createPortal(
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-4">
      <div className="veil absolute inset-0" onClick={onClose} aria-hidden />
      <div
        ref={panel}
        role="dialog"
        aria-modal="true"
        aria-labelledby={`${id}-title`}
        className="modal relative flex max-h-[90dvh] w-full flex-col gap-4 overflow-y-auto rounded-t-[24px] bg-bg p-6 pb-[calc(env(safe-area-inset-bottom)+24px)] shadow-3 sm:max-w-[480px] sm:rounded-[24px] sm:pb-6"
      >
        <div aria-hidden className="mx-auto -mt-2 h-1 w-9 rounded-full bg-border-strong sm:hidden" />
        <h2 id={`${id}-title`} className="text-xl font-medium">
          {title}
        </h2>
        {children && <div className="text-sm text-muted">{children}</div>}
        <div className="mt-2 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">{footer}</div>
      </div>
    </div>,
    document.body,
  );
}

type ConfirmOptions = { title: string; body?: ReactNode; confirmLabel: string; danger?: boolean };

/** Asks before something that matters (in place of the browser's confirm()). `ask` resolves true on yes. */
export function useConfirm() {
  const [pending, setPending] = useState<(ConfirmOptions & { resolve: (ok: boolean) => void }) | null>(null);
  const ask = (o: ConfirmOptions) => new Promise<boolean>((resolve) => setPending({ ...o, resolve }));
  const close = (ok: boolean) => {
    pending?.resolve(ok);
    setPending(null);
  };
  const dialog = (
    <Modal
      open={pending !== null}
      onClose={() => close(false)}
      title={pending?.title ?? ""}
      footer={
        <>
          <button type="button" className={buttonClass("secondary", "m")} onClick={() => close(false)}>
            Annulla
          </button>
          <button type="button" className={buttonClass(pending?.danger ? "danger" : "primary", "m")} onClick={() => close(true)}>
            {pending?.confirmLabel}
          </button>
        </>
      }
    >
      {pending?.body}
    </Modal>
  );
  return [ask, dialog] as const;
}

/** A form that asks first: submitting opens the modal, and only "yes" sends it (with the same button). */
export function ConfirmForm({ confirm, children, ...props }: ComponentProps<"form"> & { confirm: ConfirmOptions }) {
  const [ask, dialog] = useConfirm();
  const ok = useRef(false);
  return (
    <form
      {...props}
      onSubmit={async (e) => {
        if (ok.current) {
          ok.current = false;
          return;
        }
        e.preventDefault();
        const form = e.currentTarget;
        const submitter = (e.nativeEvent as SubmitEvent).submitter as HTMLButtonElement | null;
        if (await ask(confirm)) {
          ok.current = true;
          form.requestSubmit(submitter && form.contains(submitter) ? submitter : undefined);
        }
      }}
    >
      {children}
      {dialog}
    </form>
  );
}

/** A submit button that asks first, for buttons that post their own formAction inside a bigger form. */
export function ConfirmButton({ confirm, ...props }: ComponentProps<typeof Button> & { confirm: ConfirmOptions }) {
  const [ask, dialog] = useConfirm();
  return (
    <>
      <Button
        {...props}
        onClick={async (e) => {
          e.preventDefault();
          const button = e.currentTarget;
          if (await ask(confirm)) button.form?.requestSubmit(button);
        }}
      />
      {dialog}
    </>
  );
}
