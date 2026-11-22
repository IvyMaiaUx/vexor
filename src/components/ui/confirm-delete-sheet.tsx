"use client";

import { type RefObject, useEffect, useId, useRef } from "react";

interface ConfirmDeleteSheetProps {
  open: boolean;
  title: string;
  description?: string;
  confirmLabel: string;
  cancelLabel: string;
  loadingLabel?: string;
  retryLabel?: string;
  loading?: boolean;
  errorMessage?: string | null;
  returnFocusTo?: RefObject<HTMLElement | null>;
  onConfirm: () => void | Promise<void>;
  onCancel: () => void;
}

export function ConfirmDeleteSheet({
  open,
  title,
  description,
  confirmLabel,
  cancelLabel,
  loadingLabel = "Excluindo...",
  retryLabel = "Tentar novamente",
  loading = false,
  errorMessage = null,
  returnFocusTo,
  onConfirm,
  onCancel,
}: ConfirmDeleteSheetProps) {
  const titleId = useId();
  const descId = useId();
  const cancelBtnRef = useRef<HTMLButtonElement | null>(null);
  const wasOpenRef = useRef(false);

  useEffect(() => {
    if (open) {
      wasOpenRef.current = true;
      const frame = requestAnimationFrame(() => {
        cancelBtnRef.current?.focus();
      });
      return () => cancelAnimationFrame(frame);
    }

    if (wasOpenRef.current) {
      wasOpenRef.current = false;
      requestAnimationFrame(() => {
        returnFocusTo?.current?.focus();
      });
    }
  }, [open, returnFocusTo]);

  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !loading) {
        e.preventDefault();
        onCancel();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [loading, onCancel, open]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 backdrop-blur-sm sm:items-center sm:p-4"
      onClick={() => {
        if (!loading) onCancel();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={description ? descId : undefined}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md rounded-t-3xl border border-slate-800 bg-[#0d1322] px-5 pb-6 pt-3 shadow-2xl sm:rounded-3xl sm:p-6"
      >
        <div
          className="mx-auto mb-4 h-1 w-10 rounded-full bg-slate-700 sm:hidden"
          aria-hidden="true"
        />

        <h2 id={titleId} className="text-base font-semibold text-slate-100">
          {title}
        </h2>

        {description && (
          <p id={descId} className="mt-1.5 text-sm leading-relaxed text-slate-400">
            {description}
          </p>
        )}

        {errorMessage && (
          <div
            role="alert"
            className="mt-3 rounded-xl border border-rose-500/35 bg-rose-500/10 px-3.5 py-2.5 text-xs text-rose-200"
          >
            <p>{errorMessage}</p>
          </div>
        )}

        <div className="mt-5 flex items-center gap-2.5">
          <button
            ref={cancelBtnRef}
            type="button"
            disabled={loading}
            onClick={onCancel}
            className="inline-flex min-h-[44px] flex-1 items-center justify-center rounded-xl border border-slate-700 bg-[#070b14] px-4 text-sm font-semibold text-slate-200 transition-colors hover:border-slate-600 hover:text-slate-100 disabled:opacity-50"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            disabled={loading}
            onClick={() => void onConfirm()}
            className="inline-flex min-h-[44px] flex-1 items-center justify-center rounded-xl border border-rose-500/35 bg-rose-500/10 px-4 text-sm font-semibold text-rose-300 transition-colors hover:bg-rose-500/20 disabled:opacity-50"
          >
            {loading
              ? loadingLabel
              : errorMessage
                ? retryLabel
                : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
