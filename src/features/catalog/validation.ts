import type {
  DifficultyLevel,
  FeaturedResourceItem,
  ResourceCreditCardRequirement,
  ResourceLanguage,
  ResourceOptionalTag,
  ResourcePricingModel,
  ResourceStandardTag,
  ResourceType,
} from "@/config/site";
import type { Dictionary } from "@/lib/i18n/dictionaries";
import {
  isSafeExternalUrl,
  normalizeResourceUrl,
} from "@/lib/security/sanitize";

export const VALID_PRICING_MODELS: readonly ResourcePricingModel[] = [
  "free",
  "freemium",
  "paid",
];

export const VALID_CREDIT_CARD_OPTIONS: readonly ResourceCreditCardRequirement[] = [
  "yes",
  "no",
  "depends",
  "not_informed",
];

export const VALID_OPTIONAL_TAGS: readonly ResourceOptionalTag[] = [
  "open_source",
  "self_hosted",
];

const CARD_TAG_MAP: Record<ResourceCreditCardRequirement, ResourceStandardTag> = {
  no: "no_card",
  yes: "card_required",
  depends: "card_depends",
  not_informed: "card_not_informed",
};

/**
 * Computes standardized tags from pricing model, credit card requirement, and
 * validated complementary tags (`open_source`, `self_hosted`). Never trusts
 * arbitrary user-supplied pricing/card tags.
 */
export function computeResourceTags(
  pricingModel: ResourcePricingModel,
  requiresCreditCard: ResourceCreditCardRequirement,
  optionalTags: readonly string[] = []
): ResourceStandardTag[] {
  const tags: ResourceStandardTag[] = [
    pricingModel,
    CARD_TAG_MAP[requiresCreditCard],
  ];
  for (const tag of VALID_OPTIONAL_TAGS) {
    if (optionalTags.includes(tag) && !tags.includes(tag)) {
      tags.push(tag);
    }
  }
  return tags;
}

export function isValidPricingModel(
  value: unknown
): value is ResourcePricingModel {
  return (
    typeof value === "string" &&
    (VALID_PRICING_MODELS as readonly string[]).includes(value)
  );
}

export function isValidCreditCardRequirement(
  value: unknown
): value is ResourceCreditCardRequirement {
  return (
    typeof value === "string" &&
    (VALID_CREDIT_CARD_OPTIONS as readonly string[]).includes(value)
  );
}

export function filterValidOptionalTags(
  tags: unknown
): { valid: boolean; sanitized: ResourceOptionalTag[] } {
  if (tags === undefined || tags === null) {
    return { valid: true, sanitized: [] };
  }
  if (!Array.isArray(tags)) {
    return { valid: false, sanitized: [] };
  }
  const sanitized: ResourceOptionalTag[] = [];
  for (const item of tags) {
    if (
      typeof item !== "string" ||
      !(VALID_OPTIONAL_TAGS as readonly string[]).includes(item)
    ) {
      return { valid: false, sanitized: [] };
    }
    if (!sanitized.includes(item as ResourceOptionalTag)) {
      sanitized.push(item as ResourceOptionalTag);
    }
  }
  return { valid: true, sanitized };
}

export interface ResourceSubmissionInput {
  name: string;
  description: string;
  categorySlug: string;
  type: ResourceType;
  url: string;
  language: ResourceLanguage;
  difficulty?: DifficultyLevel | "";
  authorName?: string;
  pricingModel: ResourcePricingModel | "";
  requiresCreditCard: ResourceCreditCardRequirement | "";
  freeTierLimits?: string;
  pricingNotes?: string;
  optionalTags?: ResourceOptionalTag[];
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

  const isPt = dict.submitPage.eyebrow.toLowerCase().includes("submeter") ||
    dict.nav.catalog.toLowerCase().includes("catálogo");

  if (!isValidPricingModel(input.pricingModel)) {
    errors.pricingModel = isPt
      ? "Selecione o modelo de preço (Grátis, Freemium ou Pago)."
      : "Select a pricing model (Free, Freemium, or Paid).";
  }

  if (!isValidCreditCardRequirement(input.requiresCreditCard)) {
    errors.requiresCreditCard = isPt
      ? "Informe se o recurso exige cartão de crédito."
      : "Select whether a credit card is required.";
  }

  const trimmedFreeLimits = (input.freeTierLimits ?? "").trim();
  if (trimmedFreeLimits.length > 1000) {
    errors.freeTierLimits = isPt
      ? "As limitações do plano gratuito devem ter no máximo 1000 caracteres."
      : "Free tier limits must be at most 1000 characters.";
  }

  const trimmedPricingNotes = (input.pricingNotes ?? "").trim();
  if (trimmedPricingNotes.length > 500) {
    errors.pricingNotes = isPt
      ? "As informações adicionais de preço devem ter no máximo 500 caracteres."
      : "Additional pricing notes must be at most 500 characters.";
  }

  if (!filterValidOptionalTags(input.optionalTags).valid) {
    errors.optionalTags = isPt
      ? "Tags complementares inválidas."
      : "Invalid complementary tags.";
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors,
  };
}
