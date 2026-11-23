"use client";

import Link from "next/link";
import type {
  CategoryItem,
  FeaturedResourceItem,
  SupportedLocale,
} from "@/config/site";
import type { Dictionary } from "@/lib/i18n/dictionaries";
import {
  getPricingModelLabel,
  getResourceTagLabel,
  shouldShowPricingBadges,
} from "./pricing-labels";

interface ResourceCardProps {
  resource: FeaturedResourceItem;
  category?: CategoryItem;
  locale: SupportedLocale;
  dict: Dictionary;
  isBookmarked: boolean;
  onToggleBookmark: (slug: string) => void;
}

export function ResourceCard({
  resource,
  category,
  locale,
  dict,
  isBookmarked,
  onToggleBookmark,
}: ResourceCardProps) {
  const isPt = locale === "pt-BR";
  const categoryLabel = category
    ? isPt
      ? category.name_pt
      : category.name_en
    : resource.categorySlug;

  const description = isPt ? resource.description_pt : resource.description_en;
  const isPending = resource.status === "pending";
  const showPricing = shouldShowPricingBadges(resource);
  const showReducedPolicy =
    resource.status === "approved" && resource.contentPolicy === "reduced";
  const initial = (resource.name || "V").slice(0, 1).toUpperCase();

  const sourceLine = resource.authorName
    ? resource.authorName === categoryLabel
      ? resource.authorName
      : `${categoryLabel} · ${resource.authorName}`
    : categoryLabel;

  return (
    <article className="group flex flex-col justify-between gap-2.5 rounded-2xl border border-slate-800/90 bg-[#0d1322]/95 p-4 transition-colors hover:border-cyan-500/40">
      <div className="space-y-2.5">
        {/* Top Row: Square Icon + Title + Star Button */}
        <div className="flex items-start gap-2.5">
          <span
            aria-hidden="true"
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-cyan-500/15 font-mono text-base font-bold text-cyan-300"
          >
            {initial}
          </span>

          <h3 className="min-w-0 flex-1 pt-0.5 text-base font-semibold leading-snug text-slate-100 transition-colors group-hover:text-cyan-300">
            <Link
              href={`/catalog/${resource.slug}`}
              className="line-clamp-2 focus:outline-none focus-visible:underline"
            >
              {resource.name}
            </Link>
          </h3>

          <button
            type="button"
            onClick={() => onToggleBookmark(resource.slug)}
            aria-pressed={isBookmarked}
            aria-label={
              isBookmarked
                ? isPt
                  ? "Remover dos favoritos"
                  : "Remove bookmark"
                : isPt
                  ? "Favoritar"
                  : "Bookmark"
            }
            className={`-mr-1 -mt-1 inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border transition-colors ${
              isBookmarked
                ? "border-cyan-500/50 bg-cyan-500/15 text-cyan-300"
                : "border-slate-800 bg-[#070b14] text-slate-400 hover:border-slate-700 hover:text-slate-200"
            }`}
          >
            <svg
              aria-hidden="true"
              viewBox="0 0 24 24"
              fill={isBookmarked ? "currentColor" : "none"}
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="h-[18px] w-[18px]"
            >
              <path d="M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1L3.2 9.5l6.1-.9z" />
            </svg>
          </button>
        </div>

        {/* 2-line Description */}
        <p className="line-clamp-2 text-sm leading-relaxed text-slate-400">
          {description}
        </p>

        {/* Badges Row */}
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="inline-flex h-[22px] items-center rounded-md border border-slate-700/80 bg-[#070b14] px-2 font-mono text-[11px] font-semibold text-slate-300">
            {dict.resourceTypes[resource.type]}
          </span>
          {isPending && (
            <span className="inline-flex h-[22px] items-center rounded-md border border-amber-500/40 bg-amber-500/15 px-2 font-mono text-[10px] font-semibold uppercase tracking-wider text-amber-300">
              {dict.catalogSection.pendingBadge}
            </span>
          )}
          {showReducedPolicy && (
            <span className="inline-flex h-[22px] items-center gap-1 rounded-md border border-amber-500/35 bg-amber-500/10 px-2 font-mono text-[11px] font-medium text-amber-300">
              <svg
                aria-hidden="true"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="h-3 w-3 shrink-0"
              >
                <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                <line x1="12" y1="9" x2="12" y2="13" />
                <line x1="12" y1="17" x2="12.01" y2="17" />
              </svg>
              <span>{isPt ? "Restrições reduzidas" : "Reduced restrictions"}</span>
            </span>
          )}
          {showPricing && resource.pricingModel && (
            <span className="inline-flex h-[22px] items-center rounded-md border border-emerald-500/35 bg-emerald-500/10 px-2 font-mono text-[11px] font-semibold text-emerald-400">
              {getPricingModelLabel(resource.pricingModel, locale)}
            </span>
          )}
          {showPricing && resource.requiresCreditCard === "no" && (
            <span className="inline-flex h-[22px] items-center rounded-md border border-emerald-500/35 bg-emerald-500/10 px-2 font-mono text-[11px] font-semibold text-emerald-400">
              {getResourceTagLabel("no_card", locale)}
            </span>
          )}
          {resource.difficulty && (
            <span className="inline-flex h-[22px] items-center rounded-md border border-slate-700/80 bg-[#070b14] px-2 font-mono text-[11px] font-medium text-slate-300">
              {dict.difficulties[resource.difficulty]}
            </span>
          )}
          <span className="inline-flex h-[22px] items-center rounded-md border border-slate-800 bg-[#070b14] px-2 font-mono text-[11px] uppercase text-slate-400">
            {resource.language}
          </span>
        </div>
      </div>

      {/* Footer: Source + Detalhes -> */}
      <div className="mt-1 flex items-center justify-between gap-2 border-t border-slate-800/80 pt-1">
        <span className="min-w-0 truncate text-xs text-slate-400">
          {sourceLine}
        </span>
        <Link
          href={`/catalog/${resource.slug}`}
          className="inline-flex min-h-[44px] shrink-0 items-center gap-1 px-1 text-sm font-semibold text-cyan-400 transition-colors hover:text-cyan-300"
        >
          <span>{dict.catalogSection.viewDetails}</span>
          <svg
            aria-hidden="true"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="h-4 w-4"
          >
            <path d="M9 6l6 6-6 6" />
          </svg>
        </Link>
      </div>
    </article>
  );
}
