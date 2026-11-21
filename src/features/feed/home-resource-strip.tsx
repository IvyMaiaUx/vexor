"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { SupportedLocale } from "@/config/site";
import {
  type CatalogResourceItem,
  queryCatalogResources,
} from "@/features/catalog/catalog-service";
import {
  getPricingModelLabel,
  getResourceTagLabel,
  shouldShowPricingBadges,
} from "@/features/catalog/pricing-labels";
import { useCatalogStore } from "@/features/catalog/use-catalog-store";
import type { Dictionary } from "@/lib/i18n/dictionaries";
import { getSafeExternalHref } from "@/lib/security/sanitize";

interface HomeResourceStripProps {
  locale: SupportedLocale;
  dict: Dictionary;
}

const STRIP_SIZE = 3;

/**
 * Curated resource strip shown above the social timeline on the home feed.
 * Mirrors the mobile mockup, where the feed mixes community posts with catalog
 * resources instead of being posts-only.
 */
export function HomeResourceStrip({ locale, dict }: HomeResourceStripProps) {
  const isPt = locale === "pt-BR";
  const { categories, categoriesLoading } = useCatalogStore();

  const [items, setItems] = useState<CatalogResourceItem[]>([]);
  const [loadedKey, setLoadedKey] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const queryKey = `${categories.length}`;
  const loading = categoriesLoading || loadedKey !== queryKey;

  useEffect(() => {
    if (categoriesLoading) {
      return;
    }

    let cancelled = false;

    void queryCatalogResources(
      { sortBy: "newest", page: 1, pageSize: STRIP_SIZE },
      { categories }
    ).then((res) => {
      if (cancelled) {
        return;
      }
      setLoadedKey(queryKey);
      if (res.status === "error") {
        setErrorMessage(
          res.errorMessage ||
            (isPt
              ? "Não foi possível carregar os recursos em destaque."
              : "Could not load featured resources.")
        );
        return;
      }
      setErrorMessage(null);
      setItems(res.items);
    });

    return () => {
      cancelled = true;
    };
  }, [categories, categoriesLoading, isPt, queryKey]);

  return (
    <section
      aria-labelledby="home-resources-title"
      className="border-b border-slate-800/70 bg-[#050811]/60 py-8 sm:py-10"
    >
      <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
        <div className="flex items-end justify-between gap-3">
          <div>
            <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.2em] text-cyan-400">
              {isPt ? "DIRETÓRIO CURADO" : "CURATED DIRECTORY"}
            </p>
            <h2
              id="home-resources-title"
              className="mt-1 text-xl font-bold tracking-tight text-slate-100 sm:text-2xl"
            >
              {isPt ? "Recursos da comunidade" : "Community resources"}
            </h2>
          </div>
          <Link
            href="/catalog"
            className="shrink-0 font-mono text-[11px] font-semibold text-cyan-300 transition-colors hover:text-cyan-200"
          >
            {isPt ? "Ver catálogo →" : "Browse catalog →"}
          </Link>
        </div>

        {loading ? (
          <div className="mt-4 space-y-3">
            {[0, 1, 2].map((idx) => (
              <div
                key={idx}
                className="h-32 animate-pulse rounded-2xl border border-slate-800/80 bg-[#0d1322]/70"
              />
            ))}
          </div>
        ) : errorMessage ? (
          <p className="mt-4 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-xs text-amber-200">
            {errorMessage}
          </p>
        ) : items.length === 0 ? (
          <p className="mt-4 rounded-xl border border-slate-800/80 bg-[#0d1322]/70 px-4 py-6 text-center text-xs text-slate-400">
            {isPt
              ? "Nenhum recurso publicado ainda. Seja o primeiro a sugerir uma ferramenta."
              : "No resources published yet. Be the first to suggest a tool."}
          </p>
        ) : (
          <ul className="mt-4 space-y-3">
            {items.map((resource) => {
              const showPricing = shouldShowPricingBadges(resource);
              const description =
                (isPt ? resource.description_pt : resource.description_en) ??
                resource.description_pt ??
                resource.description_en ??
                "";
              const safeHref = getSafeExternalHref(resource.url);

              return (
                <li key={resource.id}>
                  <article className="rounded-2xl border border-slate-800/90 bg-[#0d1322]/90 p-4 transition-colors hover:border-cyan-500/40">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="rounded-md border border-cyan-500/30 bg-cyan-500/10 px-2 py-0.5 font-mono text-[10px] font-semibold uppercase text-cyan-300">
                        {dict.resourceTypes[resource.type]}
                      </span>
                      {showPricing && resource.pricingModel && (
                        <span className="rounded-md border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 font-mono text-[10px] font-medium text-emerald-300">
                          {getPricingModelLabel(resource.pricingModel, locale)}
                        </span>
                      )}
                      {showPricing && resource.requiresCreditCard === "no" && (
                        <span className="rounded-md border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 font-mono text-[10px] font-medium text-emerald-300">
                          {getResourceTagLabel("no_card", locale)}
                        </span>
                      )}
                      {resource.difficulty && (
                        <span className="rounded-md border border-slate-700/80 bg-[#070b14] px-2 py-0.5 font-mono text-[10px] text-slate-300">
                          {dict.difficulties[resource.difficulty]}
                        </span>
                      )}
                    </div>

                    <h3 className="mt-2.5 text-sm font-semibold leading-snug text-slate-100 sm:text-base">
                      <Link
                        href={`/catalog/${resource.slug}`}
                        className="transition-colors hover:text-cyan-300 focus:outline-none focus-visible:underline"
                      >
                        {resource.name}
                      </Link>
                    </h3>

                    {description && (
                      <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-slate-400">
                        {description}
                      </p>
                    )}

                    <div className="mt-3 flex items-center justify-between gap-2 border-t border-slate-800/80 pt-2.5">
                      <span className="truncate font-mono text-[10px] uppercase tracking-wide text-slate-500">
                        {resource.categorySlug}
                      </span>
                      <div className="flex shrink-0 items-center gap-2">
                        <Link
                          href={`/catalog/${resource.slug}`}
                          className="rounded-lg border border-slate-800 bg-[#070b14] px-2.5 py-1.5 text-[11px] font-medium text-slate-300 transition-colors hover:border-cyan-500/40 hover:text-cyan-300"
                        >
                          {dict.catalogSection.viewDetails}
                        </Link>
                        <a
                          href={safeHref}
                          target="_blank"
                          rel="noopener noreferrer ugc"
                          aria-label={
                            isPt
                              ? `Abrir ${resource.name} em nova aba`
                              : `Open ${resource.name} in a new tab`
                          }
                          className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-cyan-500/30 bg-cyan-500/10 text-cyan-300 transition-colors hover:bg-cyan-500 hover:text-slate-950"
                        >
                          <svg
                            aria-hidden="true"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="1.8"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            className="h-4 w-4"
                          >
                            <path d="M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5" />
                          </svg>
                        </a>
                      </div>
                    </div>
                  </article>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </section>
  );
}
