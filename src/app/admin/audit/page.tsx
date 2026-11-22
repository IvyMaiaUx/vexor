"use client";

import React, { Suspense, useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
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
} from "@/features/admin/utils/audit-export";
import { useI18n } from "@/lib/i18n/context";

function formatRelativeTime(iso: string, isPt: boolean): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return isPt ? "agora" : "now";
  if (mins < 60) return isPt ? `há ${mins} min` : `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return isPt ? `há ${hours} h` : `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days === 1) return isPt ? "ontem" : "yesterday";
  return isPt ? `há ${days} d` : `${days}d ago`;
}

function severityDotClass(severity: AuditSeverity): string {
  if (severity === "critical") return "bg-rose-400";
  if (severity === "access_denied" || severity === "warning") return "bg-amber-400";
  return "bg-indigo-400";
}

function AdminAuditContent() {
  const { dict, locale } = useI18n();
  const isPt = locale === "pt-BR";
  const t = dict.adminPanel.auditPage;
  const searchParams = useSearchParams();

  const initialEntity = searchParams?.get("entity") || "all";

  const [searchInput, setSearchInput] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [entityFilter, setEntityFilter] = useState(initialEntity);
  const [severityFilter, setSeverityFilter] = useState<AuditSeverity | "all">(
    "all"
  );
  const [periodFilter, setPeriodFilter] = useState<AuditPeriodFilter>("all");
  const [filterSheetOpen, setFilterSheetOpen] = useState(false);

  const [auditResult, setAuditResult] = useState<
    PaginatedResult<AdminAuditEntry>
  >({
    items: [],
    total: 0,
    page: 1,
    pageSize: 50,
    totalPages: 1,
  });
  const [summary, setSummary] = useState<AdminAuditSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [selectedLog, setSelectedLog] = useState<AdminAuditEntry | null>(null);
  const [exportFeedback, setExportFeedback] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(searchInput.trim());
    }, 250);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const buildFilters = useCallback((): AdminAuditFilters => {
    return {
      query: debouncedQuery || undefined,
      entityType: entityFilter,
      severity: severityFilter,
      period: periodFilter,
      sortOrder: "desc",
    };
  }, [debouncedQuery, entityFilter, severityFilter, periodFilter]);

  const fetchAuditSnapshot = useCallback(async () => {
    const [listRes, summaryRes] = await Promise.all([
      adminDataProvider.audit.listAuditEntries(buildFilters(), {
        page: 1,
        pageSize: 50,
      }),
      adminDataProvider.audit.getAuditSummary(),
    ]);
    return { listRes, summaryRes };
  }, [buildFilters]);

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
      setExportFeedback(
        ok
          ? { type: "success", text: t.exportSuccess(allMatching.length) }
          : { type: "error", text: t.exportError }
      );
      setTimeout(() => setExportFeedback(null), 4000);
    } catch {
      setExportFeedback({ type: "error", text: t.exportError });
    }
  };

  const hasSheetFilters =
    entityFilter !== "all" ||
    severityFilter !== "all" ||
    periodFilter !== "all";

  return (
    <AdminGuard requireAdmin={true}>
      <div className="space-y-3">
        {/* Header: Short title + Export CSV icon button */}
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="text-[26px] font-bold leading-tight tracking-tight text-slate-100">
              {isPt ? "Auditoria" : "Audit"}
            </h1>
            <p className="mt-0.5 text-sm text-slate-400">
              {isPt
                ? "Registro somente leitura das ações administrativas."
                : "Read-only log of administrative actions."}
            </p>
          </div>

          <button
            type="button"
            onClick={() => void handleExportCsv()}
            aria-label={isPt ? "Exportar CSV" : "Export CSV"}
            title={isPt ? "Exportar CSV" : "Export CSV"}
            className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-slate-800 bg-[#0b1220] text-slate-200 transition-colors hover:border-cyan-500/40 hover:text-cyan-300"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className="h-[22px] w-[22px]" aria-hidden="true">
              <path d="M12 3v12M7 10l5 5 5-5M4 20h16" />
            </svg>
          </button>
        </div>

        {exportFeedback && (
          <div
            role="status"
            className={`rounded-xl border px-3.5 py-2.5 text-xs ${
              exportFeedback.type === "success"
                ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-300"
                : "border-rose-500/40 bg-rose-500/10 text-rose-200"
            }`}
          >
            {exportFeedback.text}
          </div>
        )}

        {/* Summary Strip */}
        <div className="no-scrollbar -mx-4 flex gap-1.5 overflow-x-auto px-4 sm:mx-0 sm:px-0">
          <span className="inline-flex min-h-[40px] shrink-0 items-center gap-1.5 rounded-full border border-slate-800 bg-[#0b1220] px-3.5 text-sm text-slate-300">
            <strong className="font-mono text-slate-100">
              {summary?.totalEvents ?? 0}
            </strong>
            <span>{isPt ? "eventos" : "events"}</span>
          </span>
          <span className="inline-flex min-h-[40px] shrink-0 items-center gap-1.5 rounded-full border border-slate-800 bg-[#0b1220] px-3.5 text-sm text-slate-300">
            <strong className="font-mono text-rose-300">
              {summary?.criticalEvents ?? 0}
            </strong>
            <span>{isPt ? "críticos" : "critical"}</span>
          </span>
          <span className="inline-flex min-h-[40px] shrink-0 items-center gap-1.5 rounded-full border border-slate-800 bg-[#0b1220] px-3.5 text-sm text-slate-300">
            <strong className="font-mono text-indigo-300">
              {summary?.adminChanges ?? 0}
            </strong>
            <span>{isPt ? "alterações" : "changes"}</span>
          </span>
          <span className="inline-flex min-h-[40px] shrink-0 items-center gap-1.5 rounded-full border border-slate-800 bg-[#0b1220] px-3.5 text-sm text-slate-300">
            <strong className="font-mono text-amber-400">
              {summary?.accessDeniedEvents ?? 0}
            </strong>
            <span>{isPt ? "acessos negados" : "access denied"}</span>
          </span>
          <span className="inline-flex min-h-[40px] shrink-0 items-center gap-1.5 rounded-full border border-slate-800 bg-[#0b1220] px-3.5 text-sm text-slate-300">
            <strong className="font-mono text-cyan-400">
              {summary?.recentEvents ?? 0}
            </strong>
            <span>{isPt ? "últimas 24 h" : "last 24h"}</span>
          </span>
        </div>

        {/* Search + Filter Button */}
        <div className="flex gap-2">
          <label className="flex min-h-[48px] flex-1 items-center gap-2 rounded-xl border border-slate-800 bg-[#0b1220] px-3 text-slate-400 focus-within:border-cyan-500/60">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className="h-[18px] w-[18px] shrink-0" aria-hidden="true">
              <circle cx="11" cy="11" r="7" />
              <path d="M21 21l-4.3-4.3" />
            </svg>
            <input
              type="search"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder={
                isPt
                  ? "Buscar por operador, entidade ou ação"
                  : "Search by operator, entity, or action"
              }
              aria-label={isPt ? "Buscar" : "Search"}
              className="w-full min-w-0 bg-transparent text-[15px] text-slate-100 placeholder:text-slate-500 focus:outline-none"
            />
          </label>

          <button
            type="button"
            onClick={() => setFilterSheetOpen(true)}
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

        {/* Severity-colored Timeline */}
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="h-16 animate-pulse rounded-xl border border-slate-800 bg-[#0b1220]/70"
              />
            ))}
          </div>
        ) : loadError ? (
          <div className="rounded-2xl border border-rose-500/40 bg-rose-500/10 p-6 text-center text-sm text-rose-200">
            {t.errorMessage}
          </div>
        ) : auditResult.items.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-800 bg-[#0b1220]/40 p-6 text-center text-sm text-slate-400">
            {isPt
              ? "Nenhum evento registrado."
              : "No events recorded."}
          </div>
        ) : (
          <div className="divide-y divide-slate-800/80 rounded-2xl border border-slate-800 bg-[#0b1220] px-4">
            {auditResult.items.map((entry) => {
              const severity = classifyAuditSeverity(entry);
              return (
                <button
                  key={entry.id}
                  type="button"
                  onClick={() => setSelectedLog(entry)}
                  className="flex min-h-[56px] w-full items-start gap-3 py-3 text-left transition-colors hover:opacity-90"
                >
                  <span
                    aria-hidden="true"
                    className={`mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full ${severityDotClass(severity)}`}
                  />
                  <div className="min-w-0 flex-1">
                    <div className="text-[15px] font-medium text-slate-100">
                      {entry.action}
                    </div>
                    <div className="mt-0.5 text-xs text-slate-400">
                      @{entry.actorUsername || "sistema"} ·{" "}
                      {formatRelativeTime(entry.createdAt, isPt)} ·{" "}
                      {entry.entityType}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        )}

        {/* Filter Sheet */}
        {filterSheetOpen && (
          <div
            role="dialog"
            aria-modal="true"
            className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 backdrop-blur-sm sm:items-center sm:p-4"
            onClick={() => setFilterSheetOpen(false)}
          >
            <div
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-md rounded-t-3xl border border-slate-800 bg-[#0b1220] px-5 pb-6 pt-3 space-y-4 sm:rounded-3xl sm:p-6"
            >
              <div className="mx-auto h-1 w-10 rounded-full bg-slate-700 sm:hidden" />
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-slate-100">
                  {isPt ? "Filtros" : "Filters"}
                </h2>
                <button
                  type="button"
                  onClick={() => {
                    setEntityFilter("all");
                    setSeverityFilter("all");
                    setPeriodFilter("all");
                  }}
                  className="min-h-[44px] px-2 text-sm text-slate-400 hover:text-slate-200"
                >
                  {isPt ? "Limpar tudo" : "Clear all"}
                </button>
              </div>

              <div>
                <p className="mb-2 font-mono text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                  {isPt ? "Gravidade" : "Severity"}
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {(
                    [
                      { id: "all", label: isPt ? "Todas" : "All" },
                      { id: "critical", label: isPt ? "Crítico" : "Critical" },
                      { id: "warning", label: isPt ? "Aviso" : "Warning" },
                      {
                        id: "access_denied",
                        label: isPt ? "Acesso negado" : "Access denied",
                      },
                      { id: "info", label: isPt ? "Informativo" : "Info" },
                    ] as const
                  ).map((opt) => (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => setSeverityFilter(opt.id)}
                      className={`min-h-[40px] rounded-full border px-3 text-xs ${
                        severityFilter === opt.id
                          ? "border-cyan-500/50 bg-cyan-500/15 text-cyan-300"
                          : "border-slate-800 bg-[#080e1a] text-slate-300"
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <p className="mb-2 font-mono text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                  {isPt ? "Entidade" : "Entity"}
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {[
                    { id: "all", label: isPt ? "Todas" : "All" },
                    { id: "profile", label: isPt ? "Usuários" : "Users" },
                    { id: "resource", label: isPt ? "Catálogo" : "Catalog" },
                    { id: "topic", label: isPt ? "Fórum" : "Forum" },
                    { id: "post", label: isPt ? "Comentários" : "Comments" },
                    { id: "report", label: isPt ? "Denúncias" : "Reports" },
                  ].map((opt) => (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => setEntityFilter(opt.id)}
                      className={`min-h-[40px] rounded-full border px-3 text-xs ${
                        entityFilter === opt.id
                          ? "border-cyan-500/50 bg-cyan-500/15 text-cyan-300"
                          : "border-slate-800 bg-[#080e1a] text-slate-300"
                      }`}
                    >
                      {opt.label}
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
                      { id: "all", label: isPt ? "Todo o período" : "All time" },
                      { id: "today", label: isPt ? "Hoje" : "Today" },
                      { id: "7d", label: isPt ? "7 dias" : "7 days" },
                      { id: "30d", label: isPt ? "30 dias" : "30 days" },
                    ] as const
                  ).map((opt) => (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => setPeriodFilter(opt.id)}
                      className={`min-h-[40px] rounded-full border px-3 text-xs ${
                        periodFilter === opt.id
                          ? "border-cyan-500/50 bg-cyan-500/15 text-cyan-300"
                          : "border-slate-800 bg-[#080e1a] text-slate-300"
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              <button
                type="button"
                onClick={() => setFilterSheetOpen(false)}
                className="inline-flex min-h-[48px] w-full items-center justify-center rounded-xl bg-cyan-500 text-sm font-bold text-slate-950 hover:bg-cyan-400"
              >
                {isPt ? "Aplicar filtros" : "Apply filters"}
              </button>
            </div>
          </div>
        )}

        {selectedLog && (
          <AdminAuditDetailModal
            log={selectedLog}
            onClose={() => setSelectedLog(null)}
          />
        )}
      </div>
    </AdminGuard>
  );
}

export default function AdminAuditPage() {
  return (
    <Suspense fallback={<div className="h-48 animate-pulse rounded-2xl bg-[#0b1220]" />}>
      <AdminAuditContent />
    </Suspense>
  );
}
