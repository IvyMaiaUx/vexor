"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import type { SupportedLocale } from "@/config/site";
import { useAuthStore } from "@/features/auth/use-auth-store";
import {
  type CatalogCategoryItem,
  type CatalogResourceItem,
  clearUserBookmarks,
  fetchCatalogCategories,
  fetchUserBookmarks,
  migrateLegacyLocalBookmarks,
  toggleUserBookmark,
} from "./catalog-service";

const LOCALE_STORAGE_KEY = "cybersec_locale";
const LEGACY_BOOKMARKS_STORAGE_KEY = "cybersec_bookmarks";
const LEGACY_BOOKMARKS_MIGRATED_PREFIX = "vexor_bookmarks_migrated_";
const STORE_CHANGE_EVENT = "cybersec-store-change";

function notifyStoreListeners() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(STORE_CHANGE_EVENT));
  }
}

function subscribeLocaleStore(callback: () => void) {
  if (typeof window === "undefined") {
    return () => {};
  }
  const handler = () => callback();
  window.addEventListener("storage", handler);
  window.addEventListener(STORE_CHANGE_EVENT, handler);
  return () => {
    window.removeEventListener("storage", handler);
    window.removeEventListener(STORE_CHANGE_EVENT, handler);
  };
}

function readLegacyBookmarkSlugs(): string[] {
  if (typeof window === "undefined") {
    return [];
  }
  try {
    const raw = window.localStorage.getItem(LEGACY_BOOKMARKS_STORAGE_KEY);
    if (!raw) {
      return [];
    }
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed)
      ? parsed.filter((item): item is string => typeof item === "string")
      : [];
  } catch {
    return [];
  }
}

export function useCatalogStore() {
  const { user, isLoading: isAuthLoading } = useAuthStore();

  const localeRaw = useSyncExternalStore(
    subscribeLocaleStore,
    () =>
      (window.localStorage.getItem(LOCALE_STORAGE_KEY) as SupportedLocale) ??
      "pt-BR",
    () => "pt-BR"
  );

  const locale: SupportedLocale = localeRaw === "en" ? "en" : "pt-BR";

  const [categories, setCategories] = useState<CatalogCategoryItem[]>([]);
  const [categoriesLoading, setCategoriesLoading] = useState<boolean>(true);
  const [categoriesError, setCategoriesError] = useState<boolean>(false);

  const [bookmarkedItems, setBookmarkedItems] = useState<CatalogResourceItem[]>(
    []
  );
  const [bookmarksLoading, setBookmarksLoading] = useState<boolean>(false);
  const [bookmarkError, setBookmarkError] = useState<string | null>(null);

  const inFlightBookmarksRef = useRef<Set<string>>(new Set());

  const loadCategories = useCallback(async () => {
    setCategoriesLoading(true);
    setCategoriesError(false);
    const res = await fetchCatalogCategories();
    if (res.status === "success") {
      setCategories(res.categories);
    } else {
      setCategoriesError(true);
    }
    setCategoriesLoading(false);
  }, []);

  useEffect(() => {
    let cancelled = false;
    void fetchCatalogCategories().then((res) => {
      if (cancelled) {
        return;
      }
      if (res.status === "success") {
        setCategories(res.categories);
        setCategoriesError(false);
      } else {
        setCategoriesError(true);
      }
      setCategoriesLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const reloadBookmarks = useCallback(async () => {
    if (!user?.id) {
      setBookmarkedItems([]);
      setBookmarksLoading(false);
      return;
    }

    setBookmarksLoading(true);
    setBookmarkError(null);

    // One-time safe migration of legacy localStorage bookmarks per authenticated user
    if (typeof window !== "undefined") {
      const migratedKey = `${LEGACY_BOOKMARKS_MIGRATED_PREFIX}${user.id}`;
      const alreadyMigrated = window.localStorage.getItem(migratedKey) === "1";
      if (!alreadyMigrated) {
        const legacySlugs = readLegacyBookmarkSlugs();
        if (legacySlugs.length > 0) {
          const migRes = await migrateLegacyLocalBookmarks(legacySlugs);
          if (migRes.completed) {
            window.localStorage.setItem(migratedKey, "1");
          }
        } else {
          window.localStorage.setItem(migratedKey, "1");
        }
      }
    }

    const res = await fetchUserBookmarks();
    if (res.status === "authenticated") {
      setBookmarkedItems(res.items);
    } else if (res.status === "unauthenticated") {
      setBookmarkedItems([]);
    } else {
      setBookmarkError(
        locale === "pt-BR"
          ? "Não foi possível carregar seus favoritos."
          : "Could not load your bookmarks."
      );
    }
    setBookmarksLoading(false);
  }, [locale, user]);

  useEffect(() => {
    if (isAuthLoading) {
      return;
    }
    let cancelled = false;
    void Promise.resolve().then(() => {
      if (!cancelled) {
        void reloadBookmarks();
      }
    });
    return () => {
      cancelled = true;
    };
  }, [isAuthLoading, reloadBookmarks]);

  const setLocale = useCallback((nextLocale: SupportedLocale) => {
    if (typeof window !== "undefined") {
      window.localStorage.setItem(LOCALE_STORAGE_KEY, nextLocale);
      notifyStoreListeners();
    }
  }, []);

  const bookmarkedIds = useMemo(
    () => bookmarkedItems.map((item) => item.id),
    [bookmarkedItems]
  );

  const bookmarkedSlugs = useMemo(
    () => bookmarkedItems.map((item) => item.slug),
    [bookmarkedItems]
  );

  const toggleBookmark = useCallback(
    async (slugOrResourceId: string, explicitResourceId?: string) => {
      const existingBySlug = bookmarkedItems.find(
        (item) =>
          item.slug === slugOrResourceId || item.id === slugOrResourceId
      );
      const resourceId = explicitResourceId ?? existingBySlug?.id ?? "";
      const lockKey = resourceId || slugOrResourceId;

      if (inFlightBookmarksRef.current.has(lockKey)) {
        return;
      }

      if (!user?.id) {
        setBookmarkError(
          locale === "pt-BR"
            ? "Faça login para salvar ou remover favoritos."
            : "Sign in to save or remove bookmarks."
        );
        return;
      }

      if (!resourceId) {
        setBookmarkError(
          locale === "pt-BR"
            ? "Não foi possível identificar o recurso para favoritar."
            : "Could not identify the resource to bookmark."
        );
        return;
      }

      inFlightBookmarksRef.current.add(lockKey);
      setBookmarkError(null);

      try {
        const currentlyBookmarked = bookmarkedIds.includes(resourceId);
        const res = await toggleUserBookmark(resourceId, currentlyBookmarked, {
          locale,
        });

        if (res.status === "error") {
          setBookmarkError(res.message);
          return;
        }

        await reloadBookmarks();
      } finally {
        inFlightBookmarksRef.current.delete(lockKey);
      }
    },
    [bookmarkedIds, bookmarkedItems, locale, reloadBookmarks, user?.id]
  );

  const clearAllBookmarks = useCallback(async () => {
    if (!user?.id) {
      return;
    }
    setBookmarkError(null);
    const res = await clearUserBookmarks({ locale });
    if (res.status === "error") {
      setBookmarkError(res.message ?? null);
      return;
    }
    setBookmarkedItems([]);
  }, [locale, user?.id]);

  const dismissBookmarkError = useCallback(() => {
    setBookmarkError(null);
  }, []);

  const allResources: CatalogResourceItem[] = useMemo(() => [], []);

  return {
    locale,
    setLocale,
    categories,
    categoriesLoading,
    categoriesError,
    reloadCategories: loadCategories,
    allResources,
    bookmarkedIds,
    bookmarkedSlugs,
    bookmarkedItems,
    bookmarksLoading,
    bookmarkError,
    dismissBookmarkError,
    toggleBookmark,
    clearAllBookmarks,
    reloadBookmarks,
  };
}
