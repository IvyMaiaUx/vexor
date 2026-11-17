"use client";

import React, { useEffect, useState, useMemo, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { AdminGuard } from "@/features/admin/components/admin-guard";
import { AdminModerationDetailModal } from "@/features/admin/components/admin-moderation-detail-modal";
import { AdminModerationDecisionModal } from "@/features/admin/components/admin-moderation-decision-modal";
import { AdminReportModal } from "@/features/admin/components/admin-report-modal";
import { adminDataProvider } from "@/features/admin/services/admin-provider";
import { getModerationAvailableActions } from "@/features/admin/services/moderation-service";
import type {
  AdminReport,
  ModerationAction,
  ModerationContentType,
  ModerationPriority,
  ReportStatus,
  UnifiedModerationItem,
} from "@/features/admin/types";
import { useAuthStore } from "@/features/auth/use-auth-store";
import { useI18n } from "@/lib/i18n/context";

function AdminModerationContent() {
  const { dict, locale } = useI18n();
  const searchParams = useSearchParams();
  const user = useAuthStore((s) => s.user);
  const isModerator = useAuthStore((s) => s.isModerator);
  const isAdmin = useAuthStore((s) => s.isAdmin);

  const t = dict.adminPanel.moderationPage;
  const rt = dict.adminPanel.reportsPage;
  const isPt = locale === "pt-BR";
  const canModerate = isModerator || isAdmin;

  // Tabs
  const [activeTab, setActiveTab] = useState<"queue" | "reports">("queue");

  // Data state
  const [items, setItems] = useState<UnifiedModerationItem[]>([]);
  const [reports, setReports] = useState<AdminReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  // Queue filters
  const urlType = searchParams?.get("type");
  const initialType: ModerationContentType | "all" =
    urlType && ["resource", "topic", "post", "research"].includes(urlType)
      ? (urlType as ModerationContentType)
      : "all";

  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<ModerationContentType | "all">(
    initialType
  );
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [priorityFilter, setPriorityFilter] = useState<
    ModerationPriority | "all"
  >("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [authorFilter, setAuthorFilter] = useState<string>("");
  const [hasReportsFilter, setHasReportsFilter] = useState<"all" | "yes" | "no">(
    "all"
  );
  const [periodFilter, setPeriodFilter] = useState<
    "all" | "24h" | "7d" | "30d"
  >("all");

  // Reports filters
  const [reportStatusFilter, setReportStatusFilter] = useState<
    ReportStatus | "all"
  >("all");

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;

  // Modal states
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

  // Feedback banners
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
          category: categoryFilter,
          author: authorFilter,
          hasReports: hasReportsFilter,
          period: periodFilter,
          query: searchQuery,
        },
        { page: 1, pageSize: 100 }
      ),
      adminDataProvider.reports.listReports(
        { status: reportStatusFilter },
        { page: 1, pageSize: 100 }
      ),
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
    categoryFilter,
    authorFilter,
    hasReportsFilter,
    periodFilter,
    searchQuery,
    reportStatusFilter,
    t.loadError,
    reloadKey,
  ]);

  const categories = useMemo(() => {
    const set = new Set<string>();
    items.forEach((it) => {
      if (it.category) set.add(it.category);
    });
    return Array.from(set).sort();
  }, [items]);

  const totalPages = Math.max(1, Math.ceil(items.length / itemsPerPage));
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const paginatedItems = useMemo(() => {
    const start = (safeCurrentPage - 1) * itemsPerPage;
    return items.slice(start, start + itemsPerPage);
  }, [items, safeCurrentPage, itemsPerPage]);

  const counts = useMemo(() => {
    return {
      total: items.length,
      pending: items.filter((it) => it.status === "pending").length,
      reported: items.filter((it) => (it.reportCount ?? 0) > 0).length,
      escalated: items.filter(
        (it) =>
          it.status === "escalated" || it.status === "revision_requested"
      ).length,
    };
  }, [items]);

  const clearFilters = () => {
    setSearchQuery("");
    setTypeFilter("all");
    setStatusFilter("all");
    setPriorityFilter("all");
    setCategoryFilter("all");
    setAuthorFilter("");
    setHasReportsFilter("all");
    setPeriodFilter("all");
    setCurrentPage(1);
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

  const quickActionStyle: Partial<Record<ModerationAction, { label: string; cls: string }>> = {
    approve: {
      label: t.approveBtn,
      cls: "border-emerald-500/30 bg-emerald-500/10 text-emerald-300 hover:bg-emerald-500/20",
    },
    reject: {
      label: t.rejectBtn,
      cls: "border-rose-500/30 bg-rose-500/10 text-rose-300 hover:bg-rose-500/20",
    },
    hide: {
      label: t.hideBtn,
      cls: "border-rose-500/30 bg-rose-500/10 text-rose-300 hover:bg-rose-500/20",
    },
    restore: {
      label: t.restoreBtn,
      cls: "border-emerald-500/30 bg-emerald-500/10 text-emerald-300 hover:bg-emerald-500/20",
    },
    escalate: {
      label: t.escalateBtn,
      cls: "border-purple-500/30 bg-purple-500/10 text-purple-300 hover:bg-purple-500/20",
    },
  };

  const formatDate = (iso?: string) => {
    if (!iso) return "—";
    return new Date(iso).toLocaleDateString(isPt ? "pt-BR" : "en-US");
  };

  return (
    <AdminGuard>
      <div className="flex flex-col gap-6 pb-16">
        {/* Header Hero */}
        <div className="relative overflow-hidden rounded-2xl border border-slate-800 bg-gradient-to-r from-[#0c1427] via-[#091020] to-[#070b14] p-6 shadow-xl sm:p-8">
          <div className="absolute right-0 top-0 -mr-16 -mt-16 h-64 w-64 rounded-full bg-cyan-500/10 blur-3xl" />
          <div className="relative z-10 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-mono text-xs uppercase tracking-wider text-cyan-400">
                  {t.eyebrow}
                </span>
                <span className="rounded border border-amber-500/40 bg-amber-500/15 px-2 py-0.5 font-mono text-[10px] font-bold uppercase text-amber-300">
                  {t.demoBadge}
                </span>
              </div>
              <h1 className="mt-1 text-2xl font-bold tracking-tight text-white sm:text-3xl">
                {t.title}
              </h1>
              <p className="mt-2 max-w-2xl text-sm text-slate-300">
                {t.subtitle}
              </p>
            </div>

            {/* Summary KPIs */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              <div className="rounded-xl border border-slate-800 bg-[#070b14] px-3 py-2 font-mono text-xs">
                <span className="block text-[10px] text-slate-400">{t.counterTotal}</span>
                <strong className="text-base text-cyan-400">{counts.total}</strong>
              </div>
              <div className="rounded-xl border border-slate-800 bg-[#070b14] px-3 py-2 font-mono text-xs">
                <span className="block text-[10px] text-slate-400">{t.counterPending}</span>
                <strong className="text-base text-amber-400">{counts.pending}</strong>
              </div>
              <div className="rounded-xl border border-slate-800 bg-[#070b14] px-3 py-2 font-mono text-xs">
                <span className="block text-[10px] text-slate-400">{t.counterReported}</span>
                <strong className="text-base text-rose-400">{counts.reported}</strong>
              </div>
              <div className="rounded-xl border border-slate-800 bg-[#070b14] px-3 py-2 font-mono text-xs">
                <span className="block text-[10px] text-slate-400">{t.counterEscalated}</span>
                <strong className="text-base text-purple-300">{counts.escalated}</strong>
              </div>
            </div>
          </div>

          <div className="mt-5 rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-200">
            {t.demoNotice}
          </div>
        </div>

        {/* Feedback & Error Alerts */}
        {feedbackMessage && (
          <div className="rounded-xl border border-emerald-500/40 bg-emerald-500/10 p-4 text-xs font-semibold text-emerald-300">
            ✓ {feedbackMessage}
          </div>
        )}
        {actionError && (
          <div className="rounded-xl border border-rose-500/40 bg-rose-500/10 p-4 text-xs font-semibold text-rose-300">
            {actionError}
          </div>
        )}

        {/* Section Tabs */}
        <div className="flex flex-wrap items-center gap-2 border-b border-slate-800 pb-3">
          <button
            type="button"
            onClick={() => setActiveTab("queue")}
            className={`rounded-xl px-4 py-2 text-xs font-semibold transition-colors ${
              activeTab === "queue"
                ? "border border-cyan-500/40 bg-cyan-500/20 text-cyan-300"
                : "border border-slate-800 bg-[#0c1220] text-slate-400 hover:text-slate-200"
            }`}
          >
            {t.queueTab} ({items.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("reports")}
            className={`rounded-xl px-4 py-2 text-xs font-semibold transition-colors ${
              activeTab === "reports"
                ? "border border-rose-500/40 bg-rose-500/20 text-rose-300"
                : "border border-slate-800 bg-[#0c1220] text-slate-400 hover:text-slate-200"
            }`}
          >
            {t.reportsTab} ({reports.length})
          </button>
        </div>

        {activeTab === "queue" ? (
          <>
            {/* Filters */}
            <div className="rounded-2xl border border-slate-800 bg-[#0c1220] p-4 shadow-xl space-y-4">
              <div className="flex flex-wrap items-center gap-2 border-b border-slate-800/80 pb-3">
                <span className="text-xs font-mono text-slate-400 mr-2">
                  {t.filterType}:
                </span>
                {(["all", "resource", "topic", "post", "research"] as const).map(
                  (type) => (
                    <button
                      key={type}
                      type="button"
                      onClick={() => {
                        setTypeFilter(type);
                        setCurrentPage(1);
                      }}
                      className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                        typeFilter === type
                          ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/40"
                          : "text-slate-400 hover:text-slate-200 hover:bg-slate-800"
                      }`}
                    >
                      {type === "all" ? t.allTypes : t.typeLabels[type] || type}
                    </button>
                  )
                )}
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setCurrentPage(1);
                  }}
                  placeholder={t.searchPlaceholder}
                  className="rounded-xl border border-slate-800 bg-[#070b14] px-3.5 py-2 text-xs text-slate-200 placeholder-slate-500 focus:border-cyan-500 focus:outline-none sm:col-span-2"
                />

                <input
                  type="text"
                  value={authorFilter}
                  onChange={(e) => {
                    setAuthorFilter(e.target.value);
                    setCurrentPage(1);
                  }}
                  placeholder={t.authorPlaceholder}
                  className="rounded-xl border border-slate-800 bg-[#070b14] px-3.5 py-2 text-xs text-slate-200 placeholder-slate-500 focus:border-cyan-500 focus:outline-none"
                />

                <select
                  value={statusFilter}
                  onChange={(e) => {
                    setStatusFilter(e.target.value);
                    setCurrentPage(1);
                  }}
                  aria-label={t.filterStatus}
                  className="rounded-xl border border-slate-800 bg-[#070b14] px-3 py-2 text-xs text-slate-200 focus:border-cyan-500 focus:outline-none"
                >
                  <option value="all">{t.allStatuses}</option>
                  {Object.entries(t.statusLabels).map(([key, label]) => (
                    <option key={key} value={key}>
                      {label}
                    </option>
                  ))}
                </select>

                <select
                  value={priorityFilter}
                  onChange={(e) => {
                    setPriorityFilter(
                      e.target.value as ModerationPriority | "all"
                    );
                    setCurrentPage(1);
                  }}
                  aria-label={t.filterPriority}
                  className="rounded-xl border border-slate-800 bg-[#070b14] px-3 py-2 text-xs text-slate-200 focus:border-cyan-500 focus:outline-none"
                >
                  <option value="all">{t.allPriorities}</option>
                  {Object.entries(t.priorityLabels).map(([key, label]) => (
                    <option key={key} value={key}>
                      {label}
                    </option>
                  ))}
                </select>

                <select
                  value={categoryFilter}
                  onChange={(e) => {
                    setCategoryFilter(e.target.value);
                    setCurrentPage(1);
                  }}
                  aria-label={t.filterCategory}
                  className="rounded-xl border border-slate-800 bg-[#070b14] px-3 py-2 text-xs text-slate-200 focus:border-cyan-500 focus:outline-none"
                >
                  <option value="all">{t.allCategories}</option>
                  {categories.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>

                <select
                  value={hasReportsFilter}
                  onChange={(e) => {
                    setHasReportsFilter(
                      e.target.value as "all" | "yes" | "no"
                    );
                    setCurrentPage(1);
                  }}
                  aria-label={t.filterReports}
                  className="rounded-xl border border-slate-800 bg-[#070b14] px-3 py-2 text-xs text-slate-200 focus:border-cyan-500 focus:outline-none"
                >
                  <option value="all">{t.allReports}</option>
                  <option value="yes">{t.withReportsOnly}</option>
                  <option value="no">{t.withoutReportsOnly}</option>
                </select>

                <select
                  value={periodFilter}
                  onChange={(e) => {
                    setPeriodFilter(
                      e.target.value as "all" | "24h" | "7d" | "30d"
                    );
                    setCurrentPage(1);
                  }}
                  aria-label={t.filterPeriod}
                  className="rounded-xl border border-slate-800 bg-[#070b14] px-3 py-2 text-xs text-slate-200 focus:border-cyan-500 focus:outline-none"
                >
                  <option value="all">{t.allPeriods}</option>
                  <option value="24h">{t.period24h}</option>
                  <option value="7d">{t.period7d}</option>
                  <option value="30d">{t.period30d}</option>
                </select>
              </div>

              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={clearFilters}
                  className="rounded-lg border border-slate-700 bg-slate-800/80 px-3 py-1.5 text-xs text-slate-300 hover:bg-slate-700 hover:text-white transition-colors"
                >
                  {t.clearFiltersBtn}
                </button>
              </div>
            </div>

            {/* Loading / Error / Empty / Table */}
            {loading ? (
              <div className="rounded-2xl border border-slate-800 bg-[#0c1220] p-10 text-center text-xs font-mono text-slate-400">
                Carregando fila de moderação...
              </div>
            ) : loadError ? (
              <div className="rounded-2xl border border-rose-500/40 bg-rose-500/10 p-8 text-center space-y-3">
                <p className="text-sm text-rose-300">{loadError}</p>
                <button
                  type="button"
                  onClick={() => setReloadKey((k) => k + 1)}
                  className="rounded-xl border border-rose-500/40 bg-rose-600/20 px-4 py-2 text-xs font-semibold text-rose-200 hover:bg-rose-600/30"
                >
                  {t.retryBtn}
                </button>
              </div>
            ) : paginatedItems.length === 0 ? (
              <div className="rounded-2xl border border-slate-800 bg-[#0c1220] p-10 text-center text-sm text-slate-400">
                {t.emptyState}
              </div>
            ) : (
              <>
                {/* Desktop Table */}
                <div className="hidden lg:block overflow-x-auto rounded-2xl border border-slate-800 bg-[#0c1220] shadow-xl">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-slate-800 bg-[#070b14] text-[11px] font-mono uppercase tracking-wider text-slate-400">
                        <th className="px-4 py-3">{t.typeCol}</th>
                        <th className="px-4 py-3">{t.titleCol}</th>
                        <th className="px-4 py-3">{t.authorCol}</th>
                        <th className="px-4 py-3">{t.priorityCol}</th>
                        <th className="px-4 py-3">{t.reportsCol}</th>
                        <th className="px-4 py-3">{t.updatedCol}</th>
                        <th className="px-4 py-3">{t.statusCol}</th>
                        <th className="px-4 py-3 text-right">{t.actionsCol}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/70 text-xs">
                      {paginatedItems.map((item) => {
                        const available = getModerationAvailableActions(item);
                        const quickActions = available.slice(0, 2);
                        return (
                          <tr
                            key={`${item.contentType}-${item.id}`}
                            className="hover:bg-slate-900/40 transition-colors"
                          >
                            <td className="px-4 py-3.5 font-mono text-[11px] text-cyan-300 whitespace-nowrap">
                              {t.typeLabels[item.contentType] || item.contentType}
                            </td>
                            <td className="px-4 py-3.5 max-w-xs">
                              <p className="font-semibold text-slate-100 truncate">
                                {item.title}
                              </p>
                              {item.flagReason && (
                                <p className="mt-0.5 text-[11px] text-slate-400 truncate">
                                  {item.flagReason}
                                </p>
                              )}
                              {item.incomplete && (
                                <span className="mt-1 inline-block rounded border border-amber-500/40 bg-amber-500/10 px-1.5 py-0.5 font-mono text-[10px] text-amber-300">
                                  {t.incompleteBadge}
                                </span>
                              )}
                            </td>
                            <td className="px-4 py-3.5 font-mono text-slate-300 whitespace-nowrap">
                              @{item.authorUsername}
                            </td>
                            <td className="px-4 py-3.5 whitespace-nowrap">
                              {item.priority ? (
                                <span
                                  className={`rounded-full border px-2 py-0.5 font-mono text-[10px] uppercase ${
                                    priorityBadgeStyles[item.priority] || ""
                                  }`}
                                >
                                  {t.priorityLabels[item.priority] || item.priority}
                                </span>
                              ) : (
                                "—"
                              )}
                            </td>
                            <td className="px-4 py-3.5 font-mono text-slate-300 whitespace-nowrap">
                              {item.reportCount ?? 0}
                            </td>
                            <td className="px-4 py-3.5 font-mono text-[11px] text-slate-400 whitespace-nowrap">
                              {formatDate(item.updatedAt || item.submittedAt)}
                            </td>
                            <td className="px-4 py-3.5 whitespace-nowrap">
                              <span
                                className={`inline-flex rounded-full border px-2.5 py-0.5 font-mono text-[10px] font-semibold uppercase ${
                                  statusBadgeStyles[item.status] ||
                                  "border-slate-700 bg-slate-800 text-slate-300"
                                }`}
                              >
                                {t.statusLabels[item.status] || item.status}
                              </span>
                            </td>
                            <td className="px-4 py-3.5 text-right whitespace-nowrap">
                              <div className="inline-flex items-center gap-1.5">
                                <button
                                  type="button"
                                  onClick={() => setDetailItem(item)}
                                  className="rounded-lg border border-slate-700 bg-slate-800 px-2.5 py-1 text-[11px] font-medium text-slate-200 hover:bg-slate-700"
                                >
                                  {t.reviewBtn}
                                </button>
                                {canModerate &&
                                  quickActions.map((act) => {
                                    const cfg = quickActionStyle[act];
                                    if (!cfg) return null;
                                    return (
                                      <button
                                        key={act}
                                        type="button"
                                        onClick={() =>
                                          setDecisionModalState({
                                            item,
                                            mode: act,
                                          })
                                        }
                                        className={`rounded-lg border px-2.5 py-1 text-[11px] font-semibold transition-colors ${cfg.cls}`}
                                      >
                                        {cfg.label}
                                      </button>
                                    );
                                  })}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Mobile & Tablet Cards */}
                <div className="grid grid-cols-1 gap-3 lg:hidden">
                  {paginatedItems.map((item) => {
                    const available = getModerationAvailableActions(item);
                    return (
                      <div
                        key={`${item.contentType}-${item.id}`}
                        className="rounded-2xl border border-slate-800 bg-[#0c1220] p-4 space-y-3"
                      >
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <span className="font-mono text-[11px] text-cyan-400">
                            {t.typeLabels[item.contentType] || item.contentType}
                          </span>
                          <span
                            className={`rounded-full border px-2 py-0.5 font-mono text-[10px] uppercase ${
                              statusBadgeStyles[item.status] || ""
                            }`}
                          >
                            {t.statusLabels[item.status] || item.status}
                          </span>
                        </div>
                        <h3 className="text-sm font-bold text-slate-100">
                          {item.title}
                        </h3>
                        <div className="flex flex-wrap gap-3 text-[11px] font-mono text-slate-400">
                          <span>@{item.authorUsername}</span>
                          <span>
                            {t.reportsCol}: {item.reportCount ?? 0}
                          </span>
                          <span>
                            {formatDate(item.updatedAt || item.submittedAt)}
                          </span>
                        </div>
                        <div className="flex flex-wrap gap-2 pt-2 border-t border-slate-800">
                          <button
                            type="button"
                            onClick={() => setDetailItem(item)}
                            className="rounded-lg border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs text-slate-200"
                          >
                            {t.reviewBtn}
                          </button>
                          {canModerate &&
                            available.slice(0, 3).map((act) => {
                              const cfg = quickActionStyle[act];
                              if (!cfg) return null;
                              return (
                                <button
                                  key={act}
                                  type="button"
                                  onClick={() =>
                                    setDecisionModalState({ item, mode: act })
                                  }
                                  className={`rounded-lg border px-3 py-1.5 text-xs font-semibold ${cfg.cls}`}
                                >
                                  {cfg.label}
                                </button>
                              );
                            })}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-between rounded-2xl border border-slate-800 bg-[#0c1220] px-4 py-3 text-xs text-slate-400">
                    <span>
                      {safeCurrentPage} / {totalPages}
                    </span>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        disabled={safeCurrentPage <= 1}
                        onClick={() =>
                          setCurrentPage((p) => Math.max(1, p - 1))
                        }
                        className="rounded-lg border border-slate-700 bg-slate-800 px-3 py-1 disabled:opacity-40"
                      >
                        ←
                      </button>
                      <button
                        type="button"
                        disabled={safeCurrentPage >= totalPages}
                        onClick={() =>
                          setCurrentPage((p) => Math.min(totalPages, p + 1))
                        }
                        className="rounded-lg border border-slate-700 bg-slate-800 px-3 py-1 disabled:opacity-40"
                      >
                        →
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}
          </>
        ) : (
          /* Reports Tab */
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-800 bg-[#0c1220] p-4">
              <h2 className="text-sm font-bold text-slate-100">
                {t.reportsSectionTitle}
              </h2>
              <select
                value={reportStatusFilter}
                onChange={(e) =>
                  setReportStatusFilter(e.target.value as ReportStatus | "all")
                }
                aria-label={t.filterStatus}
                className="rounded-xl border border-slate-800 bg-[#070b14] px-3 py-2 text-xs text-slate-200 focus:border-cyan-500 focus:outline-none"
              >
                <option value="all">{rt.allStatuses}</option>
                {Object.entries(rt.statusLabels).map(([k, label]) => (
                  <option key={k} value={k}>
                    {label}
                  </option>
                ))}
              </select>
            </div>

            {reports.length === 0 ? (
              <div className="rounded-2xl border border-slate-800 bg-[#0c1220] p-10 text-center text-sm text-slate-400">
                {t.reportsEmpty}
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-3">
                {reports.map((report) => (
                  <div
                    key={report.id}
                    className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-2xl border border-slate-800 bg-[#0c1220] p-4"
                  >
                    <div className="space-y-1.5 min-w-0">
                      <div className="flex flex-wrap items-center gap-2 text-[11px] font-mono">
                        <span className="rounded border border-rose-500/40 bg-rose-500/10 px-2 py-0.5 text-rose-300 uppercase">
                          {rt.reasonLabels[report.reason] || report.reason}
                        </span>
                        <span className="rounded border border-slate-700 bg-slate-800 px-2 py-0.5 text-slate-300 uppercase">
                          {report.targetType}
                        </span>
                        <span className="rounded border border-cyan-500/40 bg-cyan-500/10 px-2 py-0.5 text-cyan-300 uppercase">
                          {rt.statusLabels[report.status] || report.status}
                        </span>
                      </div>
                      <h3 className="text-sm font-bold text-slate-100 truncate">
                        {report.targetTitle || report.targetId}
                      </h3>
                      {report.details && (
                        <p className="text-xs text-slate-300">
                          {report.details}
                        </p>
                      )}
                      <div className="flex flex-wrap items-center gap-3 font-mono text-[11px] text-slate-400">
                        <span>{t.reporterProtected}</span>
                        <span>•</span>
                        <span>{formatDate(report.createdAt)}</span>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => setSelectedReport(report)}
                      className="shrink-0 rounded-xl border border-cyan-500/40 bg-cyan-500/10 px-4 py-2 text-xs font-semibold text-cyan-300 hover:bg-cyan-500/20"
                    >
                      {t.analyzeReportBtn}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Detail Modal */}
      <AdminModerationDetailModal
        item={detailItem}
        onClose={() => setDetailItem(null)}
        onOpenDecision={(item, mode) => setDecisionModalState({ item, mode })}
        canModerate={canModerate}
      />

      {/* Decision Modal */}
      <AdminModerationDecisionModal
        key={
          decisionModalState
            ? `${decisionModalState.item.contentType}-${decisionModalState.item.id}-${decisionModalState.mode}`
            : "decision-closed"
        }
        item={decisionModalState?.item ?? null}
        mode={decisionModalState?.mode ?? null}
        onClose={() => setDecisionModalState(null)}
        onConfirm={handleExecuteDecision}
      />

      {/* Report Modal */}
      <AdminReportModal
        key={selectedReport?.id ?? "report-closed"}
        report={selectedReport}
        onClose={() => setSelectedReport(null)}
        onSuccess={() => {
          setFeedbackMessage(
            isPt
              ? "Resolução da denúncia registrada com sucesso."
              : "Report resolution recorded successfully."
          );
          setReloadKey((k) => k + 1);
          setTimeout(() => setFeedbackMessage(null), 4500);
        }}
      />
    </AdminGuard>
  );
}

export default function AdminModerationPage() {
  return (
    <Suspense
      fallback={
        <div className="p-8 text-center text-xs font-mono text-slate-400">
          Carregando moderação...
        </div>
      }
    >
      <AdminModerationContent />
    </Suspense>
  );
}
