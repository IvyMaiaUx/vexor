"use client";

import React from "react";
import Link from "next/link";
import type { AdminReport } from "../types";
import { useI18n } from "@/lib/i18n/context";

interface AdminReportsPreviewProps {
  reports: readonly AdminReport[];
  pendingCount: number;
  loading?: boolean;
}

export function AdminReportsPreview({
  reports,
  pendingCount,
  loading = false,
}: AdminReportsPreviewProps) {
  const { dict, locale } = useI18n();
  const t = dict.adminPanel.dashboard.reportsPreview;
  const rp = dict.adminPanel.reportsPage;
  const dateFormatter = new Intl.DateTimeFormat(locale, {
    dateStyle: "short",
    timeStyle: "short",
  });

  return (
    <section
      aria-label={t.title}
      className="flex flex-col rounded-2xl border border-slate-800/90 bg-[#0c1220]/90 p-5"
    >
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2.5 min-w-0">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-rose-500/25 bg-rose-500/10 text-rose-400">
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v4m0 4h.01M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z" />
            </svg>
          </span>
          <h2 className="text-sm font-semibold tracking-wider text-slate-200 uppercase">
            {t.title}
          </h2>
          <span className="rounded-full border border-rose-500/40 bg-rose-500/15 px-2.5 py-0.5 font-mono text-[10px] font-bold text-rose-300">
            {t.pendingCountBadge(pendingCount)}
          </span>
        </div>

        <Link
          href="/admin/reports"
          className="font-mono text-xs text-rose-300 transition-colors hover:text-rose-200 hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-400 rounded"
        >
          {t.viewAllCta} →
        </Link>
      </div>

      <p className="mb-4 text-[11px] text-slate-400">{t.privacyNotice}</p>

      {loading ? (
        <div className="space-y-3">
          {[0, 1].map((item) => (
            <div key={item} className="h-16 animate-pulse rounded-xl bg-slate-800/50" />
          ))}
        </div>
      ) : reports.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-800 bg-[#080d1a] p-6 text-center text-xs text-slate-400">
          {t.empty}
        </div>
      ) : (
        <ul className="space-y-3">
          {reports.map((report) => {
            const reasonLabel = rp.reasonLabels[report.reason] ?? report.reason;
            const targetLabel = rp.targetLabels[report.targetType] ?? report.targetType;
            const statusLabel = rp.statusLabels[report.status] ?? report.status;
            return (
              <li
                key={report.id}
                className="flex flex-col gap-2 rounded-xl border border-slate-800/80 bg-[#080d1a] p-3.5 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0 space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded border border-rose-500/30 bg-rose-500/10 px-2 py-0.5 font-mono text-[10px] font-semibold uppercase text-rose-300">
                      {reasonLabel}
                    </span>
                    <span className="rounded border border-slate-700 bg-slate-900 px-2 py-0.5 font-mono text-[10px] uppercase text-slate-300">
                      {targetLabel}
                    </span>
                    <span className="font-mono text-[10px] text-amber-300">
                      {statusLabel}
                    </span>
                  </div>
                  <p className="text-xs text-slate-300 break-words">
                    {report.targetTitle}
                  </p>
                </div>

                <div className="shrink-0 font-mono text-[11px] text-slate-400">
                  {t.receivedLabel}:{" "}
                  <time dateTime={report.createdAt}>
                    {dateFormatter.format(new Date(report.createdAt))}
                  </time>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
