"use client";

import type {
  DifficultyLevel,
  ResourceLanguage,
  ResourcePricingModel,
  ResourceType,
  SupportedLocale,
} from "@/config/site";
import type { CatalogCategoryItem } from "@/features/catalog/catalog-service";
import type { Dictionary } from "@/lib/i18n/dictionaries";

interface FilterSheetProps {
  open: boolean;
  onClose: () => void;
  locale: SupportedLocale;
  dict: Dictionary;
  categories: CatalogCategoryItem[];
  selectedCategory: string;
  selectedType: string;
  selectedDifficulty: string;
  selectedLanguage: string;
  selectedPricing: string;
  noCardOnly: boolean;
  totalCount: number;
  onUpdate: (updates: Record<string, string | null>) => void;
  onClearAll: () => void;
}

const TYPE_OPTIONS: ResourceType[] = [
  "tool",
  "course",
  "repository",
  "lab",
  "framework",
  "script",
  "documentation",
  "ctf_platform",
  "article",
];

const DIFFICULTY_OPTIONS: DifficultyLevel[] = [
  "beginner",
  "intermediate",
  "advanced",
];

const LANGUAGE_OPTIONS: Array<{ value: ResourceLanguage; label: string }> = [
  { value: "pt-BR", label: "PT-BR" },
  { value: "en", label: "EN" },
  { value: "multilingual", label: "Multi" },
];

const PRICING_OPTIONS: Array<{
  value: ResourcePricingModel;
  pt: string;
  en: string;
}> = [
  { value: "free", pt: "Grátis", en: "Free" },
  { value: "freemium", pt: "Freemium", en: "Freemium" },
  { value: "paid", pt: "Pago", en: "Paid" },
];

export function FilterSheet({
  open,
  onClose,
  locale,
  dict,
  categories,
  selectedCategory,
  selectedType,
  selectedDifficulty,
  selectedLanguage,
  selectedPricing,
  noCardOnly,
  totalCount,
  onUpdate,
  onClearAll,
}: FilterSheetProps) {
  if (!open) return null;
  const isPt = locale === "pt-BR";

  const pillClass = (active: boolean) =>
    `inline-flex min-h-[40px] items-center rounded-full border px-3.5 text-xs font-medium transition-colors ${
      active
        ? "border-cyan-500/60 bg-cyan-500/15 text-cyan-300"
        : "border-slate-800 bg-[#0d1322] text-slate-300 hover:border-slate-700 hover:text-slate-100"
    }`;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={isPt ? "Filtros do catálogo" : "Catalog filters"}
      className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/75 backdrop-blur-xs sm:items-center sm:p-4"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="flex max-h-[85vh] w-full flex-col overflow-hidden rounded-t-3xl border border-slate-800 bg-[#070b14] shadow-2xl sm:max-w-lg sm:rounded-2xl"
      >
        {/* Drag handle + Header */}
        <div className="shrink-0 px-5 pt-3 pb-2">
          <div
            aria-hidden="true"
            className="mx-auto mb-3 h-1 w-10 rounded-full bg-slate-700 sm:hidden"
          />
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-slate-100">
              {isPt ? "Filtros" : "Filters"}
            </h2>
            <button
              type="button"
              onClick={onClearAll}
              className="inline-flex min-h-[44px] items-center px-2 text-sm font-medium text-slate-400 transition-colors hover:text-cyan-300"
            >
              {isPt ? "Limpar tudo" : "Clear all"}
            </button>
          </div>
        </div>

        {/* Scrollable Filter Groups */}
        <div className="flex-1 space-y-5 overflow-y-auto px-5 py-3">
          {/* CATEGORIA */}
          <div>
            <p className="mb-2 font-mono text-[11px] font-semibold uppercase tracking-widest text-slate-400">
              {isPt ? "CATEGORIA" : "CATEGORY"}
            </p>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => onUpdate({ category: null, tab: null })}
                className={pillClass(selectedCategory === "all")}
              >
                {isPt ? "Todas" : "All"}
              </button>
              {categories.map((cat) => {
                const active = selectedCategory === cat.slug;
                return (
                  <button
                    key={cat.slug}
                    type="button"
                    onClick={() =>
                      onUpdate({
                        category: active ? null : cat.slug,
                        tab: null,
                      })
                    }
                    className={pillClass(active)}
                  >
                    {isPt ? cat.name_pt : cat.name_en}
                  </button>
                );
              })}
            </div>
          </div>

          {/* TIPO */}
          <div>
            <p className="mb-2 font-mono text-[11px] font-semibold uppercase tracking-widest text-slate-400">
              {isPt ? "TIPO" : "TYPE"}
            </p>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => onUpdate({ type: null })}
                className={pillClass(selectedType === "all")}
              >
                {isPt ? "Todos" : "All"}
              </button>
              {TYPE_OPTIONS.map((t) => {
                const active = selectedType === t;
                return (
                  <button
                    key={t}
                    type="button"
                    onClick={() => onUpdate({ type: active ? null : t })}
                    className={pillClass(active)}
                  >
                    {dict.resourceTypes[t]}
                  </button>
                );
              })}
            </div>
          </div>

          {/* NÍVEL */}
          <div>
            <p className="mb-2 font-mono text-[11px] font-semibold uppercase tracking-widest text-slate-400">
              {isPt ? "NÍVEL" : "LEVEL"}
            </p>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => onUpdate({ difficulty: null })}
                className={pillClass(selectedDifficulty === "all")}
              >
                {isPt ? "Qualquer" : "Any"}
              </button>
              {DIFFICULTY_OPTIONS.map((d) => {
                const active = selectedDifficulty === d;
                return (
                  <button
                    key={d}
                    type="button"
                    onClick={() => onUpdate({ difficulty: active ? null : d })}
                    className={pillClass(active)}
                  >
                    {dict.difficulties[d]}
                  </button>
                );
              })}
            </div>
          </div>

          {/* IDIOMA */}
          <div>
            <p className="mb-2 font-mono text-[11px] font-semibold uppercase tracking-widest text-slate-400">
              {isPt ? "IDIOMA" : "LANGUAGE"}
            </p>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => onUpdate({ language: null, lang: null })}
                className={pillClass(selectedLanguage === "all")}
              >
                {isPt ? "Todos" : "All"}
              </button>
              {LANGUAGE_OPTIONS.map((l) => {
                const active = selectedLanguage === l.value;
                return (
                  <button
                    key={l.value}
                    type="button"
                    onClick={() =>
                      onUpdate({ language: active ? null : l.value, lang: null })
                    }
                    className={pillClass(active)}
                  >
                    {l.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* PREÇO */}
          <div>
            <p className="mb-2 font-mono text-[11px] font-semibold uppercase tracking-widest text-slate-400">
              {isPt ? "PREÇO" : "PRICING"}
            </p>
            <div className="flex flex-wrap gap-2">
              {PRICING_OPTIONS.map((p) => {
                const active = selectedPricing === p.value;
                return (
                  <button
                    key={p.value}
                    type="button"
                    onClick={() =>
                      onUpdate({ pricing: active ? null : p.value })
                    }
                    className={pillClass(active)}
                  >
                    {isPt ? p.pt : p.en}
                  </button>
                );
              })}
              <button
                type="button"
                onClick={() =>
                  onUpdate({ noCard: noCardOnly ? null : "1" })
                }
                className={pillClass(noCardOnly)}
              >
                {isPt ? "Sem cartão" : "No card required"}
              </button>
            </div>
          </div>
        </div>

        {/* Sticky Footer CTA */}
        <div className="shrink-0 border-t border-slate-800/90 bg-[#070b14] px-5 pb-[calc(1rem+env(safe-area-inset-bottom))] pt-3">
          <button
            type="button"
            onClick={onClose}
            className="inline-flex min-h-[48px] w-full items-center justify-center rounded-xl bg-cyan-500 px-4 text-sm font-bold text-slate-950 shadow-[0_0_20px_rgba(6,182,212,0.25)] transition-colors hover:bg-cyan-400"
          >
            {isPt
              ? `Ver ${totalCount} ${totalCount === 1 ? "recurso" : "recursos"}`
              : `View ${totalCount} ${totalCount === 1 ? "resource" : "resources"}`}
          </button>
        </div>
      </div>
    </div>
  );
}
