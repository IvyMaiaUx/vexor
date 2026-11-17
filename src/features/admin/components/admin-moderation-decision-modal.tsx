"use client";

import React, { useEffect, useState } from "react";
import type { ModerationAction, UnifiedModerationItem } from "../types";
import { useI18n } from "@/lib/i18n/context";

interface AdminModerationDecisionModalProps {
  item: UnifiedModerationItem | null;
  mode: ModerationAction | null;
  onClose: () => void;
  onConfirm: (
    item: UnifiedModerationItem,
    mode: ModerationAction,
    reason?: string
  ) => Promise<{ success: boolean; error?: string }>;
}

const REASON_REQUIRED_MODES = new Set<ModerationAction>([
  "reject",
  "hide",
  "delete",
  "request_revision",
  "escalate",
]);

export function AdminModerationDecisionModal({
  item,
  mode,
  onClose,
  onConfirm,
}: AdminModerationDecisionModalProps) {
  const { dict } = useI18n();
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!item || !mode) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !submitting) onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [item, mode, submitting, onClose]);

  if (!item || !mode) return null;

  const t = dict.adminPanel.moderationPage;
  const requiresReason = REASON_REQUIRED_MODES.has(mode);

  const modalMeta: Record<
    string,
    { title: string; desc: string; confirmLabel: string; tone: "positive" | "danger" | "warn" }
  > = {
    approve: {
      title: t.decisionModal.approveTitle,
      desc: t.decisionModal.approveDesc,
      confirmLabel: t.decisionModal.confirmApproveBtn,
      tone: "positive",
    },
    restore: {
      title: t.decisionModal.restoreTitle,
      desc: t.decisionModal.restoreDesc,
      confirmLabel: t.decisionModal.confirmRestoreBtn,
      tone: "positive",
    },
    reject: {
      title: t.decisionModal.rejectTitle,
      desc: t.decisionModal.rejectDesc,
      confirmLabel: t.decisionModal.confirmRejectBtn,
      tone: "danger",
    },
    hide: {
      title: t.decisionModal.hideTitle,
      desc: t.decisionModal.hideDesc,
      confirmLabel: t.decisionModal.confirmHideBtn,
      tone: "danger",
    },
    escalate: {
      title: t.decisionModal.escalateTitle,
      desc: t.decisionModal.escalateDesc,
      confirmLabel: t.decisionModal.confirmEscalateBtn,
      tone: "warn",
    },
    request_revision: {
      title: t.decisionModal.requestRevisionTitle,
      desc: t.decisionModal.requestRevisionDesc,
      confirmLabel: t.decisionModal.confirmRevisionBtn,
      tone: "warn",
    },
  };

  const currentMeta = modalMeta[mode] ?? modalMeta.approve;
  const trimmedReason = reason.trim();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;

    if (requiresReason && trimmedReason.length < 5) {
      setError(t.decisionModal.reasonMinError);
      return;
    }

    setSubmitting(true);
    setError(null);

    const res = await onConfirm(item, mode, trimmedReason || undefined);
    setSubmitting(false);

    if (res.success) {
      setReason("");
      onClose();
    } else {
      setError(res.error || t.decisionModal.generalError);
    }
  };

  const toneButtonClass =
    currentMeta.tone === "danger"
      ? "border-rose-500/40 bg-rose-600 hover:bg-rose-500"
      : currentMeta.tone === "warn"
        ? "border-amber-500/40 bg-amber-600 hover:bg-amber-500"
        : "border-emerald-500/40 bg-emerald-600 hover:bg-emerald-500";

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="moderation-decision-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto"
    >
      <div
        className="fixed inset-0 bg-black/80 backdrop-blur-sm transition-opacity"
        onClick={() => !submitting && onClose()}
        aria-hidden="true"
      />

      <div className="relative z-10 w-full max-w-lg overflow-hidden rounded-2xl border border-slate-800 bg-[#0c1220] p-6 shadow-2xl">
        <div className="flex items-start justify-between border-b border-slate-800 pb-4">
          <div>
            <span
              className={`font-mono text-xs uppercase tracking-wider ${
                currentMeta.tone === "danger"
                  ? "text-rose-400"
                  : currentMeta.tone === "warn"
                    ? "text-amber-400"
                    : "text-emerald-400"
              }`}
            >
              {t.actionLabels[mode] || mode}
            </span>
            <h3
              id="moderation-decision-title"
              className="text-lg font-bold text-slate-100"
            >
              {currentMeta.title}
            </h3>
          </div>
          <button
            type="button"
            onClick={() => !submitting && onClose()}
            aria-label={t.detailModal.closeBtn}
            className="rounded-lg p-1 text-slate-400 hover:bg-slate-800 hover:text-white"
          >
            ✕
          </button>
        </div>

        {/* Content Item Summary */}
        <div className="mt-4 rounded-xl border border-slate-800/80 bg-[#070b14] p-3 text-xs space-y-1">
          <div className="flex items-center justify-between text-slate-400">
            <span>
              {t.typeCol}:{" "}
              <strong className="text-cyan-400 uppercase">
                {t.typeLabels[item.contentType] || item.contentType}
              </strong>
            </span>
            <span>
              {t.authorCol}:{" "}
              <strong className="text-slate-200">@{item.authorUsername}</strong>
            </span>
          </div>
          <p className="font-semibold text-slate-100 truncate">{item.title}</p>
        </div>

        <p className="mt-3 text-xs text-slate-400 leading-relaxed">
          {currentMeta.desc}
        </p>

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <div>
            <label
              htmlFor="moderation-reason"
              className="block text-xs font-semibold text-slate-300"
            >
              {requiresReason
                ? t.decisionModal.reasonLabel
                : t.decisionModal.reasonOptionalLabel}
            </label>
            <textarea
              id="moderation-reason"
              rows={4}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder={t.decisionModal.reasonPlaceholder}
              required={requiresReason}
              className="mt-1.5 w-full rounded-xl border border-slate-800 bg-[#070b14] p-3 text-xs text-slate-200 placeholder-slate-500 focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500"
            />
            {requiresReason && (
              <div className="mt-1 flex items-center justify-between text-[11px] text-slate-500">
                <span>{t.decisionModal.reasonHint}</span>
                <span
                  className={
                    trimmedReason.length >= 5
                      ? "text-emerald-400"
                      : "text-slate-500"
                  }
                >
                  {trimmedReason.length}/5 mín.
                </span>
              </div>
            )}
          </div>

          {error && (
            <div className="rounded-xl border border-rose-500/40 bg-rose-500/10 p-3 text-xs text-rose-300">
              {error}
            </div>
          )}

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="rounded-xl border border-slate-700 bg-slate-800 px-4 py-2 text-xs font-medium text-slate-300 hover:bg-slate-700 hover:text-white transition-colors"
            >
              {t.decisionModal.cancelBtn}
            </button>
            <button
              type="submit"
              disabled={submitting || (requiresReason && trimmedReason.length < 5)}
              className={`rounded-xl border px-4 py-2 text-xs font-semibold text-white shadow-lg disabled:opacity-40 disabled:cursor-not-allowed transition-colors ${toneButtonClass}`}
            >
              {submitting ? "..." : currentMeta.confirmLabel}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
