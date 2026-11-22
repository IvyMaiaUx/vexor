"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { type FormEvent, useMemo, useRef, useState } from "react";
import type {
  DifficultyLevel,
  ResourceCreditCardRequirement,
  ResourceLanguage,
  ResourceOptionalTag,
  ResourcePricingModel,
  ResourceType,
} from "@/config/site";
import { Footer } from "@/components/layout/footer";
import { Header } from "@/components/layout/header";
import { useAuthStore } from "@/features/auth/use-auth-store";
import { submitCatalogResource } from "@/features/catalog/catalog-service";
import {
  CREDIT_CARD_OPTIONS,
  getCreditCardLabel,
  getPricingModelLabel,
  getResourceTagLabel,
  OPTIONAL_TAG_OPTIONS,
  PRICING_MODEL_OPTIONS,
} from "@/features/catalog/pricing-labels";
import { useCatalogStore } from "@/features/catalog/use-catalog-store";
import {
  computeResourceTags,
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

type SubmitStep = 1 | 2 | 3;

export default function SubmitResourcePage() {
  const router = useRouter();
  const { locale, setLocale, categories } = useCatalogStore();
  const { user, isActiveMember } = useAuthStore();
  const dict = useMemo(() => getDictionary(locale), [locale]);
  const isPt = locale === "pt-BR";

  const [step, setStep] = useState<SubmitStep>(1);
  const [rulesOpen, setRulesOpen] = useState(false);

  const [name, setName] = useState("");
  const [url, setUrl] = useState("");
  const [categorySlug, setCategorySlug] = useState("");
  const [type, setType] = useState<ResourceType>("tool");
  const [difficulty, setDifficulty] = useState<DifficultyLevel | "">("");
  const [language, setLanguage] = useState<ResourceLanguage>("en");
  const [authorName, setAuthorName] = useState("");
  const [description, setDescription] = useState("");
  const [pricingModel, setPricingModel] = useState<ResourcePricingModel | "">(
    "free"
  );
  const [requiresCreditCard, setRequiresCreditCard] = useState<
    ResourceCreditCardRequirement | ""
  >("no");
  const [freeTierLimits, setFreeTierLimits] = useState("");
  const [pricingNotes, setPricingNotes] = useState("");
  const [optionalTags, setOptionalTags] = useState<ResourceOptionalTag[]>([]);
  const [fieldErrors, setFieldErrors] = useState<
    Partial<Record<keyof ResourceSubmissionInput, string>>
  >({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [createdSlug, setCreatedSlug] = useState<string | null>(null);
  const inFlightRef = useRef(false);

  const effectiveCategorySlug = categorySlug || categories[0]?.slug || "";
  const previewTags = useMemo(() => {
    if (!pricingModel || !requiresCreditCard) return [];
    return computeResourceTags(pricingModel, requiresCreditCard, optionalTags);
  }, [optionalTags, pricingModel, requiresCreditCard]);

  const toggleOptionalTag = (tag: ResourceOptionalTag) => {
    setOptionalTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  };

  const buildInput = (): ResourceSubmissionInput => ({
    name,
    url,
    categorySlug: effectiveCategorySlug,
    type,
    difficulty,
    language,
    authorName,
    description,
    pricingModel,
    requiresCreditCard,
    freeTierLimits,
    pricingNotes,
    optionalTags,
  });

  const handleNextStep = () => {
    const validation = validateResourceSubmission(buildInput(), [], dict);
    if (step === 1) {
      const step1Errors: Partial<Record<keyof ResourceSubmissionInput, string>> =
        {};
      if (validation.errors.name) step1Errors.name = validation.errors.name;
      if (validation.errors.url) step1Errors.url = validation.errors.url;
      if (validation.errors.description)
        step1Errors.description = validation.errors.description;

      if (Object.keys(step1Errors).length > 0) {
        setFieldErrors(step1Errors);
        return;
      }
      setFieldErrors({});
      setStep(2);
      return;
    }

    if (step === 2) {
      const selectedCategory = categories.find(
        (c) => c.slug === effectiveCategorySlug
      );
      if (!selectedCategory) {
        setFieldErrors({
          categorySlug: isPt
            ? "Selecione uma categoria válida."
            : "Select a valid category.",
        });
        return;
      }
      setFieldErrors({});
      setStep(3);
    }
  };

  const handleBack = () => {
    setFieldErrors({});
    if (step === 1) {
      router.push("/catalog");
      return;
    }
    setStep((prev) => (prev === 3 ? 2 : 1));
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (step < 3) {
      handleNextStep();
      return;
    }

    if (!isActiveMember || !user || inFlightRef.current || isSubmitting) {
      return;
    }

    const selectedCategory = categories.find(
      (c) => c.slug === effectiveCategorySlug
    );
    const validation = validateResourceSubmission(buildInput(), [], dict);

    if (
      !validation.valid ||
      !selectedCategory ||
      !pricingModel ||
      !requiresCreditCard
    ) {
      const nextErrors = {
        ...validation.errors,
        ...(!selectedCategory
          ? {
              categorySlug: isPt
                ? "Selecione uma categoria válida."
                : "Select a valid category.",
            }
          : {}),
      };
      setFieldErrors(nextErrors);
      setSubmitError(null);
      if (nextErrors.name || nextErrors.url || nextErrors.description) {
        setStep(1);
      } else if (nextErrors.categorySlug) {
        setStep(2);
      }
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
          pricingModel,
          requiresCreditCard,
          freeTierLimits: freeTierLimits.trim() || undefined,
          pricingNotes: pricingNotes.trim() || undefined,
          optionalTags,
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
    setPricingModel("free");
    setRequiresCreditCard("no");
    setFreeTierLimits("");
    setPricingNotes("");
    setOptionalTags([]);
    setFieldErrors({});
    setSubmitError(null);
    setCreatedSlug(null);
    setStep(1);
  };

  const stepLabel =
    step === 1
      ? isPt
        ? "Etapa 1 de 3 · O recurso"
        : "Step 1 of 3 · The resource"
      : step === 2
        ? isPt
          ? "Etapa 2 de 3 · Classificação"
          : "Step 2 of 3 · Classification"
        : isPt
          ? "Etapa 3 de 3 · Preço"
          : "Step 3 of 3 · Pricing";

  const normalizedUrlPreview = url.trim() ? normalizeResourceUrl(url) : null;

  return (
    <div className="flex min-h-screen flex-col">
      <Header locale={locale} onLocaleChange={setLocale} dict={dict} />

      <main className="flex-1 py-4 pb-36 sm:py-8 lg:pb-14">
        <div className="mx-auto max-w-2xl px-4 sm:px-6">
          <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.16em] text-cyan-400">
            {isPt ? "CONTRIBUIÇÃO COMUNITÁRIA" : "COMMUNITY CONTRIBUTION"}
          </p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-50 sm:text-3xl">
            {isPt ? "Sugerir novo recurso" : "Suggest new resource"}
          </h1>

          {/* Auth / Suspended Gates */}
          {!user ? (
            <div className="mt-6 rounded-2xl border border-amber-500/30 bg-amber-500/10 p-6 text-center">
              <p className="text-sm font-semibold text-amber-200">
                {dict.submitPage.authGate.title}
              </p>
              <p className="mt-1.5 text-xs text-amber-200/80">
                {dict.submitPage.authGate.description}
              </p>
              <Link
                href="/login?next=/catalog/submit"
                className="mt-4 inline-flex min-h-[44px] items-center rounded-xl bg-cyan-500 px-5 text-sm font-semibold text-slate-950 hover:bg-cyan-400"
              >
                {dict.nav.signIn} →
              </Link>
            </div>
          ) : user.isSuspended ? (
            <div className="mt-6 rounded-2xl border border-rose-500/30 bg-rose-950/25 p-6 text-center text-sm text-rose-200">
              {isPt
                ? "Sua conta está temporariamente suspensa para envio de novos recursos."
                : "Your account is temporarily suspended from submitting new resources."}
            </div>
          ) : createdSlug ? (
            <div className="mt-6 rounded-2xl border border-emerald-500/40 bg-emerald-950/20 p-6 text-center">
              <p className="font-mono text-xs font-semibold uppercase tracking-wider text-emerald-400">
                {isPt ? "STATUS: PENDENTE" : "STATUS: PENDING"}
              </p>
              <h2 className="mt-2 text-xl font-bold text-slate-100">
                {dict.submitPage.successTitle}
              </h2>
              <p className="mt-2 text-sm text-slate-300">
                {dict.submitPage.successBody}
              </p>
              <div className="mt-6 flex flex-col gap-2.5 sm:flex-row sm:justify-center">
                <Link
                  href="/my-contributions"
                  className="inline-flex min-h-[44px] items-center justify-center rounded-xl bg-cyan-500 px-5 text-sm font-semibold text-slate-950 hover:bg-cyan-400"
                >
                  {dict.submitPage.viewSubmittedResource}
                </Link>
                <button
                  type="button"
                  onClick={resetForm}
                  className="inline-flex min-h-[44px] items-center justify-center rounded-xl border border-slate-700 bg-[#0d1322] px-5 text-sm font-medium text-slate-200 hover:border-cyan-500/40"
                >
                  {dict.submitPage.submitAnother}
                </button>
              </div>
            </div>
          ) : (
            <>
              {/* 3-Segment Progress Bar */}
              <div className="mt-4">
                <div
                  className="flex gap-1.5"
                  role="progressbar"
                  aria-valuenow={step}
                  aria-valuemin={1}
                  aria-valuemax={3}
                  aria-label={stepLabel}
                >
                  {[1, 2, 3].map((idx) => (
                    <span
                      key={idx}
                      className={`h-1 flex-1 rounded-full transition-colors ${
                        idx <= step ? "bg-cyan-400" : "bg-slate-800"
                      }`}
                    />
                  ))}
                </div>
                <p className="mt-1.5 text-xs text-slate-400">{stepLabel}</p>
              </div>

              {/* Collapsible Curation & Security Rules */}
              <div className="mt-3 rounded-2xl border border-slate-800/90 bg-[#0d1322]/90">
                <button
                  type="button"
                  onClick={() => setRulesOpen((prev) => !prev)}
                  aria-expanded={rulesOpen}
                  className="flex min-h-[48px] w-full items-center gap-2.5 px-4 text-left text-sm font-medium text-slate-200"
                >
                  <span className="text-cyan-400" aria-hidden="true">
                    <svg
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.8"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="h-[18px] w-[18px]"
                    >
                      <path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z" />
                    </svg>
                  </span>
                  <span className="flex-1">
                    {isPt
                      ? "Regras de curadoria e segurança"
                      : "Curation and security rules"}
                  </span>
                  <svg
                    aria-hidden="true"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className={`h-4 w-4 text-slate-400 transition-transform ${
                      rulesOpen ? "rotate-180" : ""
                    }`}
                  >
                    <path d="M6 9l6 6 6-6" />
                  </svg>
                </button>
                {rulesOpen && (
                  <div className="border-t border-slate-800/80 px-4 py-3 text-xs leading-relaxed text-slate-400">
                    <ul className="list-disc space-y-1 pl-4">
                      <li>
                        {isPt
                          ? "Envie apenas links oficiais (HTTPS) de ferramentas, repositórios, cursos, laboratórios ou documentações."
                          : "Submit only official HTTPS links to tools, repositories, courses, labs, or documentation."}
                      </li>
                      <li>
                        {isPt
                          ? "Conteúdo estritamente educacional, defensivo ou para testes autorizados — sem malware perigoso ou credenciais vazadas."
                          : "Strictly educational, defensive, or authorized testing content — no harmful malware or leaked credentials."}
                      </li>
                      <li>
                        {isPt
                          ? "Toda submissão entra em revisão de moderação antes de aparecer no catálogo público."
                          : "Every submission undergoes moderation review before appearing in the public catalog."}
                      </li>
                    </ul>
                  </div>
                )}
              </div>

              {/* Multi-Step Form */}
              <form onSubmit={handleSubmit} noValidate className="mt-4 space-y-4">
                {step === 1 && (
                  <div className="space-y-4">
                    <label className="block text-sm font-medium text-slate-200">
                      <span>{dict.submitPage.nameLabel}</span>
                      <input
                        type="text"
                        required
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder={dict.submitPage.namePlaceholder}
                        className="mt-1.5 block min-h-[48px] w-full rounded-xl border border-slate-800 bg-[#0d1322] px-3.5 text-[15px] text-slate-100 placeholder:text-slate-500 focus:border-cyan-500/60 focus:outline-none sm:text-sm"
                      />
                      {fieldErrors.name && (
                        <span className="mt-1 block text-xs text-rose-400">
                          {fieldErrors.name}
                        </span>
                      )}
                    </label>

                    <label className="block text-sm font-medium text-slate-200">
                      <span>{dict.submitPage.urlLabel}</span>
                      <input
                        type="url"
                        required
                        value={url}
                        onChange={(e) => setUrl(e.target.value)}
                        placeholder={dict.submitPage.urlPlaceholder}
                        className="mt-1.5 block min-h-[48px] w-full rounded-xl border border-slate-800 bg-[#0d1322] px-3.5 text-[15px] text-slate-100 placeholder:text-slate-500 focus:border-cyan-500/60 focus:outline-none sm:text-sm"
                      />
                      {normalizedUrlPreview && !fieldErrors.url && (
                        <span className="mt-1 block truncate font-mono text-[11px] text-slate-500">
                          {normalizedUrlPreview}
                        </span>
                      )}
                      {fieldErrors.url && (
                        <span className="mt-1 block text-xs text-rose-400">
                          {fieldErrors.url}
                        </span>
                      )}
                    </label>

                    <label className="block text-sm font-medium text-slate-200">
                      <span>{dict.submitPage.descriptionLabel}</span>
                      <textarea
                        required
                        rows={4}
                        maxLength={2000}
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        placeholder={
                          isPt
                            ? "Propósito, casos de uso e público recomendado…"
                            : "Purpose, use cases, and target audience…"
                        }
                        className="mt-1.5 block min-h-[112px] w-full rounded-xl border border-slate-800 bg-[#0d1322] p-3.5 text-[15px] text-slate-100 placeholder:text-slate-500 focus:border-cyan-500/60 focus:outline-none sm:text-sm"
                      />
                      <span className="mt-1 flex items-center justify-between text-xs">
                        <span className="text-rose-400">
                          {fieldErrors.description ?? ""}
                        </span>
                        <span className="font-mono text-slate-500">
                          {description.length} / 2000
                        </span>
                      </span>
                    </label>
                  </div>
                )}

                {step === 2 && (
                  <div className="space-y-4">
                    <label className="block text-sm font-medium text-slate-200">
                      <span>{dict.submitPage.categoryLabel}</span>
                      <select
                        value={effectiveCategorySlug}
                        onChange={(e) => setCategorySlug(e.target.value)}
                        className="mt-1.5 block min-h-[48px] w-full rounded-xl border border-slate-800 bg-[#0d1322] px-3.5 text-[15px] text-slate-100 focus:border-cyan-500/60 focus:outline-none sm:text-sm"
                      >
                        {categories.map((cat) => (
                          <option key={cat.slug} value={cat.slug}>
                            {isPt ? cat.name_pt : cat.name_en}
                          </option>
                        ))}
                      </select>
                      {fieldErrors.categorySlug && (
                        <span className="mt-1 block text-xs text-rose-400">
                          {fieldErrors.categorySlug}
                        </span>
                      )}
                    </label>

                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      <label className="block text-sm font-medium text-slate-200">
                        <span>{dict.submitPage.typeLabel}</span>
                        <select
                          value={type}
                          onChange={(e) =>
                            setType(e.target.value as ResourceType)
                          }
                          className="mt-1.5 block min-h-[48px] w-full rounded-xl border border-slate-800 bg-[#0d1322] px-3.5 text-[15px] text-slate-100 focus:border-cyan-500/60 focus:outline-none sm:text-sm"
                        >
                          {RESOURCE_TYPE_KEYS.map((k) => (
                            <option key={k} value={k}>
                              {dict.resourceTypes[k]}
                            </option>
                          ))}
                        </select>
                      </label>

                      <label className="block text-sm font-medium text-slate-200">
                        <span>{dict.submitPage.difficultyLabel}</span>
                        <select
                          value={difficulty}
                          onChange={(e) =>
                            setDifficulty(
                              e.target.value as DifficultyLevel | ""
                            )
                          }
                          className="mt-1.5 block min-h-[48px] w-full rounded-xl border border-slate-800 bg-[#0d1322] px-3.5 text-[15px] text-slate-100 focus:border-cyan-500/60 focus:outline-none sm:text-sm"
                        >
                          <option value="">
                            {isPt ? "Não especificado" : "Not specified"}
                          </option>
                          {DIFFICULTY_KEYS.map((k) => (
                            <option key={k} value={k}>
                              {dict.difficulties[k]}
                            </option>
                          ))}
                        </select>
                      </label>
                    </div>

                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      <label className="block text-sm font-medium text-slate-200">
                        <span>{dict.submitPage.languageLabel}</span>
                        <select
                          value={language}
                          onChange={(e) =>
                            setLanguage(e.target.value as ResourceLanguage)
                          }
                          className="mt-1.5 block min-h-[48px] w-full rounded-xl border border-slate-800 bg-[#0d1322] px-3.5 text-[15px] text-slate-100 focus:border-cyan-500/60 focus:outline-none sm:text-sm"
                        >
                          {LANGUAGE_KEYS.map((k) => (
                            <option key={k} value={k}>
                              {dict.languages[k]}
                            </option>
                          ))}
                        </select>
                      </label>

                      <label className="block text-sm font-medium text-slate-200">
                        <span>{dict.submitPage.authorLabel}</span>
                        <input
                          type="text"
                          value={authorName}
                          onChange={(e) => setAuthorName(e.target.value)}
                          placeholder={dict.submitPage.authorPlaceholder}
                          className="mt-1.5 block min-h-[48px] w-full rounded-xl border border-slate-800 bg-[#0d1322] px-3.5 text-[15px] text-slate-100 placeholder:text-slate-500 focus:border-cyan-500/60 focus:outline-none sm:text-sm"
                        />
                      </label>
                    </div>
                  </div>
                )}

                {step === 3 && (
                  <div className="space-y-4">
                    <div>
                      <p className="mb-2 text-sm font-medium text-slate-200">
                        {isPt ? "Modelo de preço *" : "Pricing model *"}
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {PRICING_MODEL_OPTIONS.map((opt) => {
                          const active = pricingModel === opt;
                          return (
                            <button
                              key={opt}
                              type="button"
                              onClick={() => setPricingModel(opt)}
                              aria-pressed={active}
                              className={`inline-flex min-h-[44px] items-center rounded-xl border px-4 text-sm font-medium transition-colors ${
                                active
                                  ? "border-cyan-500/60 bg-cyan-500/15 text-cyan-300"
                                  : "border-slate-800 bg-[#0d1322] text-slate-300 hover:border-slate-700"
                              }`}
                            >
                              {getPricingModelLabel(opt, locale)}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    <div>
                      <p className="mb-2 text-sm font-medium text-slate-200">
                        {isPt
                          ? "Exige cartão de crédito? *"
                          : "Requires credit card? *"}
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {CREDIT_CARD_OPTIONS.map((opt) => {
                          const active = requiresCreditCard === opt;
                          return (
                            <button
                              key={opt}
                              type="button"
                              onClick={() => setRequiresCreditCard(opt)}
                              aria-pressed={active}
                              className={`inline-flex min-h-[44px] items-center rounded-xl border px-3.5 text-xs font-medium transition-colors ${
                                active
                                  ? "border-cyan-500/60 bg-cyan-500/15 text-cyan-300"
                                  : "border-slate-800 bg-[#0d1322] text-slate-300 hover:border-slate-700"
                              }`}
                            >
                              {getCreditCardLabel(opt, locale)}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    <label className="block text-sm font-medium text-slate-200">
                      <span>
                        {isPt
                          ? "Limites do plano gratuito (opcional)"
                          : "Free tier limits (optional)"}
                      </span>
                      <input
                        type="text"
                        value={freeTierLimits}
                        onChange={(e) => setFreeTierLimits(e.target.value)}
                        placeholder={
                          isPt
                            ? "Ex.: 100 consultas/mês ou uso local ilimitado"
                            : "E.g. 100 queries/month or unlimited local use"
                        }
                        className="mt-1.5 block min-h-[48px] w-full rounded-xl border border-slate-800 bg-[#0d1322] px-3.5 text-[15px] text-slate-100 placeholder:text-slate-500 focus:border-cyan-500/60 focus:outline-none sm:text-sm"
                      />
                    </label>

                    <label className="block text-sm font-medium text-slate-200">
                      <span>
                        {isPt
                          ? "Observações de preço (opcional)"
                          : "Pricing notes (optional)"}
                      </span>
                      <input
                        type="text"
                        value={pricingNotes}
                        onChange={(e) => setPricingNotes(e.target.value)}
                        placeholder={
                          isPt
                            ? "Ex.: Exige chave de API própria"
                            : "E.g. Requires your own API key"
                        }
                        className="mt-1.5 block min-h-[48px] w-full rounded-xl border border-slate-800 bg-[#0d1322] px-3.5 text-[15px] text-slate-100 placeholder:text-slate-500 focus:border-cyan-500/60 focus:outline-none sm:text-sm"
                      />
                    </label>

                    <div>
                      <p className="mb-2 text-sm font-medium text-slate-200">
                        {isPt ? "Tags opcionais" : "Optional tags"}
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {OPTIONAL_TAG_OPTIONS.map((tag) => {
                          const active = optionalTags.includes(tag);
                          return (
                            <button
                              key={tag}
                              type="button"
                              onClick={() => toggleOptionalTag(tag)}
                              aria-pressed={active}
                              className={`inline-flex min-h-[44px] items-center rounded-full border px-4 text-xs font-medium transition-colors ${
                                active
                                  ? "border-cyan-500/60 bg-cyan-500/15 text-cyan-300"
                                  : "border-slate-800 bg-[#0d1322] text-slate-300"
                              }`}
                            >
                              {getResourceTagLabel(tag, locale)}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {previewTags.length > 0 && (
                      <div className="rounded-xl border border-slate-800/80 bg-[#0d1322]/70 p-3">
                        <p className="font-mono text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                          {isPt ? "Prévia das tags" : "Tag preview"}
                        </p>
                        <div className="mt-2 flex flex-wrap gap-1.5">
                          {previewTags.map((tag) => (
                            <span
                              key={tag}
                              className="inline-flex h-[22px] items-center rounded-md border border-emerald-500/35 bg-emerald-500/10 px-2 font-mono text-[11px] font-semibold text-emerald-400"
                            >
                              {getResourceTagLabel(tag, locale)}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {submitError && (
                  <p className="rounded-xl border border-rose-500/40 bg-rose-950/30 px-4 py-3 text-xs font-medium text-rose-200">
                    {submitError}
                  </p>
                )}

                {/* Fixed Action Bar above Bottom Nav on Mobile, inline on Desktop */}
                <div className="fixed inset-x-0 bottom-[74px] z-30 flex items-center gap-2.5 border-t border-slate-800/90 bg-[#070b14]/95 px-4 py-3 backdrop-blur-md lg:static lg:mt-6 lg:border-0 lg:bg-transparent lg:p-0">
                  <button
                    type="button"
                    onClick={handleBack}
                    className="inline-flex min-h-[48px] items-center justify-center rounded-xl border border-slate-700 bg-[#0d1322] px-5 text-sm font-medium text-slate-200 transition-colors hover:border-cyan-500/40"
                  >
                    {isPt ? "Voltar" : "Back"}
                  </button>

                  {step < 3 ? (
                    <button
                      type="button"
                      onClick={handleNextStep}
                      className="inline-flex min-h-[48px] flex-1 items-center justify-center rounded-xl bg-cyan-500 px-5 text-sm font-bold text-slate-950 shadow-[0_0_20px_rgba(6,182,212,0.25)] transition-colors hover:bg-cyan-400"
                    >
                      {isPt ? "Continuar" : "Continue"}
                    </button>
                  ) : (
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="inline-flex min-h-[48px] flex-1 items-center justify-center rounded-xl bg-cyan-500 px-5 text-sm font-bold text-slate-950 shadow-[0_0_20px_rgba(6,182,212,0.25)] transition-colors hover:bg-cyan-400 disabled:opacity-50"
                    >
                      {isSubmitting
                        ? isPt
                          ? "Enviando..."
                          : "Submitting..."
                        : isPt
                          ? "Enviar recurso"
                          : "Submit resource"}
                    </button>
                  )}
                </div>
              </form>
            </>
          )}
        </div>
      </main>

      <Footer locale={locale} dict={dict} />
    </div>
  );
}
