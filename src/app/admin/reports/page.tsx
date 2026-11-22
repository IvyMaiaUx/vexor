"use client";

import React, { useEffect, useMemo, useState } from "react";
import { AdminGuard } from "@/features/admin/components/admin-guard";
import { AdminReportModal } from "@/features/admin/components/admin-report-modal";
import { adminDataProvider } from "@/features/admin/services/admin-provider";
import type {
  Report,
  ReportReason,
  ReportTargetType,
} from "@/features/admin/types";
import { useI18n } from "@/lib/i18n/context";

type ReportsTab = "open" | "reviewing" | "resolved";

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

export default function AdminReportsPage() {
  const { dict, locale } = useI18n();
  const isPt = locale === "pt-BR";
  const rt = dict.adminPanel.reportsPage;

  const [allReports, setAllReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<ReportsTab>("open");
  const [searchQuery, setSearchQuery] = useState("");
  const [reasonFilter, setReasonFilter] = useState<ReportReason | "all">("all");
  const [targetFilter, setTargetFilter] = useState<ReportTargetType | "all">(
    "all"
  );
  const [filterSheetOpen, setFilterSheetOpen] = useState(false);

  const [activeReport, setActiveReport] = useState<Report | null>(null);
  const [successToast, setSuccessToast] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let mounted = true;
    adminDataProvider.reports
      .listReports({}, { page: 1, pageSize: 100 })
      .then((res) => {
        if (mounted) {
          setAllReports(res.items);
          setLoading(false);
        }
      })
      .catch(() => {
        if (mounted) setLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, [reloadKey]);

  const counts = useMemo(
    () => ({
      open: allReports.filter((r) => r.status === "open").length,
      reviewing: allReports.filter((r) => r.status === "reviewing").length,
      resolved: allReports.filter(
        (r) => r.status === "resolved" || r.status === "dismissed"
      ).length,
    }),
    [allReports]
  );

  const targetCountMap = useMemo(() => {
    const map = new Map<string, number>();
    allReports.forEach((r) => {
      const key = `${r.targetType}:${r.targetId}`;
      map.set(key, (map.get(key) ?? 0) + 1);
    });
    return map;
  }, [allReports]);

  const filteredReports = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return allReports.filter((r) => {
      if (activeTab === "open" && r.status !== "open") return false;
      if (activeTab === "reviewing" && r.status !== "reviewing") return false;
      if (
        activeTab === "resolved" &&
        r.status !== "resolved" &&
        r.status !== "dismissed"
      ) {
        return false;
      }
      if (reasonFilter !== "all" && r.reason !== reasonFilter) return false;
      if (targetFilter !== "all" && r.targetType !== targetFilter) return false;
      if (!q) return true;
      return (
        (r.targetTitle ?? "").toLowerCase().includes(q) ||
        (r.targetSnippet ?? "").toLowerCase().includes(q) ||
        (r.details ?? "").toLowerCase().includes(q) ||
        r.reason.toLowerCase().includes(q)
      );
    });
  }, [allReports, activeTab, reasonFilter, targetFilter, searchQuery]);

  const hasSheetFilters = reasonFilter !== "all" || targetFilter !== "all";

  const reasonsList: ReportReason[] = [
    "spam",
    "malicious_content",
    "personal_data",
    "harassment",
    "unauthorized_attack",
    "copyright",
    "other",
  ];
  const targetList: ReportTargetType[] = [
    "topic",
    "post",
    "resource",
    "profile",
  ];

  return (
    <AdminGuard>
      <div className="space-y-3">
        {/* Header */}
        <div>
          <h1 className="text-[26px] font-bold leading-tight tracking-tight text-slate-100">
            {isPt ? "Denúncias" : "Reports"}
          </h1>
          <p className="mt-0.5 text-sm text-slate-400">
            {isPt
              ? "Conteúdo reportado pela comunidade."
              : "Content reported by the community."}
          </p>
        </div>

        {successToast && (
          <div
            role="status"
            className="flex items-center justify-between gap-2 rounded-xl border border-emerald-500/40 bg-emerald-500/10 px-3.5 py-2.5 text-xs text-emerald-300"
          >
            <span>{successToast}</span>
            <button
              type="button"
              onClick={() => setSuccessToast(null)}
              className="px-1.5 text-slate-400 hover:text-white"
            >
              ✕
            </button>
          </div>
        )}

        {/* Tabs: Pendentes / Em análise / Resolvidas */}
        <div
          role="tablist"
          className="no-scrollbar -mx-4 flex gap-1.5 overflow-x-auto px-4 sm:mx-0 sm:px-0"
        >
          {(
            [
              {
                id: "open",
                label: isPt ? "Pendentes" : "Pending",
                count: counts.open,
              },
              {
                id: "reviewing",
                label: isPt ? "Em análise" : "Reviewing",
                count: counts.reviewing,
              },
              {
                id: "resolved",
                label: isPt ? "Resolvidas" : "Resolved",
                count: counts.resolved,
              },
            ] as const
          ).map((tab) => {
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => setActiveTab(tab.id)}
                className={`inline-flex min-h-[44px] shrink-0 items-center gap-1.5 rounded-full border px-4 text-sm font-medium transition-colors ${
                  active
                    ? "border-cyan-500/50 bg-cyan-500/15 text-cyan-300"
                    : "border-slate-800 bg-[#0b1220] text-slate-300 hover:border-slate-700"
                }`}
              >
                <span>{tab.label}</span>
                <span className="font-mono text-xs">{tab.count}</span>
              </button>
            );
          })}
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
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={isPt ? "Buscar denúncia" : "Search reports"}
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

        {/* Reports List */}
        {loading ? (
          <div className="space-y-3">
            {[1, 2].map((i) => (
              <div
                key={i}
                className="h-36 animate-pulse rounded-2xl border border-slate-800 bg-[#0b1220]/70"
              />
            ))}
          </div>
        ) : filteredReports.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-800 bg-[#0b1220]/50 p-10 text-center text-sm text-slate-400">
            {isPt
              ? "Nenhuma denúncia nesta aba."
              : "No reports in this tab."}
          </div>
        ) : (
          <div className="space-y-3">
            {filteredReports.map((report) => {
              const targetCount =
                targetCountMap.get(`${report.targetType}:${report.targetId}`) ??
                1;
              const excerpt =
                report.targetSnippet ||
                report.targetTitle ||
                report.details ||
                (isPt ? "Conteúdo denunciado" : "Reported content");

              return (
                <article
                  key={report.id}
                  className="rounded-2xl border border-slate-800 bg-[#0b1220] p-4 space-y-2.5"
                >
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="inline-flex h-[22px] items-center rounded-md border border-rose-500/40 bg-rose-950/50 px-2 font-mono text-[10px] font-semibold uppercase text-rose-300">
                      {rt.reasonLabels[report.reason]}
                    </span>
                    <span className="inline-flex h-[22px] items-center rounded-md border border-slate-700 bg-slate-800/70 px-2 font-mono text-[10px] font-semibold uppercase text-slate-300">
                      {rt.targetLabels[report.targetType]}
                    </span>
                    <span className="inline-flex h-[22px] items-center rounded-md border border-amber-500/40 bg-amber-950/40 px-2 font-mono text-[10px] font-semibold uppercase text-amber-300">
                      {targetCount}{" "}
                      {targetCount === 1
                        ? isPt
                          ? "DENÚNCIA"
                          : "REPORT"
                        : isPt
                          ? "DENÚNCIAS"
                          : "REPORTS"}
                    </span>
                  </div>

                  <p className="border-l-2 border-slate-700 pl-3 text-sm leading-relaxed text-slate-100 line-clamp-3">
                    {excerpt}
                  </p>

                  <div className="text-xs text-slate-400">
                    {isPt
                      ? "Denunciante: identidade oculta"
                      : "Reporter: identity hidden"}{" "}
                    · {formatRelativeTime(report.createdAt, isPt)}
                  </div>

                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setActiveReport(report)}
                      className="inline-flex min-h-[44px] flex-1 items-center justify-center rounded-xl border border-rose-500/35 bg-rose-500/10 px-3 text-sm font-semibold text-rose-300 transition-colors hover:bg-rose-500/20"
                    >
                      {isPt ? "Remover" : "Remove"}
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveReport(report)}
                      className="inline-flex min-h-[44px] flex-1 items-center justify-center rounded-xl border border-slate-800 bg-[#080e1a] px-3 text-sm font-medium text-slate-200 transition-colors hover:border-slate-700"
                    >
                      {isPt ? "Ignorar" : "Dismiss"}
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveReport(report)}
                      aria-label={isPt ? "Ver contexto" : "View context"}
                      className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-slate-800 bg-[#080e1a] text-slate-200 transition-colors hover:border-cyan-500/40 hover:text-cyan-300"
                    >
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className="h-[18px] w-[18px]" aria-hidden="true">
                        <path d="M9 6l6 6-6 6" />
                      </svg>
                    </button>
                  </div>
                </article>
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
                    setReasonFilter("all");
                    setTargetFilter("all");
                  }}
                  className="min-h-[44px] px-2 text-sm text-slate-400 hover:text-slate-200"
                >
                  {isPt ? "Limpar tudo" : "Clear all"}
                </button>
              </div>

              <div>
                <p className="mb-2 font-mono text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                  {isPt ? "Motivo" : "Reason"}
                </p>
                <div className="flex flex-wrap gap-1.5">
                  <button
                    type="button"
                    onClick={() => setReasonFilter("all")}
                    className={`min-h-[40px] rounded-full border px-3 text-xs ${
                      reasonFilter === "all"
                        ? "border-cyan-500/50 bg-cyan-500/15 text-cyan-300"
                        : "border-slate-800 bg-[#080e1a] text-slate-300"
                    }`}
                  >
                    {isPt ? "Todos" : "All"}
                  </button>
                  {reasonsList.map((r) => (
                    <button
                      key={r}
                      type="button"
                      onClick={() => setReasonFilter(r)}
                      className={`min-h-[40px] rounded-full border px-3 text-xs ${
                        reasonFilter === r
                          ? "border-cyan-500/50 bg-cyan-500/15 text-cyan-300"
                          : "border-slate-800 bg-[#080e1a] text-slate-300"
                      }`}
                    >
                      {rt.reasonLabels[r]}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <p className="mb-2 font-mono text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                  {isPt ? "Tipo de alvo" : "Target type"}
                </p>
                <div className="flex flex-wrap gap-1.5">
                  <button
                    type="button"
                    onClick={() => setTargetFilter("all")}
                    className={`min-h-[40px] rounded-full border px-3 text-xs ${
                      targetFilter === "all"
                        ? "border-cyan-500/50 bg-cyan-500/15 text-cyan-300"
                        : "border-slate-800 bg-[#080e1a] text-slate-300"
                    }`}
                  >
                    {isPt ? "Todos" : "All"}
                  </button>
                  {targetList.map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setTargetFilter(t)}
                      className={`min-h-[40px] rounded-full border px-3 text-xs ${
                        targetFilter === t
                          ? "border-cyan-500/50 bg-cyan-500/15 text-cyan-300"
                          : "border-slate-800 bg-[#080e1a] text-slate-300"
                      }`}
                    >
                      {rt.targetLabels[t]}
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

        {activeReport && (
          <AdminReportModal
            report={activeReport}
            onClose={() => setActiveReport(null)}
            onSuccess={() => {
              setActiveReport(null);
              setSuccessToast(
                isPt
                  ? "Denúncia atualizada e registrada na auditoria."
                  : "Report updated and logged to audit."
              );
              setReloadKey((k) => k + 1);
              setTimeout(() => setSuccessToast(null), 4500);
            }}
          />
        )}
      </div>
    </AdminGuard>
  );
}
