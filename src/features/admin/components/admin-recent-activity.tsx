"use client";

import React from "react";
import Link from "next/link";
import type { AdminAuditEntry } from "../types";
import { useI18n } from "@/lib/i18n/context";

interface AdminRecentActivityProps {
  entries: readonly AdminAuditEntry[];
  loading?: boolean;
}

export function AdminRecentActivity({
  entries,
  loading = false,
}: AdminRecentActivityProps) {
  const { dict, locale } = useI18n();
  const t = dict.adminPanel.dashboard.recentActivity;
  const dateFormatter = new Intl.DateTimeFormat(locale, {
    dateStyle: "short",
    timeStyle: "short",
  });

  return (
    <section
      aria-label={t.title}
      className="flex flex-col rounded-2xl border border-slate-800/90 bg-[#0c1220]/90 p-5"
    >
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2.5 min-w-0">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-cyan-500/25 bg-cyan-500/10 text-cyan-400">
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
            </svg>
          </span>
          <h2 className="text-sm font-semibold tracking-wider text-slate-200 uppercase">
            {t.title}
          </h2>
        </div>

        <Link
          href="/admin/audit"
          className="font-mono text-xs text-cyan-400 transition-colors hover:text-cyan-300 hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400 rounded"
        >
          {t.viewAllCta} →
        </Link>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[0, 1, 2].map((item) => (
            <div key={item} className="h-14 animate-pulse rounded-xl bg-slate-800/50" />
          ))}
        </div>
      ) : entries.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-800 bg-[#080d1a] p-6 text-center text-xs text-slate-400">
          {t.empty}
        </div>
      ) : (
        <ol className="divide-y divide-slate-800/80">
          {entries.map((entry) => {
            const reason =
              typeof entry.metadata?.reason === "string"
                ? entry.metadata.reason
                : null;
            return (
              <li
                key={entry.id}
                className="flex flex-col gap-2 py-3.5 first:pt-1 last:pb-1 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0 space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded border border-cyan-500/30 bg-cyan-500/10 px-2 py-0.5 font-mono text-[10px] font-semibold uppercase text-cyan-300">
                      {entry.entityType}
                    </span>
                    <span className="font-mono text-xs font-semibold text-slate-100 break-all">
                      {entry.action}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 break-words">
                    {reason || `${t.targetLabel}: ${entry.entityId}`}
                  </p>
                </div>

                <div className="flex shrink-0 flex-wrap items-center gap-2 font-mono text-[11px] text-slate-400">
                  <span>
                    {t.operatorLabel}:{" "}
                    <strong className="text-slate-200">@{entry.actorUsername}</strong>
                  </span>
                  <span aria-hidden="true">•</span>
                  <time dateTime={entry.createdAt}>
                    {dateFormatter.format(new Date(entry.createdAt))}
                  </time>
                </div>
              </li>
            );
          })}
        </ol>
      )}
    </section>
  );
}
