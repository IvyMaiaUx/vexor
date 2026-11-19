import type {
  ResourceCreditCardRequirement,
  ResourceOptionalTag,
  ResourcePricingModel,
  ResourceStandardTag,
  SupportedLocale,
} from "@/config/site";

export const PRICING_MODEL_OPTIONS: ResourcePricingModel[] = [
  "free",
  "freemium",
  "paid",
];

export const CREDIT_CARD_OPTIONS: ResourceCreditCardRequirement[] = [
  "no",
  "yes",
  "depends",
  "not_informed",
];

export const OPTIONAL_TAG_OPTIONS: ResourceOptionalTag[] = [
  "open_source",
  "self_hosted",
];

const PRICING_LABELS: Record<
  ResourcePricingModel,
  { "pt-BR": string; en: string }
> = {
  free: { "pt-BR": "Grátis", en: "Free" },
  freemium: { "pt-BR": "Freemium", en: "Freemium" },
  paid: { "pt-BR": "Pago", en: "Paid" },
};

const CREDIT_CARD_LABELS: Record<
  ResourceCreditCardRequirement,
  { "pt-BR": string; en: string }
> = {
  yes: { "pt-BR": "Sim", en: "Yes" },
  no: { "pt-BR": "Não", en: "No" },
  depends: {
    "pt-BR": "Depende do plano ou serviço",
    en: "Depends on plan or service",
  },
  not_informed: { "pt-BR": "Não informado", en: "Not informed" },
};

const TAG_LABELS: Record<
  ResourceStandardTag,
  { "pt-BR": string; en: string }
> = {
  free: { "pt-BR": "Grátis", en: "Free" },
  freemium: { "pt-BR": "Freemium", en: "Freemium" },
  paid: { "pt-BR": "Pago", en: "Paid" },
  no_card: { "pt-BR": "Sem cartão", en: "No card required" },
  card_required: { "pt-BR": "Cartão obrigatório", en: "Card required" },
  card_depends: {
    "pt-BR": "Cartão dependendo do plano",
    en: "Card depends on plan",
  },
  card_not_informed: {
    "pt-BR": "Exigência não informada",
    en: "Card requirement not informed",
  },
  open_source: { "pt-BR": "Open Source", en: "Open Source" },
  self_hosted: { "pt-BR": "Self-hosted", en: "Self-hosted" },
};

export function getPricingModelLabel(
  value: ResourcePricingModel,
  locale: SupportedLocale
): string {
  return PRICING_LABELS[value][locale];
}

export function getCreditCardLabel(
  value: ResourceCreditCardRequirement,
  locale: SupportedLocale
): string {
  return CREDIT_CARD_LABELS[value][locale];
}

export function getResourceTagLabel(
  tag: ResourceStandardTag,
  locale: SupportedLocale
): string {
  return TAG_LABELS[tag][locale];
}

const CODE_HOSTING_HOSTS = new Set([
  "github.com",
  "www.github.com",
  "gitlab.com",
  "www.gitlab.com",
  "bitbucket.org",
  "www.bitbucket.org",
  "codeberg.org",
]);

/**
 * Displays pricing/credit-card badges only for tool websites/services and AI resources,
 * hiding them for direct source-code repositories or scripts.
 */
export function shouldShowPricingBadges(resource: {
  type: string;
  url: string;
  categorySlug: string;
}): boolean {
  if (resource.categorySlug === "ai-security") {
    return true;
  }
  if (resource.type === "repository" || resource.type === "script") {
    return false;
  }
  try {
    const hostname = new URL(resource.url).hostname.toLowerCase();
    if (CODE_HOSTING_HOSTS.has(hostname)) {
      return false;
    }
  } catch {
    // Keep default behavior if URL cannot be parsed
  }
  return true;
}
