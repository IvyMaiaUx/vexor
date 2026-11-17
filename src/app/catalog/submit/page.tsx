"use client";

import Link from "next/link";
import { type FormEvent, useMemo, useRef, useState } from "react";
import type {
  DifficultyLevel,
  ResourceLanguage,
  ResourceType,
} from "@/config/site";
import { Footer } from "@/components/layout/footer";
import { Header } from "@/components/layout/header";
import { useAuthStore } from "@/features/auth/use-auth-store";
import { submitCatalogResource } from "@/features/catalog/catalog-service";
import { useCatalogStore } from "@/features/catalog/use-catalog-store";
import {
  type ResourceSubmissionInput,
  validateResourceSubmission,
} from "@/features/catalog/validation";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { normalizeResourceUrl } from "@/lib/security/sanitize";

const RESOURCE_TYPE_KEYS: ResourceType[] = [
  "tool",
  "repository",
  "script",
  "framework",
  "documentation",
  "lab",
  "ctf_platform",
  "course",
  "article",
];

const DIFFICULTY_KEYS: DifficultyLevel[] = [
  "beginner",
  "intermediate",
  "advanced",
];

const LANGUAGE_KEYS: ResourceLanguage[] = [
  "en",
  "pt-BR",
  "multilingual",
  "other",
];

export default function SubmitResourcePage() {
  const { locale, setLocale, categories } = useCatalogStore();
  const { user, isActiveMember } = useAuthStore();
  const dict = useMemo(() => getDictionary(locale), [locale]);
  const isPt = locale === "pt-BR";

  const [name, setName] = useState("");
  const [url, setUrl] = useState("");
  const [categorySlug, setCategorySlug] = useState("");
  const [type, setType] = useState<ResourceType>("tool");
  const [difficulty, setDifficulty] = useState<DifficultyLevel | "">("");
  const [language, setLanguage] = useState<ResourceLanguage>("en");
  const [authorName, setAuthorName] = useState("");
  const [description, setDescription] = useState("");
  const [fieldErrors, setFieldErrors] = useState<
    Partial<Record<keyof ResourceSubmissionInput, string>>
  >({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [createdSlug, setCreatedSlug] = useState<string | null>(null);
  const inFlightRef = useRef(false);

  const effectiveCategorySlug = categorySlug || categories[0]?.slug || "";

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!isActiveMember || !user || inFlightRef.current || isSubmitting) {
      return;
    }

    const selectedCategory = categories.find(
      (c) => c.slug === effectiveCategorySlug
    );
    const submissionInput: ResourceSubmissionInput = {
      name,
      url,
      categorySlug: effectiveCategorySlug,
      type,
      difficulty,
      language,
      authorName,
      description,
    };

    const validation = validateResourceSubmission(submissionInput, [], dict);

    if (!validation.valid || !selectedCategory) {
      setFieldErrors({
        ...validation.errors,
        ...(!selectedCategory
          ? {
              categorySlug: isPt
                ? "Selecione uma categoria válida."
                : "Select a valid category.",
            }
          : {}),
      });
      setSubmitError(null);
      return;
    }

    setFieldErrors({});
    setSubmitError(null);
    inFlightRef.current = true;
    setIsSubmitting(true);

    try {
      const res = await submitCatalogResource(
        {
          name,
          description,
          categoryId: selectedCategory.id,
          type,
          url,
          language,
          difficulty,
          authorName: authorName.trim() || `@${user.username}`,
        },
        { locale }
      );

      if (res.status === "error") {
        if (res.fieldErrors) {
          setFieldErrors(res.fieldErrors);
        }
        setSubmitError(res.message);
        return;
      }

      setCreatedSlug(res.resource.slug);
    } finally {
      inFlightRef.current = false;
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setName("");
    setUrl("");
    setDescription("");
    setAuthorName("");
    setDifficulty("");
    setFieldErrors({});
    setCreatedSlug(null);
  };

  return (
    <div className="flex min-h-screen flex-col">
      <Header locale={locale} onLocaleChange={setLocale} dict={dict} />

      <main className="flex-1 py-12 sm:py-16">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
          <p className="font-mono text-xs font-semibold uppercase tracking-widest text-cyan-400">
            {dict.submitPage.eyebrow}
          </p>
          <h1 className="mt-2 text-2xl font-bold tracking-tight text-slate-50 sm:text-3xl">
            {dict.submitPage.title}
          </h1>
          <p className="mt-2 text-sm leading-relaxed text-slate-400">
            {dict.submitPage.subtitle}
          </p>

          {/* CASE 1: Unauthenticated Visitor -> Auth Gate */}
          {!user ? (
            <div className="mt-8 rounded-2xl border border-cyan-500/35 bg-[#0d1322]/95 p-8 shadow-[0_0_40px_rgba(6,182,212,0.08)]">
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-2 rounded-full border border-cyan-500/40 bg-cyan-500/15 px-3 py-1 font-mono text-xs font-semibold text-cyan-300">
                  🔒 {dict.submitPage.authGate.badge}
                </span>
              </div>

              <h2 className="mt-4 text-xl font-bold text-slate-100 sm:text-2xl">
                {dict.submitPage.authGate.title}
              </h2>
              <p className="mt-3 text-sm leading-relaxed text-slate-300">
                {dict.submitPage.authGate.description}
              </p>

              <div className="mt-5 rounded-xl border border-slate-800 bg-[#070b14] p-3.5">
                <p className="font-mono text-xs text-cyan-400">
                  {dict.submitPage.authGate.rlsNote}
                </p>
              </div>

              <div className="mt-6 flex flex-col items-stretch gap-2.5 sm:flex-row sm:flex-wrap sm:items-center sm:gap-3">
                <Link
                  href="/login?next=/catalog/submit"
                  className="rounded-xl bg-cyan-500 px-5 py-3 text-center text-sm font-semibold text-slate-950 shadow-[0_0_25px_rgba(6,182,212,0.3)] transition-colors hover:bg-cyan-400 sm:py-2.5"
                >
                  {dict.submitPage.authGate.loginCta} →
                </Link>
                <Link
                  href="/register?next=/catalog/submit"
                  className="rounded-xl border border-cyan-500/40 bg-cyan-500/10 px-5 py-3 text-center text-sm font-semibold text-cyan-200 transition-colors hover:bg-cyan-500/20 sm:py-2.5"
                >
                  {dict.submitPage.authGate.registerCta}
                </Link>
                <Link
                  href="/catalog"
                  className="rounded-xl border border-slate-800 bg-[#070b14] px-4 py-3 text-center text-sm font-medium text-slate-400 hover:text-slate-200 sm:py-2.5"
                >
                  {dict.submitPage.authGate.backCatalogCta}
                </Link>
              </div>
            </div>
          ) : user.isSuspended ? (
            /* CASE 2: Suspended User -> Blocked by is_active_member() */
            <div className="mt-8 rounded-2xl border border-rose-500/40 bg-rose-950/20 p-8">
              <span className="inline-flex items-center gap-2 rounded-full border border-rose-500/40 bg-rose-500/15 px-3 py-1 font-mono text-xs font-semibold text-rose-300">
                ⛔ {dict.submitPage.authGate.suspendedBadge}
              </span>
              <h2 className="mt-4 text-xl font-bold text-slate-100">
                {dict.submitPage.authGate.suspendedTitle}
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-slate-300">
                {dict.submitPage.authGate.suspendedDescription}
              </p>
              <div className="mt-6">
                <Link
                  href="/catalog"
                  className="inline-flex rounded-xl border border-slate-700 bg-[#0d1322] px-5 py-2.5 text-sm font-medium text-slate-200 hover:border-cyan-500/40"
                >
                  ← {dict.submitPage.cancelButton}
                </Link>
              </div>
            </div>
          ) : (
            /* CASE 3: Authenticated Active Member -> Form Unlocked */
            <>
              <div className="mt-6 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-emerald-500/30 bg-emerald-950/20 px-4 py-3">
                <span className="font-mono text-xs text-emerald-300">
                  ✓{" "}
                  {dict.submitPage.authGate.authenticatedBanner(
                    user.username,
                    user.role
                  )}
                </span>
              </div>

              {/* Moderation & Safety Banner */}
              <div className="mt-4 rounded-2xl border border-cyan-500/25 bg-[#0d1322]/90 p-4">
                <h2 className="font-mono text-xs font-semibold uppercase tracking-wider text-cyan-300">
                  {dict.submitPage.moderationBannerTitle}
                </h2>
                <p className="mt-1 text-xs leading-relaxed text-slate-400">
                  {dict.submitPage.moderationBannerBody}
                </p>
              </div>

              {createdSlug ? (
                <div className="mt-8 rounded-2xl border border-emerald-500/40 bg-emerald-950/20 p-8 text-center">
                  <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full border border-emerald-500/40 bg-emerald-500/20 text-emerald-300">
                    ✓
                  </div>
                  <h2 className="mt-4 text-xl font-bold text-slate-100">
                    {dict.submitPage.successTitle}
                  </h2>
                  <p className="mx-auto mt-2 max-w-lg text-sm text-slate-300">
                    {dict.submitPage.successBody}
                  </p>

                  <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
                    <Link
                      href={`/catalog/${createdSlug}`}
                      className="rounded-xl bg-cyan-500 px-5 py-2.5 text-sm font-semibold text-slate-950 hover:bg-cyan-400"
                    >
                      {dict.submitPage.viewSubmittedResource} →
                    </Link>
                    <button
                      type="button"
                      onClick={resetForm}
                      className="rounded-xl border border-slate-700 bg-[#0d1322] px-5 py-2.5 text-sm font-medium text-slate-200 hover:border-cyan-500/40"
                    >
                      {dict.submitPage.submitAnother}
                    </button>
                  </div>
                </div>
              ) : (
                <form
                  onSubmit={handleSubmit}
                  noValidate
                  className="mt-6 space-y-5 rounded-2xl border border-slate-800/90 bg-[#0d1322]/90 p-4 sm:space-y-6 sm:p-8"
                >
                  {/* Name */}
                  <div>
                    <label
                      htmlFor="resource-name"
                      className="block text-sm font-medium text-slate-200"
                    >
                      {dict.submitPage.nameLabel}
                    </label>
                    <input
                      id="resource-name"
                      type="text"
                      required
                      maxLength={120}
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder={dict.submitPage.namePlaceholder}
                      className="mt-1.5 w-full rounded-xl border border-slate-800 bg-[#070b14] px-3.5 py-2.5 text-base text-slate-100 placeholder:text-slate-500 focus:border-cyan-500/60 focus:outline-none sm:text-sm"
                    />
                    <div className="mt-1 flex justify-between text-xs text-slate-500">
                      <span>{dict.submitPage.nameHint}</span>
                      <span className="font-mono">
                        {name.trim().length} / 120
                      </span>
                    </div>
                    {fieldErrors.name && (
                      <p className="mt-1 text-xs font-medium text-rose-400">
                        {fieldErrors.name}
                      </p>
                    )}
                  </div>

                  {/* Official URL */}
                  <div>
                    <label
                      htmlFor="resource-url"
                      className="block text-sm font-medium text-slate-200"
                    >
                      {dict.submitPage.urlLabel}
                    </label>
                    <input
                      id="resource-url"
                      type="url"
                      required
                      value={url}
                      onChange={(e) => setUrl(e.target.value)}
                      placeholder={dict.submitPage.urlPlaceholder}
                      className="mt-1.5 w-full rounded-xl border border-slate-800 bg-[#070b14] px-3.5 py-2.5 font-mono text-base text-slate-100 placeholder:text-slate-500 focus:border-cyan-500/60 focus:outline-none sm:text-sm"
                    />
                    <div className="mt-1 flex flex-wrap justify-between gap-2 text-xs text-slate-500">
                      <span>{dict.submitPage.urlHint}</span>
                      {url.trim() && (
                        <span className="break-all font-mono text-[11px] text-cyan-400/90">
                          RFC 3986: {normalizeResourceUrl(url)}
                        </span>
                      )}
                    </div>
                    {fieldErrors.url && (
                      <p className="mt-1 text-xs font-medium text-rose-400">
                        {fieldErrors.url}
                      </p>
                    )}
                  </div>

                  {/* Category + Type */}
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div>
                      <label
                        htmlFor="resource-category"
                        className="block text-sm font-medium text-slate-200"
                      >
                        {dict.submitPage.categoryLabel}
                      </label>
                      <select
                        id="resource-category"
                        value={effectiveCategorySlug}
                        onChange={(e) => setCategorySlug(e.target.value)}
                        className="mt-1.5 w-full rounded-xl border border-slate-800 bg-[#070b14] px-3.5 py-2.5 text-base text-slate-100 focus:border-cyan-500/60 focus:outline-none sm:text-sm"
                      >
                        {categories.map((cat) => (
                          <option key={cat.id} value={cat.slug}>
                            {locale === "pt-BR" ? cat.name_pt : cat.name_en}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label
                        htmlFor="resource-type"
                        className="block text-sm font-medium text-slate-200"
                      >
                        {dict.submitPage.typeLabel}
                      </label>
                      <select
                        id="resource-type"
                        value={type}
                        onChange={(e) => setType(e.target.value as ResourceType)}
                        className="mt-1.5 w-full rounded-xl border border-slate-800 bg-[#070b14] px-3.5 py-2.5 text-base text-slate-100 focus:border-cyan-500/60 focus:outline-none sm:text-sm"
                      >
                        {RESOURCE_TYPE_KEYS.map((typeKey) => (
                          <option key={typeKey} value={typeKey}>
                            {dict.resourceTypes[typeKey]}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Difficulty + Language + Author */}
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                    <div>
                      <label
                        htmlFor="resource-difficulty"
                        className="block text-sm font-medium text-slate-200"
                      >
                        {dict.submitPage.difficultyLabel}
                      </label>
                      <select
                        id="resource-difficulty"
                        value={difficulty}
                        onChange={(e) =>
                          setDifficulty(e.target.value as DifficultyLevel | "")
                        }
                        className="mt-1.5 w-full rounded-xl border border-slate-800 bg-[#070b14] px-3.5 py-2.5 text-base text-slate-100 focus:border-cyan-500/60 focus:outline-none sm:text-sm"
                      >
                        <option value="">
                          {dict.submitPage.difficultyOptional}
                        </option>
                        {DIFFICULTY_KEYS.map((diffKey) => (
                          <option key={diffKey} value={diffKey}>
                            {dict.difficulties[diffKey]}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label
                        htmlFor="resource-language"
                        className="block text-sm font-medium text-slate-200"
                      >
                        {dict.submitPage.languageLabel}
                      </label>
                      <select
                        id="resource-language"
                        value={language}
                        onChange={(e) =>
                          setLanguage(e.target.value as ResourceLanguage)
                        }
                        className="mt-1.5 w-full rounded-xl border border-slate-800 bg-[#070b14] px-3.5 py-2.5 text-base text-slate-100 focus:border-cyan-500/60 focus:outline-none sm:text-sm"
                      >
                        {LANGUAGE_KEYS.map((langKey) => (
                          <option key={langKey} value={langKey}>
                            {dict.languages[langKey]}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label
                        htmlFor="resource-author"
                        className="block text-sm font-medium text-slate-200"
                      >
                        {dict.submitPage.authorLabel}
                      </label>
                      <input
                        id="resource-author"
                        type="text"
                        maxLength={120}
                        value={authorName}
                        onChange={(e) => setAuthorName(e.target.value)}
                        placeholder={dict.submitPage.authorPlaceholder}
                        className="mt-1.5 w-full rounded-xl border border-slate-800 bg-[#070b14] px-3.5 py-2.5 text-base text-slate-100 placeholder:text-slate-500 focus:border-cyan-500/60 focus:outline-none sm:text-sm"
                      />
                      {fieldErrors.authorName && (
                        <p className="mt-1 text-xs font-medium text-rose-400">
                          {fieldErrors.authorName}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Description (10 .. 2000 chars) */}
                  <div>
                    <label
                      htmlFor="resource-description"
                      className="block text-sm font-medium text-slate-200"
                    >
                      {dict.submitPage.descriptionLabel}
                    </label>
                    <textarea
                      id="resource-description"
                      rows={5}
                      required
                      maxLength={2000}
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder={dict.submitPage.descriptionPlaceholder}
                      className="mt-1.5 w-full rounded-xl border border-slate-800 bg-[#070b14] p-3.5 text-base leading-relaxed text-slate-100 placeholder:text-slate-500 focus:border-cyan-500/60 focus:outline-none sm:text-sm"
                    />
                    <div className="mt-1 flex justify-between text-xs text-slate-500">
                      <span>{dict.submitPage.descriptionHint}</span>
                      <span className="font-mono">
                        {description.trim().length} / 2000
                      </span>
                    </div>
                    {fieldErrors.description && (
                      <p className="mt-1 text-xs font-medium text-rose-400">
                        {fieldErrors.description}
                      </p>
                    )}
                  </div>

                  {submitError && (
                    <div
                      role="alert"
                      className="rounded-xl border border-rose-500/40 bg-rose-500/10 p-3 text-xs text-rose-200"
                    >
                      {submitError}
                    </div>
                  )}

                  <div className="flex flex-col-reverse items-stretch justify-end gap-2.5 border-t border-slate-800 pt-5 sm:flex-row sm:items-center sm:gap-3">
                    <Link
                      href="/catalog"
                      className="rounded-xl border border-slate-700 bg-[#070b14] px-4 py-3 text-center text-xs font-medium text-slate-300 hover:border-slate-600 sm:py-2.5"
                    >
                      {dict.submitPage.cancelButton}
                    </Link>
                    <button
                      type="submit"
                      disabled={isSubmitting || categories.length === 0}
                      className="rounded-xl bg-cyan-500 px-5 py-3 text-xs font-semibold text-slate-950 shadow-[0_0_20px_rgba(6,182,212,0.25)] transition-colors hover:bg-cyan-400 disabled:opacity-50 sm:py-2.5"
                    >
                      {isSubmitting
                        ? isPt
                          ? "Enviando..."
                          : "Submitting..."
                        : dict.submitPage.submitButton}
                    </button>
                  </div>
                </form>
              )}
            </>
          )}
        </div>
      </main>

      <Footer locale={locale} dict={dict} />
    </div>
  );
}
