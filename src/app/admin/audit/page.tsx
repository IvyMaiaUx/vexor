"use client";

import React, { useCallback, useEffect, useState } from "react";
import {
  adminDataProvider,
  type AdminAuditEntry,
  type AdminAuditFilters,
  type AdminAuditSummary,
  type AuditPeriodFilter,
  type AuditSeverity,
  type PaginatedResult,
} from "@/features/admin";
import { AdminAuditDetailModal } from "@/features/admin/components/admin-audit-detail-modal";
import { AdminGuard } from "@/features/admin/components/admin-guard";
import {
  classifyAuditSeverity,
  exportAuditLogsToCsv,
  safeStringifyAuditMetadata,
} from "@/features/admin/utils/audit-export";
import { useI18n } from "@/lib/i18n/context";

const SEVERITY_BADGE_STYLES: Record<AuditSeverity, string> = {
  info: "border-sky-500/40 bg-sky-500/15 text-sky-300",
  warning: "border-amber-500/40 bg-amber-500/15 text-amber-300",
  critical: "border-rose-500/40 bg-rose-500/15 text-rose-300",
  access_denied: "border-rose-500/60 bg-rose-950/60 text-rose-200 font-bold",
};

const ACTION_OPTIONS = [
  "user.role_changed",
  "user.suspended",
  "user.unsuspended",
  "resource.approved",
  "resource.rejected",
  "topic.lock",
  "report.reviewing",
  "report.resolved",
  "auth.access_denied",
  "system.config_updated",
  "maintenance.cleanup",
] as const;

const ENTITY_OPTIONS = [
  "profile",
  "resource",
  "topic",
  "post",
  "report",
  "research",
  "system",
] as const;

export default function AdminAuditPage() {
  const { dict, locale } = useI18n();
  const t = dict.adminPanel.auditPage;

  // Filter & pagination state
  const [searchInput, setSearchInput] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [operatorInput, setOperatorInput] = useState("");
  const [debouncedOperator, setDebouncedOperator] = useState("");
  const [actionFilter, setActionFilter] = useState("all");
  const [entityFilter, setEntityFilter] = useState("all");
  const [severityFilter, setSeverityFilter] = useState<AuditSeverity | "all">("all");
  const [periodFilter, setPeriodFilter] = useState<AuditPeriodFilter>("all");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [sortOrder, setSortOrder] = useState<"desc" | "asc">("desc");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(8);

  // Data state
  const [auditResult, setAuditResult] = useState<PaginatedResult<AdminAuditEntry>>({
    items: [],
    total: 0,
    page: 1,
    pageSize: 8,
    totalPages: 1,
    isSimulatedDemoData: true,
  });
  const [summary, setSummary] = useState<AdminAuditSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadError, setLoadError] = useState(false);

  // Detail & export feedback state
  const [selectedLog, setSelectedLog] = useState<AdminAuditEntry | null>(null);
  const [exportFeedback, setExportFeedback] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  // Debounce text inputs
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(searchInput.trim());
      setDebouncedOperator(operatorInput.trim());
      setPage(1);
    }, 250);
    return () => clearTimeout(timer);
  }, [searchInput, operatorInput]);

  const buildFilters = useCallback((): AdminAuditFilters => {
    return {
      query: debouncedQuery || undefined,
      actorUsername: debouncedOperator || undefined,
      action: actionFilter,
      entityType: entityFilter,
      severity: severityFilter,
      period: periodFilter,
      startDate: periodFilter === "custom" && startDate ? startDate : undefined,
      endDate:
        periodFilter === "custom" && endDate ? `${endDate}T23:59:59Z` : undefined,
      sortOrder,
    };
  }, [
    debouncedQuery,
    debouncedOperator,
    actionFilter,
    entityFilter,
    severityFilter,
    periodFilter,
    startDate,
    endDate,
    sortOrder,
  ]);

  const fetchAuditSnapshot = useCallback(async () => {
    const [listRes, summaryRes] = await Promise.all([
      adminDataProvider.audit.listAuditEntries(buildFilters(), { page, pageSize }),
      adminDataProvider.audit.getAuditSummary(),
    ]);
    return { listRes, summaryRes };
  }, [buildFilters, page, pageSize]);

  useEffect(() => {
    let active = true;
    fetchAuditSnapshot()
      .then(({ listRes, summaryRes }) => {
        if (!active) return;
        setAuditResult(listRes);
        setSummary(summaryRes);
        setLoadError(false);
        setLoading(false);
      })
      .catch(() => {
        if (!active) return;
        setLoadError(true);
        setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [fetchAuditSnapshot]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    setLoadError(false);
    try {
      const { listRes, summaryRes } = await fetchAuditSnapshot();
      setAuditResult(listRes);
      setSummary(summaryRes);
    } catch {
      setLoadError(true);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [fetchAuditSnapshot]);

  const handleClearFilters = () => {
    setSearchInput("");
    setDebouncedQuery("");
    setOperatorInput("");
    setDebouncedOperator("");
    setActionFilter("all");
    setEntityFilter("all");
    setSeverityFilter("all");
    setPeriodFilter("all");
    setStartDate("");
    setEndDate("");
    setSortOrder("desc");
    setPage(1);
  };

  const handleExportCsv = async () => {
    try {
      const allMatching = await adminDataProvider.audit.exportFilteredEntries(
        buildFilters()
      );
      if (allMatching.length === 0) {
        setExportFeedback({ type: "error", text: t.exportEmptyError });
        return;
      }

      const headers = [
        t.idCol,
        t.timestampCol,
        t.actorCol,
        "Actor ID",
        t.actionCol,
        t.severityCol,
        t.entityCol,
        "Entity ID",
        "Integrity",
        t.metadataCol,
      ];
      const ok = exportAuditLogsToCsv(allMatching, undefined, headers);
      if (ok) {
        setExportFeedback({
          type: "success",
          text: t.exportSuccess(allMatching.length),
        });
      } else {
        setExportFeedback({ type: "error", text: t.exportError });
      }
    } catch {
      setExportFeedback({ type: "error", text: t.exportError });
    }
  };

  const hasActiveFilters =
    Boolean(searchInput.trim()) ||
    Boolean(operatorInput.trim()) ||
    actionFilter !== "all" ||
    entityFilter !== "all" ||
    severityFilter !== "all" ||
    periodFilter !== "all";

  const dateTimeFormatter = new Intl.DateTimeFormat(locale, {
    dateStyle: "short",
    timeStyle: "short",
  });

  const summaryCards = [
    {
      id: "total",
      label: t.summary.totalEvents,
      value: summary?.totalEvents ?? 0,
      accent: "text-white",
    },
    {
      id: "critical",
      label: t.summary.criticalEvents,
      value: summary?.criticalEvents ?? 0,
      accent: "text-rose-300",
    },
    {
      id: "adminChanges",
      label: t.summary.adminChanges,
      value: summary?.adminChanges ?? 0,
      accent: "text-violet-300",
    },
    {
      id: "accessDenied",
      label: t.summary.accessDenied,
      value: summary?.accessDeniedEvents ?? 0,
      accent: "text-amber-300",
    },
    {
      id: "recent",
      label: t.summary.recentEvents,
      value: summary?.recentEvents ?? 0,
      accent: "text-cyan-300",
    },
  ];

  return (
    <AdminGuard requireAdmin={true}>
      <div className="flex flex-col gap-6 pb-16">
        {/* Header */}
        <header className="rounded-2xl border border-slate-800/90 bg-[#091020] p-5 sm:p-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="min-w-0 space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-mono text-[11px] uppercase tracking-wider text-cyan-400">
                  {t.eyebrow}
                </span>
                <span className="rounded border border-violet-500/40 bg-violet-500/15 px-2 py-0.5 font-mono text-[10px] font-semibold uppercase text-violet-300">
                  ADMIN ONLY
                </span>
                <span className="rounded border border-cyan-500/40 bg-cyan-500/15 px-2 py-0.5 font-mono text-[10px] font-semibold uppercase text-cyan-300">
                  APPEND-ONLY
                </span>
              </div>

              <h1 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">
                {t.title}
              </h1>
              <p className="max-w-2xl text-sm text-slate-300">{t.subtitle}</p>
            </div>

            <div className="flex flex-wrap items-center gap-2 self-start">
              <button
                type="button"
                onClick={() => void handleRefresh()}
                disabled={loading || refreshing}
                className="inline-flex min-h-[38px] items-center gap-2 rounded-xl border border-slate-700 bg-[#070b14] px-3.5 py-2 text-xs font-semibold text-slate-200 transition-colors hover:border-slate-600 hover:text-white disabled:opacity-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400"
              >
                <span>{refreshing ? t.refreshingButton : t.refreshButton}</span>
              </button>
              <button
                type="button"
                onClick={() => void handleExportCsv()}
                disabled={loading || auditResult.total === 0}
                className="inline-flex min-h-[38px] items-center gap-2 rounded-xl border border-cyan-500/40 bg-cyan-500/15 px-3.5 py-2 text-xs font-semibold text-cyan-200 transition-colors hover:bg-cyan-500/25 disabled:cursor-not-allowed disabled:opacity-45 focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400"
              >
                {t.exportCsvBtn} ({auditResult.total})
              </button>
            </div>
          </div>

          <div className="mt-4 rounded-xl border border-slate-800/90 bg-[#070b14]/80 p-3.5 text-xs text-slate-400">
            {t.immutableNotice}
          </div>
        </header>

        {/* Export / Error Alerts */}
        {exportFeedback && (
          <div
            role="status"
            className={`rounded-xl border p-3.5 text-xs font-medium ${
              exportFeedback.type === "success"
                ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-200"
                : "border-amber-500/40 bg-amber-500/10 text-amber-200"
            }`}
          >
            {exportFeedback.text}
          </div>
        )}

        {loadError && (
          <div
            role="alert"
            className="flex flex-col items-start justify-between gap-3 rounded-2xl border border-rose-500/40 bg-rose-500/10 p-5 sm:flex-row sm:items-center"
          >
            <div className="space-y-1">
              <h2 className="text-sm font-semibold text-rose-200">
                {t.errorTitle}
              </h2>
              <p className="text-xs text-rose-200/80">{t.errorMessage}</p>
            </div>
            <button
              type="button"
              onClick={() => void handleRefresh()}
              className="inline-flex min-h-[38px] shrink-0 items-center justify-center rounded-xl bg-rose-500 px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-rose-400 focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-300"
            >
              {t.retryButton}
            </button>
          </div>
        )}

        {/* Summary Dashboard */}
        <section
          aria-label={t.summary.totalEvents}
          className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5"
        >
          {summaryCards.map((card) => (
            <div
              key={card.id}
              className="rounded-2xl border border-slate-800/90 bg-[#0c1220]/90 p-4"
            >
              <span className="block text-xs font-medium text-slate-400">
                {card.label}
              </span>
              <div className={`mt-2 font-mono text-2xl font-bold ${card.accent}`}>
                {loading ? (
                  <span className="inline-block h-7 w-10 animate-pulse rounded bg-slate-800" />
                ) : (
                  card.value
                )}
              </div>
            </div>
          ))}
        </section>

        {/* Search & Combinable Filters */}
        <section
          aria-label={t.filterAction}
          className="rounded-2xl border border-slate-800/90 bg-[#0c1220]/90 p-4 sm:p-5"
        >
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-6">
            <div className="lg:col-span-2">
              <label
                htmlFor="audit-search-input"
                className="mb-1 block text-[11px] font-medium text-slate-400"
              >
                {t.searchPlaceholder}
              </label>
              <input
                id="audit-search-input"
                type="search"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder={t.searchPlaceholder}
                className="w-full rounded-xl border border-slate-800 bg-[#070b14] px-3.5 py-2 text-xs text-slate-100 placeholder-slate-500 focus:border-cyan-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400"
              />
            </div>

            <div>
              <label
                htmlFor="audit-operator-input"
                className="mb-1 block text-[11px] font-medium text-slate-400"
              >
                {t.filterOperator}
              </label>
              <input
                id="audit-operator-input"
                type="text"
                value={operatorInput}
                onChange={(e) => setOperatorInput(e.target.value)}
                placeholder={t.operatorPlaceholder}
                className="w-full rounded-xl border border-slate-800 bg-[#070b14] px-3 py-2 text-xs text-slate-100 placeholder-slate-500 focus:border-cyan-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400"
              />
            </div>

            <div>
              <label
                htmlFor="audit-action-filter"
                className="mb-1 block text-[11px] font-medium text-slate-400"
              >
                {t.filterAction}
              </label>
              <select
                id="audit-action-filter"
                value={actionFilter}
                onChange={(e) => {
                  setActionFilter(e.target.value);
                  setPage(1);
                }}
                className="w-full rounded-xl border border-slate-800 bg-[#070b14] px-3 py-2 text-xs text-slate-100 focus:border-cyan-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400"
              >
                <option value="all">{t.allActions}</option>
                {ACTION_OPTIONS.map((act) => (
                  <option key={act} value={act}>
                    {t.actionLabels[act] || act}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label
                htmlFor="audit-entity-filter"
                className="mb-1 block text-[11px] font-medium text-slate-400"
              >
                {t.filterEntityType}
              </label>
              <select
                id="audit-entity-filter"
                value={entityFilter}
                onChange={(e) => {
                  setEntityFilter(e.target.value);
                  setPage(1);
                }}
                className="w-full rounded-xl border border-slate-800 bg-[#070b14] px-3 py-2 text-xs text-slate-100 focus:border-cyan-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400"
              >
                <option value="all">{t.allEntityTypes}</option>
                {ENTITY_OPTIONS.map((ent) => (
                  <option key={ent} value={ent}>
                    {t.entityTypeLabels[ent] || ent}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label
                htmlFor="audit-severity-filter"
                className="mb-1 block text-[11px] font-medium text-slate-400"
              >
                {t.filterSeverity}
              </label>
              <select
                id="audit-severity-filter"
                value={severityFilter}
                onChange={(e) => {
                  setSeverityFilter(e.target.value as AuditSeverity | "all");
                  setPage(1);
                }}
                className="w-full rounded-xl border border-slate-800 bg-[#070b14] px-3 py-2 text-xs text-slate-100 focus:border-cyan-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400"
              >
                <option value="all">{t.allSeverities}</option>
                <option value="info">{t.severityLabels.info}</option>
                <option value="warning">{t.severityLabels.warning}</option>
                <option value="critical">{t.severityLabels.critical}</option>
                <option value="access_denied">
                  {t.severityLabels.access_denied}
                </option>
              </select>
            </div>
          </div>

          {/* Period & Sort row */}
          <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <label
                htmlFor="audit-period-filter"
                className="mb-1 block text-[11px] font-medium text-slate-400"
              >
                {t.filterPeriod}
              </label>
              <select
                id="audit-period-filter"
                value={periodFilter}
                onChange={(e) => {
                  setPeriodFilter(e.target.value as AuditPeriodFilter);
                  setPage(1);
                }}
                className="w-full rounded-xl border border-slate-800 bg-[#070b14] px-3 py-2 text-xs text-slate-100 focus:border-cyan-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400"
              >
                <option value="all">{t.allPeriods}</option>
                <option value="today">{t.periodToday}</option>
                <option value="7d">{t.period7Days}</option>
                <option value="30d">{t.period30Days}</option>
                <option value="90d">{t.period90Days}</option>
                <option value="custom">{t.periodCustom}</option>
              </select>
            </div>

            {periodFilter === "custom" && (
              <>
                <div>
                  <label
                    htmlFor="audit-start-date"
                    className="mb-1 block text-[11px] font-medium text-slate-400"
                  >
                    {t.startDateLabel}
                  </label>
                  <input
                    id="audit-start-date"
                    type="date"
                    value={startDate}
                    onChange={(e) => {
                      setStartDate(e.target.value);
                      setPage(1);
                    }}
                    className="w-full rounded-xl border border-slate-800 bg-[#070b14] px-3 py-2 text-xs text-slate-100 focus:border-cyan-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400"
                  />
                </div>
                <div>
                  <label
                    htmlFor="audit-end-date"
                    className="mb-1 block text-[11px] font-medium text-slate-400"
                  >
                    {t.endDateLabel}
                  </label>
                  <input
                    id="audit-end-date"
                    type="date"
                    value={endDate}
                    onChange={(e) => {
                      setEndDate(e.target.value);
                      setPage(1);
                    }}
                    className="w-full rounded-xl border border-slate-800 bg-[#070b14] px-3 py-2 text-xs text-slate-100 focus:border-cyan-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400"
                  />
                </div>
              </>
            )}

            <div>
              <label
                htmlFor="audit-sort-order"
                className="mb-1 block text-[11px] font-medium text-slate-400"
              >
                {t.sortLabel}
              </label>
              <select
                id="audit-sort-order"
                value={sortOrder}
                onChange={(e) => {
                  setSortOrder(e.target.value as "desc" | "asc");
                  setPage(1);
                }}
                className="w-full rounded-xl border border-slate-800 bg-[#070b14] px-3 py-2 text-xs text-slate-100 focus:border-cyan-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400"
              >
                <option value="desc">{t.sortNewest}</option>
                <option value="asc">{t.sortOldest}</option>
              </select>
            </div>
          </div>

          {/* Results Count & PageSize */}
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-slate-800/80 pt-3 text-xs">
            <span className="font-mono text-slate-300">
              {t.resultsCount(auditResult.items.length, auditResult.total)}
            </span>

            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2">
                <label htmlFor="audit-pagesize" className="text-slate-400">
                  {t.pageSizeLabel}:
                </label>
                <select
                  id="audit-pagesize"
                  value={pageSize}
                  onChange={(e) => {
                    setPageSize(Number(e.target.value));
                    setPage(1);
                  }}
                  className="rounded-lg border border-slate-800 bg-[#070b14] px-2.5 py-1 font-mono text-xs text-slate-200 focus:border-cyan-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400"
                >
                  <option value={5}>5</option>
                  <option value={8}>8</option>
                  <option value={15}>15</option>
                  <option value={25}>25</option>
                </select>
              </div>

              {hasActiveFilters && (
                <button
                  type="button"
                  onClick={handleClearFilters}
                  className="rounded-lg border border-slate-700 bg-[#070b14] px-3 py-1 text-xs font-medium text-cyan-300 transition-colors hover:border-cyan-500/50 hover:text-cyan-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400"
                >
                  {t.clearFiltersBtn}
                </button>
              )}
            </div>
          </div>
        </section>

        {/* Event Listing */}
        {loading ? (
          <div className="rounded-2xl border border-slate-800 bg-[#0c1220] p-10 text-center">
            <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-cyan-500 border-t-transparent" />
            <p className="mt-3 font-mono text-xs text-slate-400">
              {t.loadingMessage}
            </p>
          </div>
        ) : auditResult.items.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-800 bg-[#0c1220] p-10 text-center">
            <h2 className="text-sm font-semibold text-slate-200">
              {t.emptyTitle}
            </h2>
            <p className="mt-1 text-xs text-slate-400">{t.emptyState}</p>
            {hasActiveFilters && (
              <button
                type="button"
                onClick={handleClearFilters}
                className="mt-4 rounded-xl border border-cyan-500/40 bg-cyan-500/10 px-4 py-2 text-xs font-semibold text-cyan-300 transition-colors hover:bg-cyan-500/20"
              >
                {t.clearFiltersBtn}
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-hidden rounded-2xl border border-slate-800/90 bg-[#0c1220]/90">
            {/* Desktop Table */}
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full text-left text-xs">
                <thead className="border-b border-slate-800 bg-[#080d1a] font-mono uppercase tracking-wider text-slate-400">
                  <tr>
                    <th scope="col" className="px-4 py-3.5">{t.timestampCol}</th>
                    <th scope="col" className="px-4 py-3.5">{t.actorCol}</th>
                    <th scope="col" className="px-4 py-3.5">{t.actionCol}</th>
                    <th scope="col" className="px-4 py-3.5">{t.entityCol}</th>
                    <th scope="col" className="px-4 py-3.5">{t.severityCol}</th>
                    <th scope="col" className="px-4 py-3.5">{t.idCol}</th>
                    <th scope="col" className="px-4 py-3.5 text-right">{t.actionsCol}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/70">
                  {auditResult.items.map((log) => {
                    const severity = classifyAuditSeverity(log);
                    const actionLabel = t.actionLabels[log.action] || log.action;
                    const entityLabel =
                      t.entityTypeLabels[log.entityType] || log.entityType;
                    const snippet = safeStringifyAuditMetadata(log.metadata).slice(
                      0,
                      50
                    );

                    return (
                      <tr
                        key={log.id}
                        className="transition-colors hover:bg-slate-800/30"
                      >
                        <td className="whitespace-nowrap px-4 py-3.5 font-mono text-slate-300">
                          <time dateTime={log.createdAt}>
                            {dateTimeFormatter.format(new Date(log.createdAt))}
                          </time>
                        </td>
                        <td className="px-4 py-3.5 font-semibold text-slate-100">
                          @{log.actorUsername || "system"}
                        </td>
                        <td className="px-4 py-3.5">
                          <div className="flex flex-col gap-0.5">
                            <span className="font-medium text-cyan-200">
                              {actionLabel}
                            </span>
                            <span className="max-w-[200px] truncate font-mono text-[10px] text-slate-400">
                              {snippet}
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-3.5">
                          <div className="flex flex-col">
                            <span className="text-slate-200">{entityLabel}</span>
                            <span className="max-w-[140px] truncate font-mono text-[10px] text-slate-400">
                              {log.entityId}
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-3.5">
                          <span
                            className={`inline-flex rounded-full border px-2.5 py-0.5 font-mono text-[10px] ${
                              SEVERITY_BADGE_STYLES[severity]
                            }`}
                          >
                            {t.severityLabels[severity]}
                          </span>
                        </td>
                        <td className="px-4 py-3.5 font-mono text-slate-400">
                          #{log.id}
                        </td>
                        <td className="px-4 py-3.5 text-right">
                          <button
                            type="button"
                            onClick={() => setSelectedLog(log)}
                            className="inline-flex items-center rounded-lg border border-slate-700 bg-[#070b14] px-3 py-1.5 text-xs font-medium text-slate-200 transition-colors hover:border-cyan-500/50 hover:text-cyan-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400"
                          >
                            {t.viewDetailsBtn}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile Cards */}
            <div className="divide-y divide-slate-800/80 md:hidden">
              {auditResult.items.map((log) => {
                const severity = classifyAuditSeverity(log);
                const actionLabel = t.actionLabels[log.action] || log.action;
                const entityLabel =
                  t.entityTypeLabels[log.entityType] || log.entityType;

                return (
                  <div key={log.id} className="space-y-2.5 p-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="font-mono text-xs text-slate-400">
                        #{log.id}
                      </span>
                      <span
                        className={`rounded-full border px-2 py-0.5 font-mono text-[10px] ${
                          SEVERITY_BADGE_STYLES[severity]
                        }`}
                      >
                        {t.severityLabels[severity]}
                      </span>
                    </div>

                    <p className="text-xs font-semibold text-cyan-200">
                      {actionLabel}
                    </p>

                    <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-300">
                      <span>@{log.actorUsername || "system"}</span>
                      <span className="text-slate-400">{entityLabel}</span>
                    </div>

                    <time
                      dateTime={log.createdAt}
                      className="block font-mono text-[11px] text-slate-400"
                    >
                      {dateTimeFormatter.format(new Date(log.createdAt))}
                    </time>

                    <button
                      type="button"
                      onClick={() => setSelectedLog(log)}
                      className="min-h-[38px] w-full rounded-xl border border-slate-700 bg-[#070b14] px-3 py-2 text-center text-xs font-medium text-slate-200 transition-colors hover:border-cyan-500/50 hover:text-cyan-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400"
                    >
                      {t.viewDetailsBtn}
                    </button>
                  </div>
                );
              })}
            </div>

            {/* Pagination */}
            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-800 bg-[#080d1a] px-5 py-3.5 text-xs text-slate-400">
              <span className="font-mono">
                {t.pageIndicator(auditResult.page, auditResult.totalPages)}
              </span>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={auditResult.page <= 1}
                  className="rounded-lg border border-slate-800 bg-[#0c1220] px-3 py-1.5 text-xs text-slate-200 transition-colors hover:border-slate-700 hover:text-white disabled:cursor-not-allowed disabled:opacity-40 focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400"
                >
                  ← {t.prevPageBtn}
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setPage((p) => Math.min(auditResult.totalPages, p + 1))
                  }
                  disabled={auditResult.page >= auditResult.totalPages}
                  className="rounded-lg border border-slate-800 bg-[#0c1220] px-3 py-1.5 text-xs text-slate-200 transition-colors hover:border-slate-700 hover:text-white disabled:cursor-not-allowed disabled:opacity-40 focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400"
                >
                  {t.nextPageBtn} →
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Detail Modal */}
        <AdminAuditDetailModal
          log={selectedLog}
          onClose={() => setSelectedLog(null)}
        />
      </div>
    </AdminGuard>
  );
}
