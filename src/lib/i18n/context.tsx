"use client";

import { useCatalogStore } from "@/features/catalog/use-catalog-store";
import { getDictionary, type Dictionary } from "./dictionaries";
import type { SupportedLocale } from "@/config/site";

export function useI18n(): {
  locale: SupportedLocale;
  setLocale: (locale: SupportedLocale) => void;
  dict: Dictionary;
} {
  const { locale, setLocale } = useCatalogStore();
  const dict = getDictionary(locale);
  return { locale, setLocale, dict };
}
