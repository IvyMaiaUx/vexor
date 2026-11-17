"use client";

import React from "react";
import Link from "next/link";
import type { AdminResource } from "../types";
import { useI18n } from "@/lib/i18n/context";

interface AdminPendingResourcesPreviewProps {
  resources: readonly AdminResource[];
  loading?: boolean;
}

export function AdminPendingResourcesPreview({
  resources,
  loading = false,
}: AdminPendingResourcesPreviewProps) {
  const { dict, locale } = useI18n();
  const t = dict.adminPanel.dashboard.pendingResourcesPreview;
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
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-amber-500/25 bg-amber-500/10 text-amber-400">
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
            </svg>
          </span>
          <h2 className="text-sm font-semibold tracking-wider text-slate-200 uppercase">
            {t.title}
          </h2>
        </div>

        <Link
          href="/admin/catalog"
          className="font-mono text-xs text-amber-300 transition-colors hover:text-amber-200 hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 rounded"
        >
          {t.viewAllCta} →
        </Link>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[0, 1].map((item) => (
            <div key={item} className="h-16 animate-pulse rounded-xl bg-slate-800/50" />
          ))}
        </div>
      ) : resources.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-800 bg-[#080d1a] p-6 text-center text-xs text-slate-400">
          {t.empty}
        </div>
      ) : (
        <ul className="space-y-3">
          {resources.map((resource) => {
            const submittedAt = resource.createdAt ?? resource.publishedAt;
            return (
              <li
                key={resource.id}
                className="flex flex-col gap-3 rounded-xl border border-slate-800/80 bg-[#080d1a] p-3.5 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0 space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded border border-slate-700 bg-slate-900 px-2 py-0.5 font-mono text-[10px] uppercase text-cyan-300">
                      {t.categoryLabel}: {resource.category}
                    </span>
                    <span className="rounded border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 font-mono text-[10px] font-semibold uppercase text-amber-300">
                      {t.statusPending}
                    </span>
                  </div>
                  <p className="text-sm font-medium text-slate-100 break-words">
                    {resource.name}
                  </p>
                  {submittedAt && (
                    <p className="text-xs text-slate-400">
                      {t.submittedLabel}:{" "}
                      <time dateTime={submittedAt}>
                        {dateFormatter.format(new Date(submittedAt))}
                      </time>
                    </p>
                  )}
                </div>

                <Link
                  href="/admin/catalog"
                  className="inline-flex min-h-[36px] shrink-0 items-center justify-center rounded-lg border border-slate-700 bg-[#0c1220] px-3 py-1.5 text-xs font-medium text-slate-200 transition-colors hover:border-amber-500/50 hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400"
                >
                  {t.viewAllCta}
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
