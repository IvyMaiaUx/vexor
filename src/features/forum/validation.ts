import type { Dictionary } from "@/lib/i18n/dictionaries";

export interface NewTopicInput {
  title: string;
  categorySlug: string;
  tagsString: string;
  body: string;
}

export interface NewTopicValidationResult {
  valid: boolean;
  errors: Partial<Record<keyof NewTopicInput, string>>;
  cleanedTags: string[];
}

export const TAG_REGEX = /^[a-z0-9][a-z0-9-]{0,29}$/;

export function sanitizeTag(rawTag: string): string {
  return rawTag
    .trim()
    .toLowerCase()
    .replace(/^#+/, "")
    .replace(/\s+/g, "-")
    .slice(0, 30);
}

export function parseTagsString(raw: string): string[] {
  const parts = raw
    .split(/[,;\s]+/)
    .map((p) => sanitizeTag(p))
    .filter((p) => p.length > 0);
  return Array.from(new Set(parts)).slice(0, 5);
}

export function validateNewTopic(
  input: NewTopicInput,
  validCategorySlugs: string[],
  dict: Dictionary
): NewTopicValidationResult {
  const errors: Partial<Record<keyof NewTopicInput, string>> = {};
  const trimmedTitle = input.title.trim();
  const trimmedBody = input.body.trim();
  const tags = parseTagsString(input.tagsString);

  if (trimmedTitle.length < 5 || trimmedTitle.length > 200) {
    errors.title = dict.newTopicPage.errors.titleLength;
  }

  if (trimmedBody.length < 10 || trimmedBody.length > 20000) {
    errors.body = dict.newTopicPage.errors.bodyLength;
  }

  if (!input.categorySlug || !validCategorySlugs.includes(input.categorySlug)) {
    errors.categorySlug = dict.newTopicPage.errors.categoryRequired;
  }

  if (tags.length > 5) {
    errors.tagsString = dict.newTopicPage.errors.tagsLimit;
  } else {
    for (const tag of tags) {
      if (!TAG_REGEX.test(tag)) {
        errors.tagsString = dict.newTopicPage.errors.tagFormat;
        break;
      }
    }
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors,
    cleanedTags: tags,
  };
}

export function validateNewReply(
  body: string,
  dict: Dictionary
): { valid: boolean; error?: string } {
  const trimmed = body.trim();
  if (trimmed.length < 1 || trimmed.length > 10000) {
    return {
      valid: false,
      error: dict.topicDetailPage.replyHint,
    };
  }
  return { valid: true };
}
