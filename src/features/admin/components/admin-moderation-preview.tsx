"use client";

import React from "react";
import Link from "next/link";
import type { ModerationQueueItem } from "../types";
import { useI18n } from "@/lib/i18n/context";

interface AdminModerationPreviewProps {
  items: readonly ModerationQueueItem[];
  loading?: boolean;
}

export function AdminModerationPreview({
  items,
  loading = false,
}: AdminModerationPreviewProps) {
  const { dict, locale } = useI18n();
  const t = dict.adminPanel.dashboard.moderationPreview;
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
        <div className="flex items-center gap-2.5 min-w-0">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-violet-500/25 bg-violet-500/10 text-violet-400">
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2M9 5a2 2 0 0 0 2 2h2a2 2 0 0 0 2-2M9 5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2" />
            </svg>
          </span>
          <h2 className="text-sm font-semibold tracking-wider text-slate-200 uppercase">
            {t.title}
          </h2>
        </div>

        <Link
          href="/admin/moderation"
          className="font-mono text-xs text-violet-300 transition-colors hover:text-violet-200 hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-400 rounded"
        >
          {t.viewAllCta} →
        </Link>
      </div>

      <p className="mb-4 text-[11px] text-slate-400">{t.readOnlyNotice}</p>

      {loading ? (
        <div className="space-y-3">
          {[0, 1].map((item) => (
            <div key={item} className="h-16 animate-pulse rounded-xl bg-slate-800/50" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-800 bg-[#080d1a] p-6 text-center text-xs text-slate-400">
          {t.empty}
        </div>
      ) : (
        <ul className="space-y-3">
          {items.map((item) => {
            const typeLabel = t.contentTypes[item.contentType] ?? item.contentType;
            const statusLabel = t.statuses[item.status] ?? item.status;
            return (
              <li
                key={item.id}
                className="flex flex-col gap-3 rounded-xl border border-slate-800/80 bg-[#080d1a] p-3.5 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0 space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded border border-sky-500/30 bg-sky-500/10 px-2 py-0.5 font-mono text-[10px] font-semibold uppercase text-sky-300">
                      {typeLabel}
                    </span>
                    <span className="rounded border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 font-mono text-[10px] font-semibold uppercase text-amber-300">
                      {statusLabel}
                    </span>
                  </div>
                  <p className="text-sm font-medium text-slate-100 break-words">
                    {item.title}
                  </p>
                  <p className="text-xs text-slate-400">
                    {t.submittedLabel}:{" "}
                    <time dateTime={item.submittedAt}>
                      {dateFormatter.format(new Date(item.submittedAt))}
                    </time>
                  </p>
                </div>

                <Link
                  href="/admin/moderation"
                  className="inline-flex min-h-[36px] shrink-0 items-center justify-center rounded-lg border border-slate-700 bg-[#0c1220] px-3 py-1.5 text-xs font-medium text-slate-200 transition-colors hover:border-violet-500/50 hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-400"
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
