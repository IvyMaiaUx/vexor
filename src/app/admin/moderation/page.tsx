"use client";

import React, { Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { AdminGuard } from "@/features/admin/components/admin-guard";
import { AdminModerationDecisionModal } from "@/features/admin/components/admin-moderation-decision-modal";
import { AdminModerationDetailModal } from "@/features/admin/components/admin-moderation-detail-modal";
import { AdminReportModal } from "@/features/admin/components/admin-report-modal";
import { adminDataProvider } from "@/features/admin/services/admin-provider";
import type {
  AdminReport,
  ModerationAction,
  ModerationContentType,
  ModerationPriority,
  UnifiedModerationItem,
} from "@/features/admin/types";
import { useAuthStore } from "@/features/auth/use-auth-store";
import { useI18n } from "@/lib/i18n/context";

function formatShortDate(iso: string, locale: string): string {
  try {
    return new Intl.DateTimeFormat(locale, {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

function AdminModerationContent() {
  const { dict, locale } = useI18n();
  const isPt = locale === "pt-BR";
  const searchParams = useSearchParams();
  const user = useAuthStore((s) => s.user);
  const isModerator = useAuthStore((s) => s.isModerator);
  const isAdmin = useAuthStore((s) => s.isAdmin);
  const canModerate = isModerator || isAdmin;
  const t = dict.adminPanel.moderationPage;
  const rt = dict.adminPanel.reportsPage;

  const [activeTab, setActiveTab] = useState<"queue" | "reports">("queue");
  const [items, setItems] = useState<UnifiedModerationItem[]>([]);
  const [reports, setReports] = useState<AdminReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  const urlType = searchParams?.get("type");
  const initialType: ModerationContentType | "all" =
    urlType && ["resource", "topic", "post", "research"].includes(urlType)
      ? (urlType as ModerationContentType)
      : "all";

  // Applied filters
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<ModerationContentType | "all">(
    initialType
  );
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [priorityFilter, setPriorityFilter] = useState<
    ModerationPriority | "all"
  >("all");
  const [hasReportsFilter, setHasReportsFilter] = useState<"all" | "yes" | "no">(
    "all"
  );
  const [periodFilter, setPeriodFilter] = useState<
    "all" | "24h" | "7d" | "30d"
  >("all");
  const [authorFilter, setAuthorFilter] = useState("");

  // Filter bottom sheet draft states
  const [filterSheetOpen, setFilterSheetOpen] = useState(false);
  const [draftStatus, setDraftStatus] = useState<string>("all");
  const [draftPriority, setDraftPriority] = useState<ModerationPriority | "all">("all");
  const [draftReports, setDraftReports] = useState<"all" | "yes" | "no">("all");
  const [draftPeriod, setDraftPeriod] = useState<"all" | "24h" | "7d" | "30d">("all");
  const [draftAuthor, setDraftAuthor] = useState("");

  // Bulk selection state
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [bulkAction, setBulkAction] = useState<"hide" | "approve" | null>(null);
  const [bulkReason, setBulkReason] = useState("");
  const [bulkSubmitting, setBulkSubmitting] = useState(false);

  // Modals
  const [detailItem, setDetailItem] = useState<UnifiedModerationItem | null>(
    null
  );
  const [decisionModalState, setDecisionModalState] = useState<{
    item: UnifiedModerationItem;
    mode: ModerationAction;
  } | null>(null);
  const [selectedReport, setSelectedReport] = useState<AdminReport | null>(
    null
  );

  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    Promise.all([
      adminDataProvider.moderation.listQueue(
        {
          contentType: typeFilter,
          status: statusFilter,
          priority: priorityFilter,
          author: authorFilter,
          hasReports: hasReportsFilter,
          period: periodFilter,
          query: searchQuery,
        },
        { page: 1, pageSize: 100 }
      ),
      adminDataProvider.reports.listReports({}, { page: 1, pageSize: 100 }),
    ])
      .then(([queueRes, reportsRes]) => {
        if (!active) return;
        setItems(queueRes.items);
        setReports(reportsRes.items);
        setLoadError(null);
        setLoading(false);
      })
      .catch(() => {
        if (!active) return;
        setLoadError(t.loadError);
        setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [
    typeFilter,
    statusFilter,
    priorityFilter,
    authorFilter,
    hasReportsFilter,
    periodFilter,
    searchQuery,
    t.loadError,
    reloadKey,
  ]);

  useEffect(() => {
    if (!filterSheetOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setFilterSheetOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [filterSheetOpen]);

  const counts = useMemo(
    () => ({
      total: items.length,
      pending: items.filter((it) => it.status === "pending").length,
      reported: items.filter((it) => (it.reportCount ?? 0) > 0).length,
      openReports: reports.filter(
        (r) => r.status === "open" || r.status === "reviewing"
      ).length,
    }),
    [items, reports]
  );

  const hasSheetFilters =
    statusFilter !== "all" ||
    priorityFilter !== "all" ||
    hasReportsFilter !== "all" ||
    periodFilter !== "all" ||
    authorFilter.trim().length > 0;

  const openFilterSheet = () => {
    setDraftStatus(statusFilter);
    setDraftPriority(priorityFilter);
    setDraftReports(hasReportsFilter);
    setDraftPeriod(periodFilter);
    setDraftAuthor(authorFilter);
    setFilterSheetOpen(true);
  };

  const applyFilterSheet = () => {
    setStatusFilter(draftStatus);
    setPriorityFilter(draftPriority);
    setHasReportsFilter(draftReports);
    setPeriodFilter(draftPeriod);
    setAuthorFilter(draftAuthor.trim().replace(/^@/, ""));
    setFilterSheetOpen(false);
  };

  const clearSheetFilters = () => {
    setDraftStatus("all");
    setDraftPriority("all");
    setDraftReports("all");
    setDraftPeriod("all");
    setDraftAuthor("");
  };

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const handleExecuteDecision = async (
    targetItem: UnifiedModerationItem,
    mode: ModerationAction,
    reason?: string
  ): Promise<{ success: boolean; error?: string }> => {
    if (!user || !canModerate) {
      return { success: false, error: t.unauthorizedError };
    }

    setActionError(null);
    const res = await adminDataProvider.moderation.executeAction(
      user,
      { id: targetItem.id, contentType: targetItem.contentType },
      mode,
      reason
    );

    if (res.success) {
      const actionLabel = t.actionLabels[mode] || mode;
      setFeedbackMessage(`${actionLabel}: "${targetItem.title}"`);
      setSelectedIds((prev) => prev.filter((id) => id !== targetItem.id));
      setReloadKey((prev) => prev + 1);
      setTimeout(() => setFeedbackMessage(null), 4500);
      return { success: true };
    }

    const msg =
      res.statusCode === 409
        ? t.conflictError
        : res.statusCode === 403
          ? t.unauthorizedError
          : res.error || t.decisionModal.generalError;
    setActionError(msg);
    return { success: false, error: msg };
  };

  const handleRunBulkAction = async () => {
    if (!user || !canModerate || !bulkAction || selectedIds.length === 0) return;
    const trimmedReason = bulkReason.trim();
    if (bulkAction === "hide" && trimmedReason.length < 5) {
      setActionError(
        isPt
          ? "Informe um motivo com pelo menos 5 caracteres."
          : "Provide a reason with at least 5 characters."
      );
      return;
    }

    setBulkSubmitting(true);
    setActionError(null);
    const selectedItems = items.filter((it) => selectedIds.includes(it.id));
    let successCount = 0;
    let firstError: string | null = null;

    for (const item of selectedItems) {
      const mode: ModerationAction =
        bulkAction === "approve"
          ? "approve"
          : item.contentType === "resource" || item.contentType === "research"
            ? "reject"
            : "hide";
      const res = await adminDataProvider.moderation.executeAction(
        user,
        { id: item.id, contentType: item.contentType },
        mode,
        bulkAction === "hide" ? trimmedReason : undefined
      );
      if (res.success) {
        successCount += 1;
      } else if (!firstError) {
        firstError = res.error || t.decisionModal.generalError;
      }
    }

    setBulkSubmitting(false);
    setBulkAction(null);
    setBulkReason("");
    setSelectedIds([]);
    setReloadKey((prev) => prev + 1);

    if (successCount > 0) {
      setFeedbackMessage(
        isPt
          ? `${successCount} item(ns) atualizado(s) e registrado(s) na auditoria.`
          : `${successCount} item(s) updated and logged to audit.`
      );
      setTimeout(() => setFeedbackMessage(null), 4500);
    }
    if (firstError) {
      setActionError(firstError);
    }
  };

  const statusBadgeClass = (status: string) => {
    if (status === "approved" || status === "published") {
      return "border-emerald-500/40 bg-emerald-500/10 text-emerald-400";
    }
    if (status === "pending") {
      return "border-amber-500/40 bg-amber-500/10 text-amber-300";
    }
    if (status === "rejected" || status === "hidden" || status === "removed") {
      return "border-rose-500/40 bg-rose-500/10 text-rose-300";
    }
    return "border-slate-700 bg-slate-800/80 text-slate-300";
  };

  const statusLabel = (status: string) => {
    const mapPt: Record<string, string> = {
      pending: "PENDENTE",
      published: "PUBLICADO",
      approved: "APROVADO",
      hidden: "OCULTO",
      rejected: "REJEITADO",
      removed: "REMOVIDO",
      revision_requested: "REVISÃO",
    };
    return isPt ? mapPt[status] || status.toUpperCase() : status.toUpperCase();
  };

  const typeLabel = (type: ModerationContentType) => {
    if (type === "topic") return isPt ? "Tópico do Fórum" : "Forum Topic";
    if (type === "post") return isPt ? "Resposta" : "Reply";
    if (type === "resource") return isPt ? "Catálogo" : "Catalog";
    return "Research";
  };

  const secondaryActionFor = (
    item: UnifiedModerationItem
  ): { mode: ModerationAction; label: string } => {
    if (
      item.status === "pending" ||
      item.contentType === "resource" ||
      item.contentType === "research"
    ) {
      return { mode: "reject", label: isPt ? "Rejeitar" : "Reject" };
    }
    return { mode: "hide", label: isPt ? "Ocultar" : "Hide" };
  };

  return (
    <AdminGuard>
      <div className="space-y-3 pb-16">
        {/* Header */}
        <div>
          <h1 className="text-[26px] font-bold leading-tight tracking-tight text-slate-100">
            {isPt ? "Moderação" : "Moderation"}
          </h1>
          <p className="mt-0.5 text-sm text-slate-400">
            {isPt
              ? `${counts.total} na fila · ${counts.pending} pendentes · ${counts.reported} com denúncias`
              : `${counts.total} in queue · ${counts.pending} pending · ${counts.reported} reported`}
          </p>
        </div>

        {/* Feedback / Error banners */}
        {feedbackMessage && (
          <div
            role="status"
            className="flex items-center justify-between gap-2 rounded-xl border border-emerald-500/40 bg-emerald-500/10 px-3.5 py-2.5 text-xs text-emerald-300"
          >
            <span>{feedbackMessage}</span>
            <button
              type="button"
              onClick={() => setFeedbackMessage(null)}
              className="px-1.5 text-slate-400 hover:text-white"
            >
              ✕
            </button>
          </div>
        )}
        {actionError && (
          <div
            role="alert"
            className="flex items-center justify-between gap-2 rounded-xl border border-rose-500/40 bg-rose-500/10 px-3.5 py-2.5 text-xs text-rose-200"
          >
            <span>{actionError}</span>
            <button
              type="button"
              onClick={() => setActionError(null)}
              className="px-1.5 text-slate-400 hover:text-white"
            >
              ✕
            </button>
          </div>
        )}

        {/* Primary Tabs: Fila / Denúncias */}
        <div className="flex gap-2" role="tablist">
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === "queue"}
            onClick={() => setActiveTab("queue")}
            className={`inline-flex min-h-[44px] items-center gap-1.5 rounded-full border px-4 text-sm font-medium transition-colors ${
              activeTab === "queue"
                ? "border-cyan-500/50 bg-cyan-500/15 text-cyan-300"
                : "border-slate-800 bg-[#0b1220] text-slate-300 hover:border-slate-700"
            }`}
          >
            <span>{isPt ? "Fila" : "Queue"}</span>
            <span className="font-mono text-xs">{counts.total}</span>
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={activeTab === "reports"}
            onClick={() => setActiveTab("reports")}
            className={`inline-flex min-h-[44px] items-center gap-1.5 rounded-full border px-4 text-sm font-medium transition-colors ${
              activeTab === "reports"
                ? "border-cyan-500/50 bg-cyan-500/15 text-cyan-300"
                : "border-slate-800 bg-[#0b1220] text-slate-300 hover:border-slate-700"
            }`}
          >
            <span>{isPt ? "Denúncias" : "Reports"}</span>
            <span className="font-mono text-xs">{counts.openReports}</span>
          </button>
        </div>

        {activeTab === "queue" ? (
          <>
            {/* Search + Filter Bottom Sheet Trigger */}
            <div className="flex gap-2">
              <label className="flex min-h-[48px] flex-1 items-center gap-2 rounded-xl border border-slate-800 bg-[#0b1220] px-3 text-slate-400 focus-within:border-cyan-500/60">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className="h-[18px] w-[18px] shrink-0" aria-hidden="true">
                  <circle cx="11" cy="11" r="7" />
                  <path d="M21 21l-4.3-4.3" />
                </svg>
                <input
                  type="search"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={
                    isPt
                      ? "Buscar por título, autor ou ID"
                      : "Search by title, author, or ID"
                  }
                  aria-label={isPt ? "Buscar" : "Search"}
                  className="w-full min-w-0 bg-transparent text-[15px] text-slate-100 placeholder:text-slate-500 focus:outline-none"
                />
              </label>

              <button
                type="button"
                onClick={openFilterSheet}
                aria-label={isPt ? "Filtros" : "Filters"}
                className="relative inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-slate-800 bg-[#0b1220] text-slate-200 transition-colors hover:border-cyan-500/50 hover:text-cyan-300"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className="h-[22px] w-[22px]" aria-hidden="true">
                  <path d="M3 5h18M6 12h12M10 19h4" />
                </svg>
                {hasSheetFilters && (
                  <span
                    aria-hidden="true"
                    className="absolute right-2.5 top-2.5 h-2 w-2 rounded-full bg-cyan-400"
                  />
                )}
              </button>
            </div>

            {/* Type Chips */}
            <div className="no-scrollbar -mx-4 flex gap-1.5 overflow-x-auto px-4 sm:mx-0 sm:px-0">
              {(
                [
                  { id: "all", pt: "Todos", en: "All" },
                  { id: "resource", pt: "Catálogo", en: "Catalog" },
                  { id: "topic", pt: "Fórum", en: "Forum" },
                  { id: "post", pt: "Respostas", en: "Replies" },
                  { id: "research", pt: "Research", en: "Research" },
                ] as const
              ).map((chip) => {
                const active = typeFilter === chip.id;
                return (
                  <button
                    key={chip.id}
                    type="button"
                    onClick={() => setTypeFilter(chip.id)}
                    className={`inline-flex min-h-[40px] shrink-0 items-center rounded-full border px-3.5 text-sm font-medium transition-colors ${
                      active
                        ? "border-cyan-500/50 bg-cyan-500/15 text-cyan-300"
                        : "border-slate-800 bg-[#0b1220] text-slate-300 hover:border-slate-700"
                    }`}
                  >
                    {isPt ? chip.pt : chip.en}
                  </button>
                );
              })}
            </div>

            {/* Compact Queue Cards */}
            {loading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <div
                    key={i}
                    className="h-32 animate-pulse rounded-2xl border border-slate-800 bg-[#0b1220]/70"
                  />
                ))}
              </div>
            ) : loadError ? (
              <div className="rounded-2xl border border-rose-500/40 bg-rose-500/10 p-6 text-center">
                <p className="text-sm text-rose-200">{loadError}</p>
                <button
                  type="button"
                  onClick={() => setReloadKey((k) => k + 1)}
                  className="mt-3 inline-flex min-h-[44px] items-center rounded-xl bg-rose-500/20 px-4 text-xs font-semibold text-rose-200"
                >
                  {isPt ? "Tentar novamente" : "Retry"}
                </button>
              </div>
            ) : items.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-800 bg-[#0b1220]/50 p-10 text-center text-sm text-slate-400">
                {isPt
                  ? "Nenhum item encontrado para os filtros selecionados."
                  : "No items found for the selected filters."}
              </div>
            ) : (
              <div className="space-y-3">
                {items.map((item) => {
                  const selected = selectedIds.includes(item.id);
                  const secondary = secondaryActionFor(item);
                  return (
                    <article
                      key={`${item.contentType}-${item.id}`}
                      className={`rounded-2xl border p-3.5 transition-colors space-y-2 ${
                        selected
                          ? "border-cyan-500/60 bg-cyan-950/20"
                          : "border-slate-800 bg-[#0b1220]"
                      }`}
                    >
                      <div className="flex items-start gap-2.5">
                        <input
                          type="checkbox"
                          checked={selected}
                          onChange={() => toggleSelect(item.id)}
                          aria-label={isPt ? "Selecionar item" : "Select item"}
                          className="mt-0.5 h-[22px] w-[22px] shrink-0 accent-cyan-400"
                        />
                        <div className="min-w-0 flex-1">
                          <div className="font-mono text-[11px] font-semibold text-cyan-400">
                            {typeLabel(item.contentType)}
                          </div>
                          <h3 className="mt-0.5 text-[15px] font-semibold leading-snug text-slate-100">
                            {item.title}
                          </h3>
                        </div>
                        <span
                          className={`inline-flex h-[22px] shrink-0 items-center rounded-md border px-2 font-mono text-[10px] font-semibold ${statusBadgeClass(item.status)}`}
                        >
                          {statusLabel(item.status)}
                        </span>
                      </div>

                      <div className="pl-8 text-xs text-slate-400">
                        @{item.authorUsername} · {item.reportCount ?? 0}{" "}
                        {isPt ? "denúncias" : "reports"} ·{" "}
                        {formatShortDate(item.submittedAt, locale)}
                      </div>

                      <div className="flex gap-2 pl-8">
                        <button
                          type="button"
                          onClick={() => setDetailItem(item)}
                          className="inline-flex min-h-[44px] flex-1 items-center justify-center rounded-xl border border-slate-800 bg-[#080e1a] px-3 text-sm font-medium text-slate-100 transition-colors hover:border-cyan-500/40 hover:text-cyan-300"
                        >
                          {isPt ? "Analisar" : "Review"}
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            setDecisionModalState({ item, mode: secondary.mode })
                          }
                          className="inline-flex min-h-[44px] flex-1 items-center justify-center rounded-xl border border-rose-500/35 bg-rose-500/10 px-3 text-sm font-semibold text-rose-300 transition-colors hover:bg-rose-500/20"
                        >
                          {secondary.label}
                        </button>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </>
        ) : (
          /* Reports Sub-tab */
          <div className="space-y-3">
            {reports.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-800 bg-[#0b1220]/50 p-10 text-center text-sm text-slate-400">
                {isPt ? "Nenhuma denúncia registrada." : "No reports found."}
              </div>
            ) : (
              reports.map((report) => (
                <article
                  key={report.id}
                  className="rounded-2xl border border-slate-800 bg-[#0b1220] p-4 space-y-2.5"
                >
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="inline-flex h-[22px] items-center rounded-md border border-rose-500/40 bg-rose-500/10 px-2 font-mono text-[10px] font-semibold uppercase text-rose-300">
                      {rt.reasonLabels[report.reason]}
                    </span>
                    <span className="inline-flex h-[22px] items-center rounded-md border border-slate-700 bg-slate-800/80 px-2 font-mono text-[10px] font-semibold uppercase text-slate-300">
                      {rt.targetLabels[report.targetType]}
                    </span>
                  </div>
                  <p className="border-l-2 border-slate-700 pl-3 text-sm text-slate-200 line-clamp-3">
                    {report.targetSnippet ||
                      report.targetTitle ||
                      report.details ||
                      "—"}
                  </p>
                  <div className="text-xs text-slate-400">
                    {isPt
                      ? "Denunciante: identidade oculta"
                      : "Reporter: identity hidden"}{" "}
                    · {formatShortDate(report.createdAt, locale)}
                  </div>
                  <button
                    type="button"
                    onClick={() => setSelectedReport(report)}
                    className="inline-flex min-h-[44px] w-full items-center justify-center rounded-xl border border-slate-700 bg-[#080e1a] text-sm font-medium text-slate-100 hover:border-cyan-500/40"
                  >
                    {isPt ? "Analisar denúncia" : "Review report"}
                  </button>
                </article>
              ))
            )}
          </div>
        )}

        {/* Fixed Bulk Selection Bar */}
        {selectedIds.length > 0 && activeTab === "queue" && (
          <div className="fixed inset-x-0 bottom-[72px] z-30 flex items-center gap-2 border-t border-slate-800 bg-[#080e1a]/95 px-4 py-2.5 backdrop-blur-md lg:bottom-0 lg:left-64">
            <span className="flex-1 text-sm text-slate-200">
              <strong className="font-semibold text-white">
                {selectedIds.length}
              </strong>{" "}
              {isPt ? "selecionados" : "selected"}
            </span>
            <button
              type="button"
              disabled={bulkSubmitting}
              onClick={() => setBulkAction("hide")}
              className="inline-flex min-h-[44px] items-center justify-center rounded-xl border border-rose-500/35 bg-rose-500/10 px-4 text-sm font-semibold text-rose-300 hover:bg-rose-500/20 disabled:opacity-50"
            >
              {isPt ? "Ocultar" : "Hide"}
            </button>
            <button
              type="button"
              disabled={bulkSubmitting}
              onClick={() => {
                setBulkAction("approve");
              }}
              className="inline-flex min-h-[44px] items-center justify-center rounded-xl bg-cyan-500 px-4 text-sm font-bold text-slate-950 hover:bg-cyan-400 disabled:opacity-50"
            >
              {isPt ? "Aprovar" : "Approve"}
            </button>
          </div>
        )}

        {/* Bulk Confirm / Reason Sheet */}
        {bulkAction && (
          <div
            role="dialog"
            aria-modal="true"
            className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 backdrop-blur-sm sm:items-center sm:p-4"
            onClick={() => !bulkSubmitting && setBulkAction(null)}
          >
            <div
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-md rounded-t-3xl border border-slate-800 bg-[#0b1220] p-5 space-y-4 sm:rounded-3xl"
            >
              <h2 className="text-lg font-semibold text-slate-100">
                {bulkAction === "hide"
                  ? isPt
                    ? `Ocultar ${selectedIds.length} item(ns)?`
                    : `Hide ${selectedIds.length} item(s)?`
                  : isPt
                    ? `Aprovar ${selectedIds.length} item(ns)?`
                    : `Approve ${selectedIds.length} item(s)?`}
              </h2>
              {bulkAction === "hide" && (
                <label className="block text-sm text-slate-300">
                  <span>{isPt ? "Motivo (obrigatório)" : "Reason (required)"}</span>
                  <textarea
                    rows={3}
                    value={bulkReason}
                    onChange={(e) => setBulkReason(e.target.value)}
                    placeholder={
                      isPt
                        ? "Descreva o motivo desta ação para a auditoria..."
                        : "Describe the reason for this action..."
                    }
                    className="mt-1.5 w-full rounded-xl border border-slate-800 bg-[#070b14] p-3 text-sm text-slate-100 focus:border-cyan-500 focus:outline-none"
                  />
                </label>
              )}
              <div className="flex gap-2">
                <button
                  type="button"
                  disabled={bulkSubmitting}
                  onClick={() => setBulkAction(null)}
                  className="inline-flex min-h-[44px] flex-1 items-center justify-center rounded-xl border border-slate-700 bg-[#070b14] text-sm font-semibold text-slate-200"
                >
                  {isPt ? "Cancelar" : "Cancel"}
                </button>
                <button
                  type="button"
                  disabled={bulkSubmitting}
                  onClick={() => void handleRunBulkAction()}
                  className={`inline-flex min-h-[44px] flex-1 items-center justify-center rounded-xl text-sm font-bold disabled:opacity-50 ${
                    bulkAction === "hide"
                      ? "border border-rose-500/35 bg-rose-500/10 text-rose-300 hover:bg-rose-500/20"
                      : "bg-cyan-500 text-slate-950 hover:bg-cyan-400"
                  }`}
                >
                  {bulkSubmitting
                    ? "..."
                    : bulkAction === "hide"
                      ? isPt
                        ? "Confirmar"
                        : "Confirm"
                      : isPt
                        ? "Aprovar"
                        : "Approve"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Filter Bottom Sheet */}
        {filterSheetOpen && (
          <div
            role="dialog"
            aria-modal="true"
            aria-label={isPt ? "Filtros de moderação" : "Moderation filters"}
            className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 backdrop-blur-sm sm:items-center sm:p-4"
            onClick={() => setFilterSheetOpen(false)}
          >
            <div
              onClick={(e) => e.stopPropagation()}
              className="max-h-[85vh] w-full max-w-md overflow-y-auto rounded-t-3xl border border-slate-800 bg-[#0b1220] px-5 pb-6 pt-3 shadow-2xl sm:rounded-3xl sm:p-6"
            >
              <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-slate-700 sm:hidden" />
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-slate-100">
                  {isPt ? "Filtros" : "Filters"}
                </h2>
                <button
                  type="button"
                  onClick={clearSheetFilters}
                  className="min-h-[44px] px-2 text-sm text-slate-400 hover:text-slate-200"
                >
                  {isPt ? "Limpar tudo" : "Clear all"}
                </button>
              </div>

              <div className="mt-4 space-y-4">
                <div>
                  <p className="mb-2 font-mono text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                    {isPt ? "Situação" : "Status"}
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {[
                      { id: "all", pt: "Todas", en: "All" },
                      { id: "pending", pt: "Pendente", en: "Pending" },
                      { id: "published", pt: "Publicado", en: "Published" },
                      { id: "hidden", pt: "Oculto", en: "Hidden" },
                      { id: "rejected", pt: "Rejeitado", en: "Rejected" },
                    ].map((opt) => (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => setDraftStatus(opt.id)}
                        className={`min-h-[40px] rounded-full border px-3.5 text-sm ${
                          draftStatus === opt.id
                            ? "border-cyan-500/50 bg-cyan-500/15 text-cyan-300"
                            : "border-slate-800 bg-[#080e1a] text-slate-300"
                        }`}
                      >
                        {isPt ? opt.pt : opt.en}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <p className="mb-2 font-mono text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                    {isPt ? "Prioridade" : "Priority"}
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {(
                      [
                        { id: "all", pt: "Todas", en: "All" },
                        { id: "high", pt: "Alta", en: "High" },
                        { id: "medium", pt: "Média", en: "Medium" },
                        { id: "low", pt: "Baixa", en: "Low" },
                      ] as const
                    ).map((opt) => (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => setDraftPriority(opt.id)}
                        className={`min-h-[40px] rounded-full border px-3.5 text-sm ${
                          draftPriority === opt.id
                            ? "border-cyan-500/50 bg-cyan-500/15 text-cyan-300"
                            : "border-slate-800 bg-[#080e1a] text-slate-300"
                        }`}
                      >
                        {isPt ? opt.pt : opt.en}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <p className="mb-2 font-mono text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                    {isPt ? "Denúncias" : "Reports"}
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {(
                      [
                        { id: "all", pt: "Todas", en: "All" },
                        { id: "yes", pt: "Com denúncias", en: "With reports" },
                        { id: "no", pt: "Sem denúncias", en: "No reports" },
                      ] as const
                    ).map((opt) => (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => setDraftReports(opt.id)}
                        className={`min-h-[40px] rounded-full border px-3.5 text-sm ${
                          draftReports === opt.id
                            ? "border-cyan-500/50 bg-cyan-500/15 text-cyan-300"
                            : "border-slate-800 bg-[#080e1a] text-slate-300"
                        }`}
                      >
                        {isPt ? opt.pt : opt.en}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <p className="mb-2 font-mono text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                    {isPt ? "Período" : "Period"}
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {(
                      [
                        { id: "all", pt: "Todo o período", en: "All time" },
                        { id: "24h", pt: "Hoje", en: "Today" },
                        { id: "7d", pt: "7 dias", en: "7 days" },
                        { id: "30d", pt: "30 dias", en: "30 days" },
                      ] as const
                    ).map((opt) => (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => setDraftPeriod(opt.id)}
                        className={`min-h-[40px] rounded-full border px-3.5 text-sm ${
                          draftPeriod === opt.id
                            ? "border-cyan-500/50 bg-cyan-500/15 text-cyan-300"
                            : "border-slate-800 bg-[#080e1a] text-slate-300"
                        }`}
                      >
                        {isPt ? opt.pt : opt.en}
                      </button>
                    ))}
                  </div>
                </div>

                <label className="block text-sm text-slate-200">
                  <span>{isPt ? "Autor" : "Author"}</span>
                  <input
                    type="text"
                    value={draftAuthor}
                    onChange={(e) => setDraftAuthor(e.target.value)}
                    placeholder={isPt ? "@usuário" : "@username"}
                    className="mt-1.5 min-h-[48px] w-full rounded-xl border border-slate-800 bg-[#080e1a] px-3 text-[15px] text-slate-100 placeholder:text-slate-500 focus:border-cyan-500 focus:outline-none"
                  />
                </label>

                <button
                  type="button"
                  onClick={applyFilterSheet}
                  className="inline-flex min-h-[48px] w-full items-center justify-center rounded-xl bg-cyan-500 text-sm font-bold text-slate-950 hover:bg-cyan-400"
                >
                  {isPt ? "Aplicar filtros" : "Apply filters"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Existing Modals */}
        {detailItem && (
          <AdminModerationDetailModal
            item={detailItem}
            onClose={() => setDetailItem(null)}
            onOpenDecision={(target, mode) => {
              setDetailItem(null);
              setDecisionModalState({ item: target, mode });
            }}
          />
        )}

        {decisionModalState && (
          <AdminModerationDecisionModal
            item={decisionModalState.item}
            mode={decisionModalState.mode}
            onClose={() => setDecisionModalState(null)}
            onConfirm={async (item, mode, reason) => {
              const result = await handleExecuteDecision(item, mode, reason);
              if (result.success) {
                setDecisionModalState(null);
              }
              return result;
            }}
          />
        )}

        {selectedReport && (
          <AdminReportModal
            report={selectedReport}
            onClose={() => setSelectedReport(null)}
            onSuccess={() => {
              setSelectedReport(null);
              setReloadKey((k) => k + 1);
            }}
          />
        )}
      </div>
    </AdminGuard>
  );
}

export default function AdminModerationPage() {
  return (
    <Suspense fallback={<div className="h-48 animate-pulse rounded-2xl bg-[#0b1220]" />}>
      <AdminModerationContent />
    </Suspense>
  );
}
