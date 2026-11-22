"use client";

import { useEffect } from "react";

interface UndoToastProps {
  open: boolean;
  message: string;
  undoLabel: string;
  dismissLabel?: string;
  retryLabel?: string;
  undoing?: boolean;
  errorMessage?: string | null;
  durationMs?: number;
  onUndo: () => void | Promise<void>;
  onDismiss: () => void;
}

export function UndoToast({
  open,
  message,
  undoLabel,
  dismissLabel = "Fechar",
  retryLabel = "Tentar novamente",
  undoing = false,
  errorMessage = null,
  durationMs = 8000,
  onUndo,
  onDismiss,
}: UndoToastProps) {
  useEffect(() => {
    if (!open || undoing || errorMessage) return;
    const timer = setTimeout(() => {
      onDismiss();
    }, durationMs);
    return () => clearTimeout(timer);
  }, [durationMs, errorMessage, onDismiss, open, undoing]);

  if (!open) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed inset-x-4 bottom-20 z-50 mx-auto max-w-md rounded-2xl border border-slate-700/90 bg-[#0d1322]/95 px-4 py-2.5 shadow-2xl backdrop-blur-md sm:bottom-6"
    >
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-slate-100">{message}</p>
          {errorMessage && (
            <p role="alert" className="mt-0.5 text-xs text-rose-300">
              {errorMessage}
            </p>
          )}
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <button
            type="button"
            disabled={undoing}
            onClick={() => void onUndo()}
            className="inline-flex min-h-[44px] items-center justify-center rounded-xl border border-cyan-500/40 bg-cyan-500/15 px-3.5 text-xs font-semibold text-cyan-200 transition-colors hover:bg-cyan-500/25 disabled:opacity-50"
          >
            {undoing ? "..." : errorMessage ? retryLabel : undoLabel}
          </button>
          <button
            type="button"
            aria-label={dismissLabel}
            onClick={onDismiss}
            className="inline-flex h-11 w-11 items-center justify-center rounded-xl text-slate-400 transition-colors hover:bg-slate-800/70 hover:text-slate-200"
          >
            <span aria-hidden="true" className="text-base leading-none">
              ✕
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}
