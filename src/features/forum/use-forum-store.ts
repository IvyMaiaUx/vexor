"use client";

import { useEffect, useState } from "react";
import {
  fetchForumCategories,
  type ForumCategoryItem,
} from "./forum-service";
import type { ForumPost, ForumTopic } from "./types";

let cachedForumCategories: ForumCategoryItem[] | null = null;
let pendingCategoriesPromise: Promise<ForumCategoryItem[]> | null = null;

async function loadCategoriesOnce(): Promise<ForumCategoryItem[]> {
  if (cachedForumCategories) {
    return cachedForumCategories;
  }
  if (!pendingCategoriesPromise) {
    pendingCategoriesPromise = fetchForumCategories()
      .then((res) => {
        if (res.status === "success") {
          cachedForumCategories = res.categories;
          return res.categories;
        }
        return [];
      })
      .finally(() => {
        pendingCategoriesPromise = null;
      });
  }
  return pendingCategoriesPromise;
}

/**
 * Provides shared forum categories loaded from Supabase (`public.categories`).
 * Legacy local arrays (`topics`, `posts`, `userVotes`) intentionally remain empty
 * so out-of-scope pages never mix demo seed data with real database records.
 */
export function useForumStore() {
  const [categories, setCategories] = useState<ForumCategoryItem[]>(
    () => cachedForumCategories ?? []
  );
  const [categoriesLoading, setCategoriesLoading] = useState<boolean>(
    () => cachedForumCategories === null
  );

  useEffect(() => {
    let cancelled = false;
    if (cachedForumCategories !== null) {
      return;
    }

    void loadCategoriesOnce().then((items) => {
      if (!cancelled) {
        setCategories(items);
        setCategoriesLoading(false);
      }
    });

    return () => {
      cancelled = true;
    };
  }, []);

  const emptyTopics: ForumTopic[] = [];
  const emptyPosts: ForumPost[] = [];
  const emptyVotes: string[] = [];

  return {
    categories,
    categoriesLoading,
    topics: emptyTopics,
    posts: emptyPosts,
    userVotes: emptyVotes,
    hasVoted: () => false,
    createTopic: () => {},
    createPost: () => {},
    toggleVote: () => {},
    setAcceptedSolution: () => {},
  };
}
