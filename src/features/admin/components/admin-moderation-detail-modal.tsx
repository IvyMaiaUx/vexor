"use client";

import React, { useEffect, useState } from "react";
import type { ModerationAction, UnifiedModerationItem } from "../types";
import { getModerationAvailableActions } from "../utils/moderation-actions";
import { useI18n } from "@/lib/i18n/context";
import { analyzeUrlSafety } from "../utils/url-safety";
import { researchService } from "@/features/cybercrime-research/services/research-service";

interface AdminModerationDetailModalProps {
  item: UnifiedModerationItem | null;
  onClose: () => void;
  onOpenDecision: (item: UnifiedModerationItem, mode: ModerationAction) => void;
  canModerate?: boolean;
}

export function AdminModerationDetailModal({
  item,
  onClose,
  onOpenDecision,
  canModerate = true,
}: AdminModerationDetailModalProps) {
  const { dict, locale } = useI18n();
  const [loadedRecipients, setLoadedRecipients] = useState<
    Array<{ userId: string; username: string; justification: string | null }>
  >([]);
  const recipients = item?.contentType === "research" ? loadedRecipients : [];
  const [recipientUserId, setRecipientUserId] = useState("");
  const [recipientJustification, setRecipientJustification] = useState("");
  const [recipientFeedback, setRecipientFeedback] = useState<string | null>(null);
  const [recipientBusy, setRecipientBusy] = useState(false);

  const researchTlp =
    item?.contentType === "research" && typeof item.metadata?.tlp === "string"
      ? item.metadata.tlp
      : null;
  const canManageRecipients =
    Boolean(item) &&
    canModerate &&
    item?.contentType === "research" &&
    item?.status === "approved" &&
    (researchTlp === "AMBER" || researchTlp === "AMBER+" || researchTlp === "RED");

  useEffect(() => {
    if (!item || item.contentType !== "research") return;
    let active = true;
    void researchService.getSubmissionDetail(item.id).then((res) => {
      if (!active || !res.success || !res.data) return;
      setLoadedRecipients(
        res.data.recipients.map((r) => ({
          userId: r.userId,
          username: r.username,
          justification: r.justification,
        }))
      );
    });
    return () => {
      active = false;
    };
  }, [item]);

  useEffect(() => {
    if (!item) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [item, onClose]);

  if (!item) return null;

  const t = dict.adminPanel.moderationPage;
  const isPt = locale === "pt-BR";

  const urlSafety = analyzeUrlSafety(item.url);
  const availableActions = getModerationAvailableActions(item);

  const formatDate = (iso?: string) => {
    if (!iso) return "—";
    return new Date(iso).toLocaleString(isPt ? "pt-BR" : "en-US", {
      year: "numeric",
      month: "short",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const statusBadgeStyles: Record<string, string> = {
    pending: "border-amber-500/40 bg-amber-500/10 text-amber-300",
    approved: "border-emerald-500/40 bg-emerald-500/10 text-emerald-300",
    published: "border-emerald-500/40 bg-emerald-500/10 text-emerald-300",
    rejected: "border-rose-500/40 bg-rose-500/10 text-rose-300",
    hidden: "border-rose-500/40 bg-rose-500/10 text-rose-300",
    revision_requested: "border-cyan-500/40 bg-cyan-500/10 text-cyan-300",
    escalated: "border-purple-500/40 bg-purple-500/10 text-purple-300",
    archived: "border-slate-700 bg-slate-800 text-slate-400",
    deleted: "border-slate-700 bg-slate-900 text-slate-500",
  };

  const priorityBadgeStyles: Record<string, string> = {
    critical: "border-rose-500/50 bg-rose-500/15 text-rose-300",
    high: "border-amber-500/40 bg-amber-500/10 text-amber-300",
    medium: "border-cyan-500/40 bg-cyan-500/10 text-cyan-300",
    low: "border-slate-700 bg-slate-800 text-slate-300",
  };

  const actionButtonConfig: Partial<
    Record<ModerationAction, { label: string; style: string }>
  > = {
    approve: {
      label: `✓ ${t.approveBtn}`,
      style:
        "border-emerald-500/40 bg-emerald-500/10 text-emerald-300 hover:bg-emerald-500/20",
    },
    reject: {
      label: `✕ ${t.rejectBtn}`,
      style:
        "border-rose-500/40 bg-rose-500/10 text-rose-300 hover:bg-rose-500/20",
    },
    hide: {
      label: t.hideBtn,
      style:
        "border-rose-500/40 bg-rose-500/10 text-rose-300 hover:bg-rose-500/20",
    },
    restore: {
      label: t.restoreBtn,
      style:
        "border-emerald-500/40 bg-emerald-500/10 text-emerald-300 hover:bg-emerald-500/20",
    },
    escalate: {
      label: t.escalateBtn,
      style:
        "border-purple-500/40 bg-purple-500/10 text-purple-300 hover:bg-purple-500/20",
    },
    request_revision: {
      label: t.requestRevisionBtn,
      style:
        "border-cyan-500/40 bg-cyan-500/10 text-cyan-300 hover:bg-cyan-500/20",
    },
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="moderation-detail-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto"
    >
      <div
        className="fixed inset-0 bg-black/80 backdrop-blur-sm transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />

      <div className="relative z-10 w-full max-w-3xl max-h-[90vh] overflow-y-auto rounded-2xl border border-slate-800 bg-[#0c1220] p-6 shadow-2xl">
        {/* Header */}
        <div className="flex items-start justify-between border-b border-slate-800 pb-4">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-mono text-xs uppercase tracking-wider text-cyan-400">
                {t.typeLabels[item.contentType] || item.contentType}
              </span>
              <span
                className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 font-mono text-[10px] font-semibold uppercase ${
                  statusBadgeStyles[item.status] ||
                  "border-slate-700 bg-slate-800 text-slate-300"
                }`}
              >
                {t.statusLabels[item.status] || item.status}
              </span>
              {item.priority && (
                <span
                  className={`inline-flex items-center rounded-full border px-2.5 py-0.5 font-mono text-[10px] font-semibold uppercase ${
                    priorityBadgeStyles[item.priority] ||
                    "border-slate-700 bg-slate-800 text-slate-300"
                  }`}
                >
                  {t.priorityLabels[item.priority] || item.priority}
                </span>
              )}
              {item.incomplete && (
                <span className="rounded-full border border-amber-500/40 bg-amber-500/10 px-2 py-0.5 font-mono text-[10px] text-amber-300">
                  {t.incompleteBadge}
                </span>
              )}
            </div>
            <h3
              id="moderation-detail-title"
              className="mt-2 text-xl font-bold text-slate-100"
            >
              {item.title}
            </h3>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label={t.detailModal.closeBtn}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Content Body */}
        <div className="mt-5 space-y-5">
          {/* Metadata Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
            <div className="rounded-xl border border-slate-800/80 bg-[#070b14] p-3">
              <span className="text-[11px] font-mono uppercase tracking-wider text-slate-400">
                {t.detailModal.authorLabel}
              </span>
              <div className="mt-1 flex items-center gap-2">
                <span className="font-semibold text-slate-200">
                  @{item.authorUsername}
                </span>
                <span className="rounded bg-slate-800 px-1.5 py-0.5 font-mono text-[10px] text-cyan-300">
                  {item.authorRole}
                </span>
              </div>
            </div>

            <div className="rounded-xl border border-slate-800/80 bg-[#070b14] p-3">
              <span className="text-[11px] font-mono uppercase tracking-wider text-slate-400">
                {t.detailModal.categoryLabel}
              </span>
              <p className="mt-1 font-mono text-cyan-300">{item.category}</p>
            </div>

            <div className="rounded-xl border border-slate-800/80 bg-[#070b14] p-3">
              <span className="text-[11px] font-mono uppercase tracking-wider text-slate-400">
                {t.detailModal.reportCountLabel}
              </span>
              <p className="mt-1 font-mono text-slate-200">
                {item.reportCount ?? 0}
              </p>
            </div>

            <div className="rounded-xl border border-slate-800/80 bg-[#070b14] p-3">
              <span className="text-[11px] font-mono uppercase tracking-wider text-slate-400">
                {t.detailModal.submittedAtLabel}
              </span>
              <p className="mt-1 font-mono text-slate-300">
                {formatDate(item.submittedAt)}
              </p>
            </div>

            <div className="rounded-xl border border-slate-800/80 bg-[#070b14] p-3 sm:col-span-2">
              <span className="text-[11px] font-mono uppercase tracking-wider text-slate-400">
                {t.detailModal.updatedAtLabel}
              </span>
              <p className="mt-1 font-mono text-slate-300">
                {formatDate(item.updatedAt || item.submittedAt)}
              </p>
            </div>
          </div>

          {/* Flag Reason */}
          {item.flagReason && (
            <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-3 text-xs">
              <span className="font-mono text-[11px] uppercase tracking-wider text-amber-300">
                {t.detailModal.flagReasonLabel}
              </span>
              <p className="mt-1 text-slate-200">{item.flagReason}</p>
            </div>
          )}

          {/* URL Safety Analysis Card */}
          {item.url && (
            <div className="rounded-xl border border-slate-800 bg-[#070b14] p-4 text-xs space-y-2.5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="font-mono text-xs uppercase tracking-wider text-slate-400">
                  {t.detailModal.urlInspectionTitle}
                </span>
                {urlSafety.severity === "safe" ? (
                  <span className="rounded border border-emerald-500/40 bg-emerald-500/10 px-2 py-0.5 font-mono text-[10px] text-emerald-300">
                    ✓ HTTPS / Sem alertas heurísticos
                  </span>
                ) : urlSafety.severity === "warning" ? (
                  <span className="rounded border border-amber-500/40 bg-amber-500/10 px-2 py-0.5 font-mono text-[10px] text-amber-300 font-semibold">
                    ⚠ ALERTA HEURÍSTICO
                  </span>
                ) : (
                  <span className="rounded border border-rose-500/40 bg-rose-500/10 px-2 py-0.5 font-mono text-[10px] text-rose-300 font-bold">
                    ALERTA CRÍTICO DE LINK
                  </span>
                )}
              </div>

              <div className="rounded-lg border border-slate-800/80 bg-[#050811] p-2.5 font-mono text-[11px] text-slate-300 break-all">
                {item.url}
              </div>

              {urlSafety.warnings.length > 0 && (
                <div className="space-y-1 pt-1">
                  {urlSafety.warnings.map((warn, i) => (
                    <div
                      key={i}
                      className={`flex items-start gap-1.5 text-[11px] ${
                        urlSafety.severity === "danger"
                          ? "text-rose-400"
                          : "text-amber-300"
                      }`}
                    >
                      <span>•</span>
                      <span>{warn}</span>
                    </div>
                  ))}
                </div>
              )}

              <p className="text-[11px] text-slate-400 border-t border-slate-800/80 pt-2">
                {t.detailModal.urlNonConclusiveNotice}
              </p>

              {urlSafety.isSafe && urlSafety.warnings.length === 0 && (
                <div className="pt-1">
                  <a
                    href={item.url}
                    target="_blank"
                    rel="noopener noreferrer nofollow"
                    className="inline-flex items-center gap-1.5 text-xs text-cyan-400 hover:text-cyan-300 hover:underline"
                  >
                    <span>Abrir link em nova guia (rel=noopener noreferrer) ↗</span>
                  </a>
                </div>
              )}
            </div>
          )}

          {/* Full Content Body (Pure React text nodes - raw text only) */}
          <div className="space-y-2 rounded-xl border border-slate-800/80 bg-[#070b14] p-4 text-xs">
            <span className="font-mono text-xs uppercase tracking-wider text-cyan-400">
              {t.detailModal.contentBodyTitle}
            </span>
            <div className="whitespace-pre-wrap font-sans text-xs text-slate-200 leading-relaxed max-h-64 overflow-y-auto p-2 bg-[#050811] rounded-lg border border-slate-800">
              {item.fullBody || item.summary}
            </div>
          </div>

          {/* Tags */}
          {item.tags && item.tags.length > 0 && (
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-xs text-slate-400 mr-1">Tags:</span>
              {item.tags.map((tag) => (
                <span
                  key={tag}
                  className="rounded-md border border-slate-700 bg-slate-800 px-2 py-0.5 font-mono text-[11px] text-cyan-300"
                >
                  #{tag}
                </span>
              ))}
            </div>
          )}

          {/* Read-only Moderation History */}
          <div className="rounded-xl border border-slate-800/80 bg-[#070b14] p-4 text-xs space-y-2">
            <span className="font-mono text-[11px] font-bold uppercase tracking-wider text-slate-300">
              {t.detailModal.historyTitle}
            </span>
            {item.rejectionReason && (
              <div className="rounded-lg border border-rose-500/30 bg-rose-500/10 p-2.5 text-slate-200">
                <strong>Motivo atual:</strong> &ldquo;{item.rejectionReason}&rdquo;
              </div>
            )}
            {item.moderationHistory && item.moderationHistory.length > 0 ? (
              <ul className="space-y-2">
                {item.moderationHistory.map((h) => (
                  <li
                    key={h.id}
                    className="rounded-lg border border-slate-800 bg-[#050811] p-2.5 space-y-1"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2 text-[11px]">
                      <span className="font-mono text-cyan-300">
                        {t.actionLabels[h.action] || h.action} ({h.fromStatus} →{" "}
                        {h.toStatus})
                      </span>
                      <span className="font-mono text-slate-400">
                        @{h.actorUsername} · {formatDate(h.timestamp)}
                      </span>
                    </div>
                    {h.reason && (
                      <p className="text-slate-300 italic">&ldquo;{h.reason}&rdquo;</p>
                    )}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-slate-400">{t.detailModal.noHistory}</p>
            )}
          </div>

          {item.contentType === "research" && researchTlp && (
            <div className="rounded-xl border border-cyan-500/20 bg-cyan-950/10 p-4 space-y-3">
              <div className="flex items-center justify-between gap-2">
                <span className="font-mono text-xs font-semibold text-cyan-300">
                  TLP:{researchTlp}
                </span>
                {recipients.length > 0 && (
                  <span className="font-mono text-[11px] text-slate-400">
                    {recipients.length} {isPt ? "destinatário(s)" : "recipient(s)"}
                  </span>
                )}
              </div>

              {recipients.length > 0 && (
                <ul className="space-y-1.5">
                  {recipients.map((rec) => (
                    <li
                      key={rec.userId}
                      className="flex items-center justify-between gap-2 rounded-lg border border-slate-800 bg-[#050811] px-3 py-2 text-xs"
                    >
                      <div>
                        <span className="font-mono text-slate-200">@{rec.username}</span>
                        {rec.justification && (
                          <p className="text-[11px] text-slate-400">{rec.justification}</p>
                        )}
                      </div>
                      {canManageRecipients && (
                        <button
                          type="button"
                          disabled={recipientBusy}
                          onClick={async () => {
                            setRecipientBusy(true);
                            setRecipientFeedback(null);
                            const res = await researchService.revokeRecipient(item.id, rec.userId);
                            setRecipientBusy(false);
                            if (!res.success) {
                              setRecipientFeedback(res.error ?? "Failed to revoke access.");
                              return;
                            }
                            setLoadedRecipients((prev) => prev.filter((p) => p.userId !== rec.userId));
                          }}
                          className="rounded-lg border border-rose-500/40 px-2 py-1 text-[11px] text-rose-300 hover:bg-rose-500/15"
                        >
                          {isPt ? "Revogar" : "Revoke"}
                        </button>
                      )}
                    </li>
                  ))}
                </ul>
              )}

              {canManageRecipients && (
                <div className="grid gap-2 sm:grid-cols-[1fr_1fr_auto]">
                  <input
                    type="text"
                    value={recipientUserId}
                    onChange={(e) => setRecipientUserId(e.target.value)}
                    placeholder={isPt ? "UUID do usuário destinatário" : "Recipient user UUID"}
                    className="rounded-lg border border-slate-700 bg-[#050811] px-3 py-1.5 font-mono text-xs text-slate-200"
                  />
                  <input
                    type="text"
                    value={recipientJustification}
                    onChange={(e) => setRecipientJustification(e.target.value)}
                    placeholder={
                      researchTlp === "AMBER+" || researchTlp === "RED"
                        ? isPt
                          ? "Justificativa obrigatória (min. 5 chars)"
                          : "Required justification (min 5 chars)"
                        : isPt
                          ? "Justificativa (opcional)"
                          : "Justification (optional)"
                    }
                    className="rounded-lg border border-slate-700 bg-[#050811] px-3 py-1.5 text-xs text-slate-200"
                  />
                  <button
                    type="button"
                    disabled={recipientBusy || !recipientUserId.trim()}
                    onClick={async () => {
                      setRecipientBusy(true);
                      setRecipientFeedback(null);
                      const res = await researchService.grantRecipient(
                        item.id,
                        recipientUserId.trim(),
                        recipientJustification.trim() || null
                      );
                      setRecipientBusy(false);
                      if (!res.success) {
                        setRecipientFeedback(res.error ?? "Failed to grant recipient.");
                        return;
                      }
                      setRecipientUserId("");
                      setRecipientJustification("");
                      const detail = await researchService.getSubmissionDetail(item.id);
                      if (detail.success && detail.data) {
                        setLoadedRecipients(
                          detail.data.recipients.map((r) => ({
                            userId: r.userId,
                            username: r.username,
                            justification: r.justification,
                          }))
                        );
                      }
                    }}
                    className="rounded-lg border border-cyan-500/40 bg-cyan-500/15 px-3 py-1.5 text-xs font-semibold text-cyan-200 hover:bg-cyan-500/25 disabled:opacity-50"
                  >
                    {isPt ? "Conceder" : "Grant"}
                  </button>
                </div>
              )}
              {recipientFeedback && (
                <p className="text-xs text-rose-300">{recipientFeedback}</p>
              )}
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-slate-800 pt-4">
          <div className="flex flex-wrap items-center gap-2">
            {canModerate &&
              availableActions.map((act) => {
                const cfg = actionButtonConfig[act];
                if (!cfg) return null;
                return (
                  <button
                    key={act}
                    type="button"
                    onClick={() => {
                      onClose();
                      onOpenDecision(item, act);
                    }}
                    className={`rounded-xl border px-3.5 py-2 text-xs font-semibold transition-colors ${cfg.style}`}
                  >
                    {cfg.label}
                  </button>
                );
              })}
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-slate-700 bg-slate-800 px-4 py-2 text-xs font-medium text-slate-200 hover:bg-slate-700 hover:text-white transition-colors"
          >
            {t.detailModal.closeBtn}
          </button>
        </div>
      </div>
    </div>
  );
}
