"use client";

import React, { useEffect } from "react";
import type { AuditLog, AuditSeverity } from "../types";
import { useI18n } from "@/lib/i18n/context";
import {
  classifyAuditSeverity,
  sanitizeAuditMetadata,
} from "../utils/audit-export";

interface AdminAuditDetailModalProps {
  log: AuditLog | null;
  onClose: () => void;
  loading?: boolean;
  error?: boolean;
}

const SEVERITY_BADGE_STYLES: Record<AuditSeverity, string> = {
  info: "border-sky-500/40 bg-sky-500/15 text-sky-300",
  warning: "border-amber-500/40 bg-amber-500/15 text-amber-300",
  critical: "border-rose-500/40 bg-rose-500/15 text-rose-300",
  access_denied: "border-rose-500/60 bg-rose-950/60 text-rose-200 font-bold",
};

export function AdminAuditDetailModal({
  log,
  onClose,
  loading = false,
  error = false,
}: AdminAuditDetailModalProps) {
  const { dict, locale } = useI18n();
  const t = dict.adminPanel.auditPage;

  useEffect(() => {
    if (!log && !loading && !error) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [log, loading, error, onClose]);

  if (!log && !loading && !error) return null;

  const dateFormatter = new Intl.DateTimeFormat(locale, {
    dateStyle: "medium",
    timeStyle: "medium",
  });

  const severity = log ? classifyAuditSeverity(log) : "info";
  const sanitizedMetadata = log ? sanitizeAuditMetadata(log.metadata) : {};
  const metadataJson = JSON.stringify(sanitizedMetadata, null, 2);

  const previousValue =
    typeof sanitizedMetadata.from === "string"
      ? sanitizedMetadata.from
      : typeof sanitizedMetadata.previousRole === "string"
        ? sanitizedMetadata.previousRole
        : null;
  const nextValue =
    typeof sanitizedMetadata.to === "string"
      ? sanitizedMetadata.to
      : typeof sanitizedMetadata.newRole === "string"
        ? sanitizedMetadata.newRole
        : null;
  const reasonValue =
    typeof sanitizedMetadata.reason === "string"
      ? sanitizedMetadata.reason
      : null;
  const descriptionValue =
    typeof sanitizedMetadata.description === "string"
      ? sanitizedMetadata.description
      : null;
  const targetUsernameValue =
    typeof sanitizedMetadata.targetUsername === "string"
      ? sanitizedMetadata.targetUsername
      : null;

  const isComplete = Boolean(
    log && log.incomplete !== true && log.actorUsername && log.action
  );

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="audit-detail-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto p-4"
    >
      <div
        className="fixed inset-0 bg-black/80 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />

      <div className="relative z-10 max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-slate-800 bg-[#091020] p-6 shadow-2xl">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 border-b border-slate-800 pb-4">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-mono text-[11px] uppercase tracking-wider text-cyan-400">
                {t.detailsModal.eyebrow} {log ? `· #${log.id}` : ""}
              </span>
              {log && (
                <>
                  <span
                    className={`rounded border px-2 py-0.5 font-mono text-[10px] ${
                      SEVERITY_BADGE_STYLES[severity]
                    }`}
                  >
                    {t.severityLabels[severity]}
                  </span>
                  {!isComplete ? (
                    <span className="rounded border border-amber-500/40 bg-amber-500/10 px-2 py-0.5 font-mono text-[10px] text-amber-300">
                      {t.incompleteBadge}
                    </span>
                  ) : (
                    <span className="rounded border border-emerald-500/40 bg-emerald-500/10 px-2 py-0.5 font-mono text-[10px] text-emerald-300">
                      {t.detailsModal.integrityComplete}
                    </span>
                  )}
                </>
              )}
            </div>
            <h2
              id="audit-detail-modal-title"
              className="mt-1 text-lg font-bold text-white"
            >
              {t.detailsModal.title}
            </h2>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label={t.detailsModal.closeAriaLabel}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-slate-800 bg-[#070b14] text-slate-400 transition-colors hover:border-slate-700 hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400"
          >
            ✕
          </button>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center gap-3 py-12">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-cyan-500 border-t-transparent" />
            <p className="font-mono text-xs text-slate-400">
              {t.detailsModal.loadingMessage}
            </p>
          </div>
        ) : error || !log ? (
          <div className="py-10 text-center text-xs text-rose-300">
            {t.detailsModal.notFoundMessage}
          </div>
        ) : (
          <div className="mt-5 space-y-4">
            {/* Action & Timestamp */}
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-800/90 bg-[#070b14] p-3.5 text-xs">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-slate-400">{t.detailsModal.actionLabel}</span>
                <span className="rounded-md border border-cyan-500/30 bg-cyan-500/10 px-2.5 py-1 font-semibold text-cyan-200">
                  {t.actionLabels[log.action] || log.action}
                </span>
                <span className="font-mono text-[11px] text-slate-400">
                  ({log.action})
                </span>
              </div>
              <time dateTime={log.createdAt} className="font-mono text-slate-300">
                {dateFormatter.format(new Date(log.createdAt))}
              </time>
            </div>

            {/* Operator & Target Entity */}
            <div className="grid grid-cols-1 gap-3 text-xs sm:grid-cols-2">
              <div className="rounded-xl border border-slate-800/80 bg-[#070b14] p-3.5">
                <span className="font-mono text-[11px] uppercase tracking-wider text-slate-400">
                  {t.detailsModal.actorLabel}
                </span>
                <p className="mt-1 font-semibold text-white">
                  @{log.actorUsername || "system"}
                </p>
                <p className="mt-0.5 truncate font-mono text-[11px] text-slate-400">
                  ID: {log.actorId || "N/A"}
                </p>
              </div>

              <div className="rounded-xl border border-slate-800/80 bg-[#070b14] p-3.5">
                <span className="font-mono text-[11px] uppercase tracking-wider text-slate-400">
                  {t.detailsModal.entityTypeLabel}
                </span>
                <p className="mt-1 font-semibold text-cyan-300">
                  {t.entityTypeLabels[log.entityType] || log.entityType}
                </p>
                <p className="mt-0.5 truncate font-mono text-[11px] text-slate-400">
                  ID: {log.entityId}
                </p>
              </div>
            </div>

            {/* Affected user / Description / Justification */}
            {(targetUsernameValue || descriptionValue || reasonValue) && (
              <div className="space-y-2 rounded-xl border border-slate-800/80 bg-[#0c1220] p-4 text-xs">
                {targetUsernameValue && (
                  <p className="text-slate-200">
                    <strong className="text-slate-400">
                      {t.detailsModal.targetUserLabel}{" "}
                    </strong>
                    <span className="font-mono text-cyan-300">
                      @{targetUsernameValue}
                    </span>
                  </p>
                )}
                {descriptionValue && (
                  <p className="text-slate-200">
                    <strong className="text-slate-400">
                      {t.detailsModal.descriptionLabel}{" "}
                    </strong>
                    {descriptionValue}
                  </p>
                )}
                {reasonValue && (
                  <p className="text-rose-200/90">
                    <strong className="text-rose-300">
                      {t.detailsModal.reasonLabel}{" "}
                    </strong>
                    {reasonValue}
                  </p>
                )}
              </div>
            )}

            {/* Previous vs Next values comparison */}
            {(previousValue !== null || nextValue !== null) && (
              <div className="grid grid-cols-1 gap-3 text-xs sm:grid-cols-2">
                <div className="rounded-xl border border-slate-800 bg-[#070b14] p-3.5">
                  <span className="block font-mono text-[11px] uppercase text-slate-400">
                    {t.detailsModal.previousValueLabel}
                  </span>
                  <span className="mt-1 inline-block font-mono font-semibold text-amber-300">
                    {previousValue ?? "—"}
                  </span>
                </div>
                <div className="rounded-xl border border-slate-800 bg-[#070b14] p-3.5">
                  <span className="block font-mono text-[11px] uppercase text-slate-400">
                    {t.detailsModal.nextValueLabel}
                  </span>
                  <span className="mt-1 inline-block font-mono font-semibold text-emerald-300">
                    {nextValue ?? "—"}
                  </span>
                </div>
              </div>
            )}

            {/* Sanitized Metadata JSON */}
            <div>
              <div className="mb-2 flex items-center justify-between gap-2">
                <h3 className="font-mono text-xs uppercase tracking-wider text-cyan-400">
                  {t.detailsModal.rawMetadataTitle}
                </h3>
                <span className="rounded border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 font-mono text-[10px] text-emerald-300">
                  {t.detailsModal.sanitizedBadge}
                </span>
              </div>
              <pre className="max-h-56 overflow-x-auto rounded-xl border border-slate-800 bg-[#050811] p-3.5 font-mono text-xs leading-relaxed text-slate-300">
                <code>{metadataJson}</code>
              </pre>
              <p className="mt-1.5 text-[11px] text-slate-400">
                {t.detailsModal.ipNotice}
              </p>
            </div>

            <div className="rounded-xl border border-slate-800 bg-[#070b14] p-3 text-xs text-slate-400">
              <strong className="text-slate-200">Append-Only: </strong>
              {t.immutableNotice}
            </div>
          </div>
        )}

        <div className="mt-5 flex justify-end border-t border-slate-800 pt-4">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-slate-700 bg-[#0c1220] px-4 py-2 text-xs font-semibold text-slate-200 transition-colors hover:border-slate-600 hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400"
          >
            {t.detailsModal.closeBtn}
          </button>
        </div>
      </div>
    </div>
  );
}
