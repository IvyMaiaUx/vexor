"use client";

import Link from "next/link";
import type {
  CategoryItem,
  FeaturedResourceItem,
  SupportedLocale,
} from "@/config/site";
import type { Dictionary } from "@/lib/i18n/dictionaries";
import { getSafeExternalHref } from "@/lib/security/sanitize";

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
  const categoryLabel = category
    ? locale === "pt-BR"
      ? category.name_pt
      : category.name_en
    : resource.categorySlug;

  const description =
    locale === "pt-BR" ? resource.description_pt : resource.description_en;

  const safeHref = getSafeExternalHref(resource.url);
  const isPending = resource.status === "pending";

  return (
    <article className="group flex flex-col justify-between rounded-2xl border border-slate-800/90 bg-[#0d1322]/90 p-4 transition-all hover:border-cyan-500/40 hover:bg-[#11192d] sm:p-5">
      <div>
        {/* Badges Row */}
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="rounded-md border border-cyan-500/30 bg-cyan-500/10 px-2.5 py-0.5 font-mono text-[11px] font-medium text-cyan-300">
              {dict.resourceTypes[resource.type]}
            </span>
            {isPending && (
              <span className="rounded-md border border-amber-500/40 bg-amber-500/15 px-2 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-wider text-amber-300">
                {dict.catalogSection.pendingBadge}
              </span>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            {resource.difficulty && (
              <span className="rounded border border-slate-700/80 bg-[#070b14] px-2 py-0.5 font-mono text-[11px] text-slate-300">
                {dict.difficulties[resource.difficulty]}
              </span>
            )}
            <span className="rounded border border-slate-800 bg-[#070b14] px-1.5 py-0.5 font-mono text-[10px] uppercase text-slate-400">
              {resource.language}
            </span>
          </div>
        </div>

        {/* Clickable Resource Name -> Individual Resource Page */}
        <h3 className="mt-3.5 text-base font-semibold leading-snug text-slate-100 transition-colors group-hover:text-cyan-300 sm:mt-4 sm:text-lg">
          <Link
            href={`/catalog/${resource.slug}`}
            className="focus:outline-none focus-visible:underline"
          >
            {resource.name}
          </Link>
        </h3>

        <p className="mt-2 line-clamp-3 text-xs leading-relaxed text-slate-400 sm:text-sm">
          {description}
        </p>
      </div>

      <div className="mt-5 border-t border-slate-800/80 pt-3.5 sm:mt-6 sm:pt-4">
        <div className="flex items-center justify-between gap-2 text-xs text-slate-400">
          <span className="truncate font-medium text-slate-300">
            {categoryLabel}
          </span>
          <span className="max-w-[45%] truncate font-mono text-[11px] text-slate-500">
            {resource.authorName}
          </span>
        </div>

        {/* Responsive Action Buttons: 2-col + full CTA on mobile, inline on sm+ */}
        <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-1 items-center gap-2 sm:flex-initial">
            <button
              type="button"
              onClick={() => onToggleBookmark(resource.slug)}
              aria-pressed={isBookmarked}
              className={`inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg border px-2.5 py-2 text-xs font-medium transition-colors sm:flex-initial sm:py-1.5 ${
                isBookmarked
                  ? "border-cyan-500/50 bg-cyan-500/15 text-cyan-300"
                  : "border-slate-800 bg-[#070b14] text-slate-300 hover:border-slate-700"
              }`}
            >
              <span aria-hidden="true">{isBookmarked ? "★" : "☆"}</span>
              {isBookmarked
                ? dict.catalogSection.savedBookmark
                : dict.catalogSection.saveBookmark}
            </button>

            <Link
              href={`/catalog/${resource.slug}`}
              className="inline-flex flex-1 items-center justify-center rounded-lg border border-slate-800 bg-[#070b14] px-2.5 py-2 text-xs font-medium text-slate-300 transition-colors hover:border-cyan-500/40 hover:text-cyan-300 sm:flex-initial sm:py-1.5"
            >
              {dict.catalogSection.viewDetails}
            </Link>
          </div>

          <a
            href={safeHref}
            target="_blank"
            rel="noopener noreferrer ugc"
            className="inline-flex w-full items-center justify-center gap-1 rounded-lg border border-cyan-500/30 bg-cyan-500/10 px-3 py-2 text-xs font-semibold text-cyan-300 transition-colors hover:bg-cyan-500 hover:text-slate-950 sm:w-auto sm:py-1.5"
          >
            {dict.catalogSection.visitResource}
            <span aria-hidden="true">↗</span>
          </a>
        </div>
      </div>
    </article>
  );
}
