import type { SupportedLocale } from "@/config/site";
import { parseTagsString } from "@/features/forum/validation";
import { isSafeExternalUrl } from "@/lib/security/sanitize";
import type { TopicKind } from "./types";

export const VALID_TOPIC_KINDS: TopicKind[] = [
  "discussion",
  "question",
  "tool_share",
  "note",
];

export function isValidTopicKind(value: unknown): value is TopicKind {
  return (
    typeof value === "string" &&
    VALID_TOPIC_KINDS.includes(value as TopicKind)
  );
}

export interface TimelineValidationResult {
  valid: boolean;
  error?: string;
  normalizedTitle: string;
  normalizedBody: string;
  normalizedUrl: string | null;
  tags: string[];
}

/**
 * Validates Timeline post creation payload client-side before hitting Supabase RLS/constraints.
 * Notes can omit a separate title and auto-derive a clean headline from the body.
 */
export function validateTimelinePost(
  input: {
    kind: TopicKind;
    categoryId: string;
    title: string;
    body: string;
    tagsInput?: string;
    sharedUrl?: string;
  },
  locale: SupportedLocale
): TimelineValidationResult {
  const isPt = locale === "pt-BR";
  const body = (input.body ?? "").trim();
  let title = (input.title ?? "").trim();
  const rawUrl = (input.sharedUrl ?? "").trim();

  if (!input.categoryId) {
    return {
      valid: false,
      error: isPt ? "Selecione uma categoria." : "Select a category.",
      normalizedTitle: title,
      normalizedBody: body,
      normalizedUrl: null,
      tags: [],
    };
  }

  if (input.kind === "note" && !title && body.length >= 10) {
    title = body.split(/\r?\n/)[0].slice(0, 90).trim();
    if (title.length < 5) {
      title = body.slice(0, 90).trim();
    }
  }

  if (title.length < 5 || title.length > 200) {
    return {
      valid: false,
      error: isPt
        ? "O título deve ter entre 5 e 200 caracteres."
        : "Title must be between 5 and 200 characters.",
      normalizedTitle: title,
      normalizedBody: body,
      normalizedUrl: null,
      tags: [],
    };
  }

  if (body.length < 10 || body.length > 20000) {
    return {
      valid: false,
      error: isPt
        ? "O conteúdo deve ter entre 10 e 20.000 caracteres."
        : "Content must be between 10 and 20,000 characters.",
      normalizedTitle: title,
      normalizedBody: body,
      normalizedUrl: null,
      tags: [],
    };
  }

  let normalizedUrl: string | null = null;
  if (rawUrl) {
    if (!isSafeExternalUrl(rawUrl) || rawUrl.length > 2048) {
      return {
        valid: false,
        error: isPt
          ? "Informe uma URL http(s) válida para compartilhar."
          : "Enter a valid http(s) URL to share.",
        normalizedTitle: title,
        normalizedBody: body,
        normalizedUrl: null,
        tags: [],
      };
    }
    normalizedUrl = rawUrl;
  }

  const tags = parseTagsString(input.tagsInput ?? "");

  return {
    valid: true,
    normalizedTitle: title,
    normalizedBody: body,
    normalizedUrl,
    tags,
  };
}
