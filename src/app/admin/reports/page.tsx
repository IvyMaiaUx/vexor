"use client";

import React, { useEffect, useState } from "react";
import type {
  Report,
  ReportReason,
  ReportStatus,
  ReportTargetType,
} from "@/features/admin/types";
import { AdminGuard } from "@/features/admin/components/admin-guard";
import { adminDataProvider } from "@/features/admin/services/admin-provider";
import { useI18n } from "@/lib/i18n/context";
import { AdminReportModal } from "@/features/admin/components/admin-report-modal";

export default function AdminReportsPage() {
  const { dict } = useI18n();

  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [statusFilter, setStatusFilter] = useState<ReportStatus | "all">("all");
  const [reasonFilter, setReasonFilter] = useState<ReportReason | "all">("all");
  const [targetFilter, setTargetFilter] = useState<ReportTargetType | "all">("all");

  // Selected report for modal
  const [activeReport, setActiveReport] = useState<Report | null>(null);
  const [successToast, setSuccessToast] = useState<string | null>(null);

  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let mounted = true;
    adminDataProvider.reports
      .listReports(
        {
          status: statusFilter,
          reason: reasonFilter,
          targetType: targetFilter,
        },
        { page: 1, pageSize: 100 }
      )
      .then((res) => {
        if (mounted) {
          setReports(res.items);
          setLoading(false);
        }
      })
      .catch(() => {
        if (mounted) setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, [statusFilter, reasonFilter, targetFilter, reloadKey]);

  const reasonsList: ReportReason[] = [
    "spam",
    "malicious_content",
    "personal_data",
    "harassment",
    "unauthorized_attack",
    "copyright",
    "other",
  ];

  const targetList: ReportTargetType[] = ["topic", "post", "resource", "profile"];

  const getStatusBadgeClass = (status: ReportStatus) => {
    switch (status) {
      case "open":
        return "border-rose-500/40 bg-rose-500/15 text-rose-300";
      case "reviewing":
        return "border-amber-500/40 bg-amber-500/15 text-amber-300";
      case "resolved":
        return "border-emerald-500/40 bg-emerald-500/15 text-emerald-300";
      case "dismissed":
        return "border-slate-700 bg-slate-800 text-slate-400";
      default:
        return "border-slate-700 bg-slate-800 text-slate-400";
    }
  };

  return (
    <AdminGuard>
      <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <span className="font-mono text-xs uppercase tracking-wider text-rose-400">
            {dict.adminPanel.reportsPage.eyebrow}
          </span>
          <h1 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">
            {dict.adminPanel.reportsPage.title}
          </h1>
          <p className="mt-1 text-sm text-slate-400">
            {dict.adminPanel.reportsPage.subtitle}
          </p>
        </div>

        {successToast && (
          <div className="flex items-center gap-2 rounded-xl border border-emerald-500/40 bg-emerald-500/10 px-4 py-2 font-mono text-xs text-emerald-300">
            <span>✓</span>
            <span>{successToast}</span>
            <button
              type="button"
              onClick={() => setSuccessToast(null)}
              className="ml-2 text-slate-400 hover:text-white"
            >
              ✕
            </button>
          </div>
        )}
      </div>

      {/* Filter Toolbar */}
      <div className="grid grid-cols-1 gap-3 rounded-2xl border border-slate-800/80 bg-[#0c1220]/70 p-4 sm:grid-cols-3">
        {/* Status Filter */}
        <div>
          <label className="block text-[11px] font-semibold text-slate-400 uppercase">
            {dict.adminPanel.reportsPage.filterStatus}
          </label>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as ReportStatus | "all")}
            className="mt-1.5 w-full rounded-xl border border-slate-700 bg-[#070b14] px-3 py-2 text-xs text-slate-200 focus:border-cyan-500 focus:outline-none"
          >
            <option value="all">{dict.adminPanel.reportsPage.allStatuses}</option>
            <option value="open">{dict.adminPanel.reportsPage.statusLabels.open}</option>
            <option value="reviewing">{dict.adminPanel.reportsPage.statusLabels.reviewing}</option>
            <option value="resolved">{dict.adminPanel.reportsPage.statusLabels.resolved}</option>
            <option value="dismissed">{dict.adminPanel.reportsPage.statusLabels.dismissed}</option>
          </select>
        </div>

        {/* Reason Filter */}
        <div>
          <label className="block text-[11px] font-semibold text-slate-400 uppercase">
            {dict.adminPanel.reportsPage.filterReason}
          </label>
          <select
            value={reasonFilter}
            onChange={(e) => setReasonFilter(e.target.value as ReportReason | "all")}
            className="mt-1.5 w-full rounded-xl border border-slate-700 bg-[#070b14] px-3 py-2 text-xs text-slate-200 focus:border-cyan-500 focus:outline-none"
          >
            <option value="all">{dict.adminPanel.reportsPage.allReasons}</option>
            {reasonsList.map((r) => (
              <option key={r} value={r}>
                {dict.adminPanel.reportsPage.reasonLabels[r]}
              </option>
            ))}
          </select>
        </div>

        {/* Target Type Filter */}
        <div>
          <label className="block text-[11px] font-semibold text-slate-400 uppercase">
            {dict.adminPanel.reportsPage.filterTarget}
          </label>
          <select
            value={targetFilter}
            onChange={(e) => setTargetFilter(e.target.value as ReportTargetType | "all")}
            className="mt-1.5 w-full rounded-xl border border-slate-700 bg-[#070b14] px-3 py-2 text-xs text-slate-200 focus:border-cyan-500 focus:outline-none"
          >
            <option value="all">{dict.adminPanel.reportsPage.allTargets}</option>
            {targetList.map((t) => (
              <option key={t} value={t}>
                {dict.adminPanel.reportsPage.targetLabels[t]}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Reports Feed */}
      <div className="space-y-4">
        {loading ? (
          <div className="rounded-2xl border border-slate-800 bg-[#0c1220]/50 p-12 text-center text-xs text-slate-400">
            Carregando denúncias e registros de incidentes...
          </div>
        ) : reports.length === 0 ? (
          <div className="rounded-2xl border border-slate-800/80 bg-[#0c1220]/40 p-12 text-center">
            <span className="text-3xl">🛡️</span>
            <p className="mt-3 text-sm font-semibold text-slate-200">
              {dict.adminPanel.reportsPage.emptyState}
            </p>
          </div>
        ) : (
          reports.map((report) => (
            <div
              key={report.id}
              className="rounded-2xl border border-slate-800 bg-[#0c1220] p-5 transition-all hover:border-slate-700"
            >
              <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
                <div className="space-y-2 min-w-0 flex-1">
                  {/* Badges row */}
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={`rounded-md border px-2 py-0.5 font-mono text-[10px] font-bold uppercase tracking-wider ${getStatusBadgeClass(
                        report.status
                      )}`}
                    >
                      {dict.adminPanel.reportsPage.statusLabels[report.status]}
                    </span>

                    <span className="rounded-md border border-slate-700 bg-slate-800/80 px-2 py-0.5 font-mono text-[10px] text-slate-300">
                      {dict.adminPanel.reportsPage.targetLabels[report.targetType]}
                    </span>

                    <span className="rounded-md border border-rose-500/30 bg-rose-500/10 px-2 py-0.5 font-mono text-[10px] text-rose-300">
                      {dict.adminPanel.reportsPage.reasonLabels[report.reason]}
                    </span>

                    <span className="font-mono text-xs text-slate-500">
                      ID: #{report.id}
                    </span>
                  </div>

                  {/* Title / Target info */}
                  <h3 className="text-base font-bold text-slate-100">
                    {report.targetTitle || `Objeto denunciado: ${report.targetId}`}
                  </h3>

                  {/* Target snippet if any */}
                  {report.targetSnippet && (
                    <div className="rounded-xl border border-slate-800/80 bg-[#070b14] p-3 text-xs text-slate-300">
                      <span className="block font-semibold text-slate-400 text-[10px] uppercase">
                        Conteúdo Denunciado:
                      </span>
                      <p className="mt-1 italic">&ldquo;{report.targetSnippet}&rdquo;</p>
                    </div>
                  )}

                  {/* Reporter details */}
                  {report.details && (
                    <p className="text-xs text-slate-300">
                      <strong className="text-slate-400">
                        {dict.adminPanel.reportsPage.detailsLabel}:
                      </strong>{" "}
                      &ldquo;{report.details}&rdquo;
                    </p>
                  )}

                  {/* Meta: Denunciante, Data, Resolução */}
                  <div className="flex flex-wrap items-center gap-4 pt-2 font-mono text-xs text-slate-400 border-t border-slate-800/60">
                    <span>
                      {dict.adminPanel.reportsPage.reportedBy}:{" "}
                      <span className="text-slate-300">
                        {dict.adminPanel.moderationPage.reporterProtected}
                      </span>
                    </span>
                    <span>•</span>
                    <span>
                      {new Date(report.createdAt).toLocaleString()}
                    </span>

                    {report.handledByUsername && (
                      <>
                        <span>•</span>
                        <span className="text-emerald-400">
                          {dict.adminPanel.reportsPage.handledBy} @{report.handledByUsername}
                        </span>
                      </>
                    )}
                  </div>

                  {/* Resolution note display if resolved/dismissed */}
                  {report.resolutionNote && (
                    <div className="mt-2 rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-3 text-xs text-emerald-200">
                      <strong className="block font-mono text-[10px] uppercase text-emerald-400">
                        {dict.adminPanel.reportsPage.resolutionNoteLabel}:
                      </strong>
                      <p className="mt-0.5">{report.resolutionNote}</p>
                    </div>
                  )}
                </div>

                {/* Action button */}
                <div className="flex shrink-0 items-center">
                  <button
                    type="button"
                    onClick={() => setActiveReport(report)}
                    className="inline-flex min-h-[40px] items-center justify-center rounded-xl bg-cyan-500 px-4 py-2 text-xs font-semibold text-slate-950 shadow-[0_0_15px_rgba(6,182,212,0.2)] hover:bg-cyan-400"
                  >
                    ⚙️ {dict.adminPanel.reportsPage.resolveBtn}
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Modal de Resolução */}
      {activeReport && (
        <AdminReportModal
          key={activeReport.id}
          report={activeReport}
          onClose={() => setActiveReport(null)}
          onSuccess={() => {
            setSuccessToast("Denúncia atualizada com sucesso na trilha de auditoria demonstrativa.");
            setReloadKey((prev) => prev + 1);
          }}
        />
      )}
      </div>
    </AdminGuard>
  );
}
