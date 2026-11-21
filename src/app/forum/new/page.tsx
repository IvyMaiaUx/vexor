"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useId, useMemo, useRef, useState } from "react";
import { Footer } from "@/components/layout/footer";
import { Header } from "@/components/layout/header";
import { useAuthStore } from "@/features/auth/use-auth-store";
import { useCatalogStore } from "@/features/catalog/use-catalog-store";
import { describeForumMutationError } from "@/features/forum/barrier-messages";
import { createForumTopic } from "@/features/forum/forum-service";
import { MarkdownView } from "@/features/forum/markdown-view";
import { useForumStore } from "@/features/forum/use-forum-store";
import { parseTagsString, validateNewTopic } from "@/features/forum/validation";
import { getDictionary } from "@/lib/i18n/dictionaries";

export default function NewTopicPage() {
  const router = useRouter();
  const { locale, setLocale } = useCatalogStore();
  const dict = useMemo(() => getDictionary(locale), [locale]);
  const { user } = useAuthStore();
  const { categories, categoriesLoading } = useForumStore();

  const titleId = useId();
  const categoryId = useId();
  const tagsId = useId();
  const bodyId = useId();

  const [activeTab, setActiveTab] = useState<"write" | "preview">("write");
  const [title, setTitle] = useState("");
  const [categorySlug, setCategorySlug] = useState("");
  const [tagsString, setTagsString] = useState("");
  const [body, setBody] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const inFlightRef = useRef(false);

  const effectiveCategorySlug = categorySlug || categories[0]?.slug || "";

  const validCategorySlugs = useMemo(
    () => categories.map((c) => c.slug),
    [categories]
  );

  const previewTags = useMemo(
    () => parseTagsString(tagsString),
    [tagsString]
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || inFlightRef.current) return;

    const validation = validateNewTopic(
      { title, categorySlug: effectiveCategorySlug, tagsString, body },
      validCategorySlugs,
      dict
    );

    if (!validation.valid) {
      setErrors(validation.errors as Record<string, string>);
      return;
    }

    const selectedCat = categories.find(
      (c) => c.slug === effectiveCategorySlug
    );
    if (!selectedCat) {
      setErrors({ categorySlug: dict.newTopicPage.errors.categoryRequired });
      return;
    }

    setErrors({});
    setSubmitError(null);
    inFlightRef.current = true;
    setIsSubmitting(true);

    try {
      const result = await createForumTopic(
        {
          title: title.trim(),
          body: body.trim(),
          categoryId: selectedCat.id,
          tags: validation.cleanedTags,
        },
        { categories }
      );

      if (result.status === "error") {
        setSubmitError(describeForumMutationError(result, dict));
        return;
      }

      router.push(`/forum/${result.topic.id}`);
    } finally {
      inFlightRef.current = false;
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-[#070b14] text-slate-100 antialiased selection:bg-cyan-500/30 selection:text-cyan-200">
      <Header locale={locale} onLocaleChange={setLocale} dict={dict} />

      <main className="flex-1 py-8 sm:py-12">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
          {/* Breadcrumb Navigation */}
          <nav
            aria-label="Breadcrumb"
            className="mb-6 flex items-center gap-2 font-mono text-xs text-slate-400"
          >
            <Link
              href="/"
              className="transition-colors hover:text-cyan-400 focus:outline-none focus-visible:text-cyan-400"
            >
              {dict.nav.home}
            </Link>
            <span aria-hidden="true" className="text-slate-600">
              /
            </span>
            <Link
              href="/forum"
              className="transition-colors hover:text-cyan-400 focus:outline-none focus-visible:text-cyan-400"
            >
              {dict.nav.forum}
            </Link>
            <span aria-hidden="true" className="text-slate-600">
              /
            </span>
            <span aria-current="page" className="text-cyan-300">
              {dict.newTopicPage.title}
            </span>
          </nav>

          {/* Page Heading */}
          <div className="mb-8">
            <p className="font-mono text-xs font-semibold uppercase tracking-widest text-indigo-400">
              {dict.newTopicPage.eyebrow}
            </p>
            <h1 className="mt-2 text-2xl font-bold tracking-tight text-slate-100 sm:text-3xl">
              {dict.newTopicPage.title}
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-400">
              {dict.newTopicPage.subtitle}
            </p>
          </div>

          {/* Conditional: Unauthenticated User Gate */}
          {!user ? (
            <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-6 sm:p-8">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                  <h2 className="text-lg font-semibold text-amber-200">
                    {dict.newTopicPage.authRequiredTitle}
                  </h2>
                  <p className="mt-1 max-w-xl text-sm text-amber-300/80">
                    {dict.newTopicPage.authRequiredBody}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <Link
                    href="/login?next=/forum/new"
                    className="rounded-xl border border-amber-500/50 bg-amber-500/20 px-4 py-2 text-xs font-semibold text-amber-200 transition-colors hover:bg-amber-500/30"
                  >
                    {dict.newTopicPage.loginCta}
                  </Link>
                  <Link
                    href="/register?next=/forum/new"
                    className="rounded-xl border border-slate-700 bg-[#0d1322] px-4 py-2 text-xs font-semibold text-slate-300 transition-colors hover:border-slate-600 hover:text-slate-100"
                  >
                    {dict.newTopicPage.registerCta}
                  </Link>
                </div>
              </div>
            </div>
          ) : user.isSuspended ? (
            /* Suspended Account Gate */
            <div className="rounded-2xl border border-rose-500/30 bg-rose-500/10 p-6 sm:p-8">
              <h2 className="text-lg font-semibold text-rose-200">
                {dict.newTopicPage.suspendedTitle}
              </h2>
              <p className="mt-1 text-sm text-rose-300/80">
                Sua conta está suspensa para interações no fórum. Entre em contato com a moderação para mais informações.
              </p>
            </div>
          ) : (
            /* Main Form */
            <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
              <div className="lg:col-span-2">
                <form
                  onSubmit={handleSubmit}
                  className="space-y-6 rounded-2xl border border-slate-800/90 bg-[#0d1322]/90 p-5 sm:p-6"
                >
                  {/* Topic Title */}
                  <div>
                    <div className="flex items-center justify-between">
                      <label
                        htmlFor={titleId}
                        className="block font-mono text-xs font-semibold uppercase tracking-wider text-slate-300"
                      >
                        {dict.newTopicPage.titleLabel}
                      </label>
                      <span className="font-mono text-[11px] text-slate-500">
                        {title.length}/200
                      </span>
                    </div>
                    <input
                      id={titleId}
                      type="text"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder={dict.newTopicPage.titlePlaceholder}
                      maxLength={200}
                      className={`mt-2 w-full rounded-xl border bg-[#070b14] px-4 py-2.5 text-sm text-slate-100 placeholder-slate-500 transition-colors focus:outline-none focus:ring-1 ${
                        errors.title
                          ? "border-rose-500/70 focus:border-rose-500 focus:ring-rose-500/50"
                          : "border-slate-800 focus:border-cyan-500 focus:ring-cyan-500/50"
                      }`}
                    />
                    {errors.title ? (
                      <p className="mt-1 font-mono text-xs text-rose-400">
                        {errors.title}
                      </p>
                    ) : (
                      <p className="mt-1 text-xs text-slate-500">
                        {dict.newTopicPage.titleHint}
                      </p>
                    )}
                  </div>

                  {/* Technical Category */}
                  <div>
                    <label
                      htmlFor={categoryId}
                      className="block font-mono text-xs font-semibold uppercase tracking-wider text-slate-300"
                    >
                      {dict.newTopicPage.categoryLabel}
                    </label>
                    <select
                      id={categoryId}
                      value={effectiveCategorySlug}
                      onChange={(e) => setCategorySlug(e.target.value)}
                      disabled={categoriesLoading}
                      className={`mt-2 w-full rounded-xl border bg-[#070b14] px-4 py-2.5 text-sm text-slate-100 transition-colors focus:outline-none focus:ring-1 ${
                        errors.categorySlug
                          ? "border-rose-500/70 focus:border-rose-500 focus:ring-rose-500/50"
                          : "border-slate-800 focus:border-cyan-500 focus:ring-cyan-500/50"
                      }`}
                    >
                      <option value="">
                        -- {dict.newTopicPage.categoryHint} --
                      </option>
                      {categories.map((cat) => (
                        <option key={cat.id} value={cat.slug}>
                          {locale === "pt-BR" ? cat.name_pt : cat.name_en}
                        </option>
                      ))}
                    </select>
                    {errors.categorySlug && (
                      <p className="mt-1 font-mono text-xs text-rose-400">
                        {errors.categorySlug}
                      </p>
                    )}
                  </div>

                  {/* Technical Tags */}
                  <div>
                    <div className="flex items-center justify-between">
                      <label
                        htmlFor={tagsId}
                        className="block font-mono text-xs font-semibold uppercase tracking-wider text-slate-300"
                      >
                        {dict.newTopicPage.tagsLabel}
                      </label>
                      <span className="font-mono text-[11px] text-slate-500">
                        {previewTags.length}/5 tags
                      </span>
                    </div>
                    <input
                      id={tagsId}
                      type="text"
                      value={tagsString}
                      onChange={(e) => setTagsString(e.target.value)}
                      placeholder={dict.newTopicPage.tagsPlaceholder}
                      className={`mt-2 w-full rounded-xl border bg-[#070b14] px-4 py-2.5 text-sm text-slate-100 placeholder-slate-500 transition-colors focus:outline-none focus:ring-1 ${
                        errors.tagsString
                          ? "border-rose-500/70 focus:border-rose-500 focus:ring-rose-500/50"
                          : "border-slate-800 focus:border-cyan-500 focus:ring-cyan-500/50"
                      }`}
                    />
                    {previewTags.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {previewTags.map((tag) => (
                          <span
                            key={tag}
                            className="inline-flex items-center gap-1 rounded-md border border-cyan-500/30 bg-cyan-500/10 px-2 py-0.5 font-mono text-xs text-cyan-300"
                          >
                            #{tag}
                          </span>
                        ))}
                      </div>
                    )}
                    {errors.tagsString ? (
                      <p className="mt-1 font-mono text-xs text-rose-400">
                        {errors.tagsString}
                      </p>
                    ) : (
                      <p className="mt-1 text-xs text-slate-500">
                        {dict.newTopicPage.tagsHint}
                      </p>
                    )}
                  </div>

                  {/* Body with Write / Preview Tabs */}
                  <div>
                    <div className="flex items-center justify-between">
                      <label
                        htmlFor={bodyId}
                        className="block font-mono text-xs font-semibold uppercase tracking-wider text-slate-300"
                      >
                        {dict.newTopicPage.bodyLabel}
                      </label>
                      <div className="flex items-center gap-2">
                        <div className="flex rounded-lg border border-slate-800 bg-[#070b14] p-0.5">
                          <button
                            type="button"
                            onClick={() => setActiveTab("write")}
                            className={`rounded-md px-2.5 py-1 font-mono text-xs font-medium transition-colors ${
                              activeTab === "write"
                                ? "border border-cyan-500/40 bg-cyan-500/20 text-cyan-300"
                                : "text-slate-400 hover:text-slate-200"
                            }`}
                          >
                            {dict.newTopicPage.writeTab}
                          </button>
                          <button
                            type="button"
                            onClick={() => setActiveTab("preview")}
                            className={`rounded-md px-2.5 py-1 font-mono text-xs font-medium transition-colors ${
                              activeTab === "preview"
                                ? "border border-cyan-500/40 bg-cyan-500/20 text-cyan-300"
                                : "text-slate-400 hover:text-slate-200"
                            }`}
                          >
                            {dict.newTopicPage.previewTab}
                          </button>
                        </div>
                      </div>
                    </div>

                    {activeTab === "write" ? (
                      <textarea
                        id={bodyId}
                        rows={12}
                        value={body}
                        onChange={(e) => setBody(e.target.value)}
                        placeholder={dict.newTopicPage.bodyPlaceholder}
                        maxLength={20000}
                        className={`mt-2 w-full font-mono text-sm leading-relaxed rounded-xl border bg-[#070b14] p-4 text-slate-100 placeholder-slate-500 transition-colors focus:outline-none focus:ring-1 ${
                          errors.body
                            ? "border-rose-500/70 focus:border-rose-500 focus:ring-rose-500/50"
                            : "border-slate-800 focus:border-cyan-500 focus:ring-cyan-500/50"
                        }`}
                      />
                    ) : (
                      <div className="mt-2 min-h-[290px] rounded-xl border border-slate-800 bg-[#070b14] p-4">
                        {body.trim().length > 0 ? (
                          <MarkdownView content={body} />
                        ) : (
                          <p className="font-mono text-xs italic text-slate-500">
                            (Nenhum conteúdo digitado para pré-visualização)
                          </p>
                        )}
                      </div>
                    )}

                    <div className="mt-1.5 flex items-center justify-between">
                      {errors.body ? (
                        <p className="font-mono text-xs text-rose-400">
                          {errors.body}
                        </p>
                      ) : (
                        <p className="text-xs text-slate-500">
                          {dict.newTopicPage.bodyHint}
                        </p>
                      )}
                      <span className="font-mono text-[11px] text-slate-500">
                        {body.length}/20000
                      </span>
                    </div>
                  </div>

                  {submitError && (
                    <div className="rounded-xl border border-rose-500/40 bg-rose-950/25 px-4 py-3 text-xs font-medium text-rose-200">
                      {submitError}
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex flex-wrap items-center justify-end gap-3 border-t border-slate-800/80 pt-4">
                    <Link
                      href="/forum"
                      className="rounded-xl border border-slate-800 px-4 py-2.5 text-xs font-semibold text-slate-300 transition-colors hover:border-slate-700 hover:text-slate-100"
                    >
                      {dict.newTopicPage.cancelButton}
                    </Link>
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="inline-flex items-center gap-2 rounded-xl bg-cyan-500 px-5 py-2.5 text-xs font-semibold text-slate-950 shadow-[0_0_20px_rgba(6,182,212,0.3)] transition-colors hover:bg-cyan-400 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {isSubmitting ? "..." : dict.newTopicPage.submitButton}
                    </button>
                  </div>
                </form>
              </div>

              {/* Sidebar: Guidelines & Best Practices */}
              <aside className="space-y-6">
                <div className="rounded-2xl border border-indigo-500/30 bg-[#0d1322]/90 p-5">
                  <h3 className="font-mono text-xs font-bold uppercase tracking-wider text-indigo-400">
                    {dict.newTopicPage.guidelinesTitle}
                  </h3>
                  <p className="mt-2 text-xs leading-relaxed text-slate-300">
                    {dict.newTopicPage.guidelinesBody}
                  </p>
                  <ul className="mt-4 space-y-2 border-t border-slate-800/80 pt-3 text-xs text-slate-400">
                    <li className="flex items-start gap-2">
                      <span className="text-cyan-400">✓</span>
                      <span>Inclua logs e artefatos devidamente descaracterizados.</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-cyan-400">✓</span>
                      <span>Especifique SO, ferramentas e versões usadas.</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-cyan-400">✓</span>
                      <span>Marque a melhor resposta como aceita quando seu problema for solucionado.</span>
                    </li>
                  </ul>
                </div>

                <div className="rounded-2xl border border-slate-800 bg-[#0d1322]/60 p-5 text-xs text-slate-400">
                  <p className="font-semibold text-slate-300">
                    Autoria e Reputação
                  </p>
                  <p className="mt-1 leading-relaxed">
                    Você está publicando como <strong className="text-cyan-300">@{user.username}</strong> ({user.role}). Suas contribuições ganham votos e impulsionam sua reputação no ecossistema Vexor.
                  </p>
                </div>
              </aside>
            </div>
          )}
        </div>
      </main>

      <Footer locale={locale} dict={dict} />
    </div>
  );
}
