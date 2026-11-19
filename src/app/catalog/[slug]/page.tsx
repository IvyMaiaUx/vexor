"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { Footer } from "@/components/layout/footer";
import { Header } from "@/components/layout/header";
import {
  type CatalogCategoryItem,
  type CatalogResourceItem,
  fetchCatalogResourceBySlug,
} from "@/features/catalog/catalog-service";
import {
  getCreditCardLabel,
  getPricingModelLabel,
  getResourceTagLabel,
} from "@/features/catalog/pricing-labels";
import { ResourceCard } from "@/features/catalog/resource-card";
import { useCatalogStore } from "@/features/catalog/use-catalog-store";
import { ReportButton } from "@/features/reports/report-modal";
import { getDictionary } from "@/lib/i18n/dictionaries";
import {
  getSafeExternalHref,
  normalizeResourceUrl,
} from "@/lib/security/sanitize";

export default function ResourceDetailPage() {
  const params = useParams<{ slug: string }>();
  const slug = typeof params?.slug === "string" ? params.slug : "";

  const {
    locale,
    setLocale,
    categories,
    bookmarkedIds,
    bookmarkError,
    dismissBookmarkError,
    toggleBookmark,
  } = useCatalogStore();

  const dict = useMemo(() => getDictionary(locale), [locale]);
  const isPt = locale === "pt-BR";

  const [resource, setResource] = useState<CatalogResourceItem | null>(null);
  const [resolvedCategory, setResolvedCategory] =
    useState<CatalogCategoryItem | null>(null);
  const [relatedResources, setRelatedResources] = useState<
    CatalogResourceItem[]
  >([]);
  const [loadedSlug, setLoadedSlug] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  const isLoading = loadedSlug !== slug;

  const categoryMap = useMemo(
    () => new Map(categories.map((c) => [c.slug, c])),
    [categories]
  );

  useEffect(() => {
    let cancelled = false;

    void fetchCatalogResourceBySlug(slug).then((res) => {
      if (cancelled) {
        return;
      }
      if (res.status === "error") {
        setResource(null);
        setResolvedCategory(null);
        setRelatedResources([]);
        setLoadError(
          res.errorMessage ||
            (isPt
              ? "Não foi possível carregar este recurso."
              : "Could not load this resource.")
        );
      } else if (res.status === "not_found") {
        setLoadError(null);
        setResource(null);
        setResolvedCategory(null);
        setRelatedResources([]);
      } else {
        setLoadError(null);
        setResource(res.resource);
        setResolvedCategory(res.category);
        setRelatedResources(res.related);
      }
      setLoadedSlug(slug);
    });

    return () => {
      cancelled = true;
    };
  }, [isPt, slug]);

  if (isLoading) {
    return (
      <div className="flex min-h-screen flex-col">
        <Header locale={locale} onLocaleChange={setLocale} dict={dict} />
        <main className="mx-auto flex max-w-5xl flex-1 items-center justify-center px-4 py-20">
          <div className="font-mono text-xs text-slate-400">
            {isPt ? "Carregando recurso..." : "Loading resource..."}
          </div>
        </main>
        <Footer locale={locale} dict={dict} />
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="flex min-h-screen flex-col">
        <Header locale={locale} onLocaleChange={setLocale} dict={dict} />
        <main className="mx-auto flex max-w-3xl flex-1 flex-col items-center justify-center px-4 py-20 text-center">
          <p className="text-sm text-rose-300">{loadError}</p>
          <Link
            href="/catalog"
            className="mt-6 rounded-xl bg-cyan-500 px-5 py-2.5 text-sm font-semibold text-slate-950 hover:bg-cyan-400"
          >
            ← {dict.resourceDetail.backToCatalog}
          </Link>
        </main>
        <Footer locale={locale} dict={dict} />
      </div>
    );
  }

  if (!resource) {
    return (
      <div className="flex min-h-screen flex-col">
        <Header locale={locale} onLocaleChange={setLocale} dict={dict} />
        <main className="mx-auto flex max-w-3xl flex-1 flex-col items-center justify-center px-4 py-20 text-center">
          <span className="rounded-full border border-slate-800 bg-[#0d1322] px-3 py-1 font-mono text-xs text-cyan-400">
            404 · RESOURCE_NOT_FOUND
          </span>
          <h1 className="mt-4 text-2xl font-bold text-slate-100 sm:text-3xl">
            {dict.resourceDetail.notFoundTitle}
          </h1>
          <p className="mt-2 text-sm text-slate-400">
            {dict.resourceDetail.notFoundDesc}
          </p>
          <Link
            href="/catalog"
            className="mt-6 rounded-xl bg-cyan-500 px-5 py-2.5 text-sm font-semibold text-slate-950 hover:bg-cyan-400"
          >
            ← {dict.resourceDetail.backToCatalog}
          </Link>
        </main>
        <Footer locale={locale} dict={dict} />
      </div>
    );
  }

  const category = resolvedCategory ?? categoryMap.get(resource.categorySlug);
  const categoryName = category
    ? locale === "pt-BR"
      ? category.name_pt
      : category.name_en
    : resource.categorySlug;
  const description =
    locale === "pt-BR" ? resource.description_pt : resource.description_en;
  const isBookmarked = bookmarkedIds.includes(resource.id);
  const safeHref = getSafeExternalHref(resource.url);
  const normalizedUrl = normalizeResourceUrl(resource.url);
  const isPending = resource.status === "pending";

  return (
    <div className="flex min-h-screen flex-col">
      <Header locale={locale} onLocaleChange={setLocale} dict={dict} />

      <main className="flex-1">
        {/* Top Breadcrumb & Resource Header */}
        <section className="border-b border-slate-800/80 bg-cyber-grid py-12 sm:py-16">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <nav
              aria-label="Breadcrumb"
              className="flex flex-wrap items-center gap-2 font-mono text-xs text-slate-400"
            >
              <Link
                href="/catalog"
                className="transition-colors hover:text-cyan-400"
              >
                {dict.nav.catalog}
              </Link>
              <span>/</span>
              <span className="text-slate-300">{categoryName}</span>
              <span>/</span>
              <span className="truncate text-cyan-300">{resource.slug}</span>
            </nav>

            <div className="mt-6 flex flex-col justify-between gap-6 lg:flex-row lg:items-start">
              <div className="max-w-3xl">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-md border border-cyan-500/30 bg-cyan-500/10 px-2.5 py-1 font-mono text-xs font-medium text-cyan-300">
                    {dict.resourceTypes[resource.type]}
                  </span>
                  {resource.difficulty && (
                    <span className="rounded-md border border-slate-700 bg-[#0d1322] px-2.5 py-1 font-mono text-xs text-slate-200">
                      {dict.difficulties[resource.difficulty]}
                    </span>
                  )}
                  <span className="rounded-md border border-slate-800 bg-[#0d1322] px-2.5 py-1 font-mono text-xs text-slate-300">
                    {dict.languages[resource.language]}
                  </span>
                  <span
                    className={`rounded-md border px-2.5 py-1 font-mono text-xs font-medium ${
                      isPending
                        ? "border-amber-500/40 bg-amber-500/15 text-amber-300"
                        : "border-emerald-500/40 bg-emerald-500/15 text-emerald-300"
                    }`}
                  >
                    {isPending
                      ? dict.catalogSection.pendingBadge
                      : dict.catalogSection.approvedBadge}
                  </span>
                  <ReportButton
                    targetType="resource"
                    targetId={resource.id}
                    locale={locale}
                  />
                </div>

                {(resource.pricingModel ||
                  resource.requiresCreditCard ||
                  resource.freeTierLimits ||
                  resource.pricingNotes ||
                  (resource.tags && resource.tags.length > 0)) && (
                  <div className="mt-4 rounded-xl border border-slate-800/90 bg-[#0d1322]/90 p-4 text-xs text-slate-300">
                    <div className="flex flex-wrap gap-3">
                      {resource.pricingModel && (
                        <div>
                          <span className="font-mono text-slate-500">
                            {isPt ? "Preço: " : "Pricing: "}
                          </span>
                          <span className="font-semibold text-sky-300">
                            {getPricingModelLabel(resource.pricingModel, locale)}
                          </span>
                        </div>
                      )}
                      {resource.requiresCreditCard && (
                        <div>
                          <span className="font-mono text-slate-500">
                            {isPt ? "Cartão de crédito: " : "Credit card: "}
                          </span>
                          <span className="font-semibold text-slate-100">
                            {getCreditCardLabel(
                              resource.requiresCreditCard,
                              locale
                            )}
                          </span>
                        </div>
                      )}
                    </div>
                    {resource.freeTierLimits && (
                      <p className="mt-2 leading-relaxed text-slate-300">
                        <span className="font-mono text-slate-500">
                          {isPt
                            ? "Limitações do plano gratuito: "
                            : "Free tier limits: "}
                        </span>
                        {resource.freeTierLimits}
                      </p>
                    )}
                    {resource.pricingNotes && (
                      <p className="mt-1.5 leading-relaxed text-slate-300">
                        <span className="font-mono text-slate-500">
                          {isPt ? "Detalhes de preço: " : "Pricing notes: "}
                        </span>
                        {resource.pricingNotes}
                      </p>
                    )}
                    {resource.tags && resource.tags.length > 0 && (
                      <div className="mt-2.5 flex flex-wrap gap-1.5">
                        {resource.tags.map((tag) => (
                          <span
                            key={tag}
                            className="rounded-md border border-cyan-500/25 bg-cyan-500/10 px-2 py-0.5 font-mono text-[11px] text-cyan-300"
                          >
                            {getResourceTagLabel(tag, locale)}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                <h1 className="mt-4 text-3xl font-bold tracking-tight text-slate-50 sm:text-4xl">
                  {resource.name}
                </h1>
              </div>

              <div className="flex w-full flex-col gap-2.5 sm:flex-row sm:flex-wrap sm:items-center sm:gap-3 lg:w-auto">
                <button
                  type="button"
                  onClick={() => void toggleBookmark(resource.slug, resource.id)}
                  aria-pressed={isBookmarked}
                  className={`inline-flex items-center justify-center gap-2 rounded-xl border px-4 py-3 text-sm font-medium transition-colors sm:py-2.5 ${
                    isBookmarked
                      ? "border-cyan-500/50 bg-cyan-500/15 text-cyan-300"
                      : "border-slate-700 bg-[#0d1322] text-slate-200 hover:border-cyan-500/40"
                  }`}
                >
                  <span aria-hidden="true">{isBookmarked ? "★" : "☆"}</span>
                  {isBookmarked
                    ? dict.catalogSection.savedBookmark
                    : dict.catalogSection.saveBookmark}
                </button>

                <a
                  href={safeHref}
                  target="_blank"
                  rel="noopener noreferrer ugc"
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-cyan-500 px-5 py-3 text-sm font-semibold text-slate-950 shadow-[0_0_25px_rgba(6,182,212,0.3)] transition-colors hover:bg-cyan-400 sm:py-2.5"
                >
                  {dict.resourceDetail.openExternalCta}
                  <span aria-hidden="true">↗</span>
                </a>
              </div>
            </div>
          </div>
        </section>

        {/* Main Content + Technical Metadata Card */}
        <section className="py-12 sm:py-16">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            {bookmarkError && (
              <div
                role="alert"
                className="mb-6 flex items-center justify-between gap-4 rounded-xl border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-xs text-amber-200"
              >
                <span>{bookmarkError}</span>
                <button
                  type="button"
                  onClick={dismissBookmarkError}
                  className="rounded px-2 py-1 font-mono text-[11px] text-amber-300 hover:bg-amber-500/20"
                >
                  ✕
                </button>
              </div>
            )}
            <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
              {/* Left Column: Description & Security Notice */}
              <div className="space-y-6 lg:col-span-8">
                <div className="rounded-2xl border border-slate-800/90 bg-[#0d1322]/90 p-6 sm:p-8">
                  <h2 className="text-lg font-semibold text-slate-100">
                    {dict.resourceDetail.aboutTitle}
                  </h2>
                  <p className="mt-4 whitespace-pre-line text-base leading-relaxed text-slate-300">
                    {description}
                  </p>
                </div>

                {/* Defensive Security & External URL Notice */}
                <div className="rounded-2xl border border-cyan-500/20 bg-[#0d1322]/70 p-5">
                  <div className="flex items-start gap-3">
                    <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-cyan-500/40 bg-cyan-500/10 font-mono text-xs text-cyan-300">
                      !
                    </span>
                    <div className="space-y-2">
                      <p className="text-xs leading-relaxed text-slate-300">
                        {dict.resourceDetail.securityNotice}
                      </p>
                      <p className="break-all font-mono text-xs text-cyan-400">
                        {resource.url}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Right Column: Technical Specification Sheet */}
              <aside className="lg:col-span-4">
                <div className="rounded-2xl border border-slate-800/90 bg-[#0d1322]/90 p-6">
                  <h2 className="font-mono text-xs font-semibold uppercase tracking-wider text-cyan-400">
                    {dict.resourceDetail.metadataTitle}
                  </h2>

                  <dl className="mt-4 divide-y divide-slate-800/80 text-sm">
                    <div className="py-3">
                      <dt className="text-xs text-slate-400">
                        {dict.resourceDetail.categoryLabel}
                      </dt>
                      <dd className="mt-1 font-medium text-slate-100">
                        {categoryName}
                      </dd>
                    </div>

                    <div className="py-3">
                      <dt className="text-xs text-slate-400">
                        {dict.resourceDetail.typeLabel}
                      </dt>
                      <dd className="mt-1 font-mono text-xs text-cyan-300">
                        {dict.resourceTypes[resource.type]} ({resource.type})
                      </dd>
                    </div>

                    <div className="py-3">
                      <dt className="text-xs text-slate-400">
                        {dict.resourceDetail.difficultyLabel}
                      </dt>
                      <dd className="mt-1 font-medium text-slate-200">
                        {resource.difficulty
                          ? dict.difficulties[resource.difficulty]
                          : dict.resourceDetail.notApplicable}
                      </dd>
                    </div>

                    <div className="py-3">
                      <dt className="text-xs text-slate-400">
                        {dict.resourceDetail.languageLabel}
                      </dt>
                      <dd className="mt-1 font-medium text-slate-200">
                        {dict.languages[resource.language]}
                      </dd>
                    </div>

                    <div className="py-3">
                      <dt className="text-xs text-slate-400">
                        {dict.resourceDetail.authorLabel}
                      </dt>
                      <dd className="mt-1 font-medium text-slate-200">
                        {resource.authorName}
                      </dd>
                    </div>

                    <div className="py-3">
                      <dt className="text-xs text-slate-400">
                        {dict.resourceDetail.publishedDateLabel}
                      </dt>
                      <dd className="mt-1 font-mono text-xs text-slate-300">
                        {resource.publishedAt}
                      </dd>
                    </div>

                    <div className="py-3">
                      <dt className="text-xs text-slate-400">
                        {dict.resourceDetail.normalizedUrlLabel}
                      </dt>
                      <dd className="mt-1 break-all font-mono text-[11px] text-slate-400">
                        {normalizedUrl}
                      </dd>
                    </div>
                  </dl>

                  <div className="mt-5 border-t border-slate-800 pt-4">
                    <Link
                      href="/catalog"
                      className="inline-flex w-full items-center justify-center rounded-xl border border-slate-700 bg-[#070b14] px-4 py-2 text-xs font-medium text-slate-200 transition-colors hover:border-cyan-500/40 hover:text-cyan-300"
                    >
                      ← {dict.resourceDetail.backToCatalog}
                    </Link>
                  </div>
                </div>
              </aside>
            </div>

            {/* Related Resources in the Same Category */}
            {relatedResources.length > 0 && (
              <div className="mt-16 border-t border-slate-800/80 pt-12">
                <h2 className="text-xl font-bold text-slate-100">
                  {dict.resourceDetail.relatedTitle}
                </h2>
                <div className="mt-6 grid grid-cols-1 gap-5 md:grid-cols-3">
                  {relatedResources.map((rel) => (
                    <ResourceCard
                      key={rel.id}
                      resource={rel}
                      category={categoryMap.get(rel.categorySlug)}
                      locale={locale}
                      dict={dict}
                      isBookmarked={bookmarkedIds.includes(rel.id)}
                      onToggleBookmark={(s) => void toggleBookmark(s, rel.id)}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        </section>
      </main>

      <Footer locale={locale} dict={dict} />
    </div>
  );
}
