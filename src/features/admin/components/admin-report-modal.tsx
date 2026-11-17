"use client";

import React, { useEffect, useState } from "react";
import type { Report, ReportStatus } from "../types";
import { adminDataProvider } from "../services/admin-provider";
import { useAuthStore } from "@/features/auth/use-auth-store";
import { useI18n } from "@/lib/i18n/context";

interface AdminReportModalProps {
  report: Report | null;
  onClose: () => void;
  onSuccess: () => void;
}

export function AdminReportModal({
  report,
  onClose,
  onSuccess,
}: AdminReportModalProps) {
  const { dict, locale } = useI18n();
  const user = useAuthStore((s) => s.user);
  const isPt = locale === "pt-BR";

  const [decision, setDecision] = useState<ReportStatus>(() =>
    report?.status === "reviewing" ? "resolved" : "reviewing"
  );
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!report) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !submitting) onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [report, submitting, onClose]);

  if (!report) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || submitting) return;

    if (!note.trim() || note.trim().length < 5) {
      setError("A nota de resolução deve conter pelo menos 5 caracteres.");
      return;
    }

    setSubmitting(true);
    setError(null);

    const res = await adminDataProvider.reports.resolveReport(
      user,
      report.id,
      decision,
      note
    );
    setSubmitting(false);

    if (res.success) {
      onSuccess();
      onClose();
    } else {
      setError(res.error || "Erro ao registrar resolução da denúncia.");
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="report-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto"
    >
      <div
        className="fixed inset-0 bg-black/80 backdrop-blur-sm transition-opacity"
        onClick={() => !submitting && onClose()}
        aria-hidden="true"
      />

      <div className="relative z-10 w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl border border-slate-800 bg-[#0c1220] p-6 shadow-2xl">
        <div className="flex items-start justify-between border-b border-slate-800 pb-4">
          <div>
            <span className="font-mono text-xs uppercase tracking-wider text-rose-400">
              {report.id}
            </span>
            <h3
              id="report-modal-title"
              className="text-lg font-bold text-slate-100"
            >
              {dict.adminPanel.reportsPage.modalTitle}
            </h3>
          </div>
          <button
            type="button"
            onClick={() => !submitting && onClose()}
            aria-label={dict.adminPanel.moderationPage.detailModal.closeBtn}
            className="rounded-lg p-1 text-slate-400 hover:bg-slate-800 hover:text-white"
          >
            ✕
          </button>
        </div>

        {/* Target summary snippet (reporter identity strictly hidden) */}
        <div className="mt-4 rounded-xl border border-slate-800/80 bg-[#070b14] p-3 text-xs space-y-1.5">
          <div className="flex flex-wrap items-center justify-between gap-2 text-slate-400">
            <span>
              Alvo: <strong className="text-slate-200">{report.targetType}</strong>
            </span>
            <span className="font-mono text-[11px] text-slate-400">
              {dict.adminPanel.moderationPage.reporterProtected}
            </span>
          </div>
          {report.targetTitle && (
            <p className="font-semibold text-slate-200">{report.targetTitle}</p>
          )}
          {report.details && (
            <p className="text-slate-400 italic">&ldquo;{report.details}&rdquo;</p>
          )}
        </div>

        {/* Decision History */}
        {report.history && report.history.length > 0 && (
          <div className="mt-4 rounded-xl border border-slate-800/80 bg-[#070b14] p-3 text-xs space-y-2">
            <span className="font-mono text-[10px] uppercase tracking-wider text-slate-400">
              {dict.adminPanel.moderationPage.detailModal.historyTitle}
            </span>
            <ul className="space-y-1.5">
              {report.history.map((h, idx) => (
                <li
                  key={`${h.timestamp}-${idx}`}
                  className="rounded border border-slate-800 bg-[#050811] p-2 text-[11px]"
                >
                  <div className="flex items-center justify-between text-cyan-300 font-mono">
                    <span>{dict.adminPanel.reportsPage.statusLabels[h.status] || h.status}</span>
                    <span className="text-slate-400">
                      @{h.actorUsername} ·{" "}
                      {new Date(h.timestamp).toLocaleString(
                        isPt ? "pt-BR" : "en-US"
                      )}
                    </span>
                  </div>
                  {h.note && <p className="mt-1 text-slate-300">{h.note}</p>}
                </li>
              ))}
            </ul>
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          {error && (
            <div className="rounded-xl border border-rose-500/40 bg-rose-500/10 p-3 text-xs text-rose-300">
              {error}
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-300">
              {dict.adminPanel.reportsPage.decisionLabel}
            </label>
            <select
              value={decision}
              onChange={(e) => setDecision(e.target.value as ReportStatus)}
              className="mt-1.5 w-full rounded-xl border border-slate-700 bg-[#070b14] px-3.5 py-2.5 text-xs text-slate-200 focus:border-cyan-500 focus:outline-none"
            >
              <option value="reviewing">
                {dict.adminPanel.reportsPage.statusLabels.reviewing}
              </option>
              <option value="resolved">
                {dict.adminPanel.reportsPage.statusLabels.resolved}
              </option>
              <option value="dismissed">
                {dict.adminPanel.reportsPage.statusLabels.dismissed}
              </option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300">
              {dict.adminPanel.reportsPage.resolutionNoteLabel} *
            </label>
            <textarea
              rows={4}
              required
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder={dict.adminPanel.reportsPage.justificationPlaceholder}
              className="mt-1.5 w-full rounded-xl border border-slate-700 bg-[#070b14] p-3 text-xs text-slate-200 placeholder-slate-500 focus:border-cyan-500 focus:outline-none"
            />
            <p className="mt-1 font-mono text-[10px] text-slate-400">
              {dict.adminPanel.reportsPage.justificationHint}
            </p>
          </div>

          <div className="rounded-lg bg-slate-900/60 p-2.5 font-mono text-[10px] text-slate-400">
            Registro demonstrativo local atribuído a{" "}
            <span className="text-cyan-300">@{user?.username}</span>.
          </div>

          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="rounded-xl border border-slate-700 bg-[#070b14] px-4 py-2 text-xs font-semibold text-slate-300 hover:border-slate-600 hover:text-white"
            >
              {dict.adminPanel.reportsPage.cancelBtn}
            </button>
            <button
              type="submit"
              disabled={submitting || note.trim().length < 5}
              className="rounded-xl bg-cyan-600 px-4 py-2 text-xs font-semibold text-white hover:bg-cyan-500 disabled:opacity-40"
            >
              {submitting ? "..." : dict.adminPanel.reportsPage.confirmBtn}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
