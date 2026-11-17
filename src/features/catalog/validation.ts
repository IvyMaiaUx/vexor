import type {
  DifficultyLevel,
  FeaturedResourceItem,
  ResourceLanguage,
  ResourceType,
} from "@/config/site";
import type { Dictionary } from "@/lib/i18n/dictionaries";
import {
  isSafeExternalUrl,
  normalizeResourceUrl,
} from "@/lib/security/sanitize";

export interface ResourceSubmissionInput {
  name: string;
  description: string;
  categorySlug: string;
  type: ResourceType;
  url: string;
  language: ResourceLanguage;
  difficulty?: DifficultyLevel | "";
  authorName?: string;
}

export interface ResourceValidationResult {
  valid: boolean;
  errors: Partial<Record<keyof ResourceSubmissionInput, string>>;
}

/**
 * Validates resource submission data mirroring the database constraints in
 * `supabase/migrations/20261110000001_schema.sql`.
 */
export function validateResourceSubmission(
  input: ResourceSubmissionInput,
  existingResources: FeaturedResourceItem[],
  dict: Dictionary
): ResourceValidationResult {
  const errors: Partial<Record<keyof ResourceSubmissionInput, string>> = {};

  const trimmedName = input.name.trim();
  if (trimmedName.length < 2 || trimmedName.length > 120) {
    errors.name = dict.submitPage.errors.nameLength;
  }

  const trimmedDesc = input.description.trim();
  if (trimmedDesc.length < 10 || trimmedDesc.length > 2000) {
    errors.description = dict.submitPage.errors.descriptionLength;
  }

  const trimmedUrl = input.url.trim();
  if (!isSafeExternalUrl(trimmedUrl)) {
    errors.url = dict.submitPage.errors.invalidUrl;
  } else {
    const candidateNormalized = normalizeResourceUrl(trimmedUrl);
    const hasDuplicate = existingResources.some(
      (res) =>
        (res.status === undefined ||
          res.status === "approved" ||
          res.status === "pending") &&
        normalizeResourceUrl(res.url) === candidateNormalized
    );
    if (hasDuplicate) {
      errors.url = dict.submitPage.errors.duplicateUrl;
    }
  }

  const trimmedAuthor = (input.authorName ?? "").trim();
  if (trimmedAuthor.length > 120) {
    errors.authorName = dict.submitPage.errors.authorLength;
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors,
  };
}
