import type { SupportedLocale } from "@/config/site";

export interface LocalizedCourseText {
  "pt-BR": string;
  en: string;
}

export type CourseToolDepth = "practical" | "activity" | "conceptual" | "complementary";

export interface CourseModuleItem {
  order: number;
  title: string;
  hours?: string | null;
  description?: LocalizedCourseText | null;
  topics?: string[];
  skills?: string[];
  tools?: string[];
}

export interface CourseToolItem {
  name: string;
  category: LocalizedCourseText;
  description: LocalizedCourseText;
  courseRelation: LocalizedCourseText;
  depth: CourseToolDepth;
  url?: string | null;
}

export interface CourseAccessConditions {
  isFree: boolean;
  isFreemium: boolean;
  isPaid: boolean;
  hasFreeTrial: boolean;
  hasFreePreview: boolean;
  requiresCreditCard: "yes" | "no" | "depends" | "not_informed";
  requiresOtherPaymentMethod: boolean;
  certificatePricing: "free" | "paid" | "conditional" | "not_informed";
  hasFinancialAid: boolean | null;
  hasRecurringSubscription: boolean;
  currentPrice?: LocalizedCourseText | null;
  priceVerifiedAt?: string | null;
  accessNotes?: LocalizedCourseText | null;
}

export interface CourseCertificationInfo {
  available: boolean;
  type?: LocalizedCourseText | null;
  issuer?: string | null;
  requirements?: LocalizedCourseText | null;
  pricing?: "free" | "paid" | "conditional" | "not_informed";
  shareableOnLinkedIn?: boolean | null;
  validityOrDeadline?: LocalizedCourseText | null;
  examNote?: LocalizedCourseText | null;
}

export interface CourseRelationItem {
  slug: string;
  title: string;
  relationLabel: LocalizedCourseText;
  hours?: string | null;
}

export interface CourseMetadata {
  institution: string;
  subcategory: LocalizedCourseText;
  formationType: LocalizedCourseText;
  modality: LocalizedCourseText;
  audience?: LocalizedCourseText | null;
  prerequisites?: LocalizedCourseText | null;
  about: LocalizedCourseText;
  whatYouWillLearn: LocalizedCourseText[];
  officialTotalHours?: LocalizedCourseText | null;
  estimatedCompletion?: LocalizedCourseText | null;
  weeklyHours?: LocalizedCourseText | null;
  moduleCount?: number | null;
  modulesLabel?: LocalizedCourseText | null;
  hoursDiscrepancyNote?: LocalizedCourseText | null;
  deadline?: LocalizedCourseText | null;
  labsCount?: number | null;
  access: CourseAccessConditions;
  skills: string[];
  tools: CourseToolItem[];
  toolsNote?: LocalizedCourseText | null;
  modules: CourseModuleItem[];
  certification: CourseCertificationInfo;
  relatedLearningPath?: CourseRelationItem | null;
  includedCourses?: CourseRelationItem[];
  sourceUrl: string;
  lastVerifiedAt: string;
}

export function pickCourseText(
  value: LocalizedCourseText | null | undefined,
  locale: SupportedLocale,
  fallback?: string
): string {
  if (!value) {
    return (
      fallback ??
      (locale === "pt-BR"
        ? "Não informado pela instituição"
        : "Not informed by the institution")
    );
  }
  const text = value[locale] || value["pt-BR"] || value.en;
  return (
    text ||
    fallback ||
    (locale === "pt-BR"
      ? "Não informado pela instituição"
      : "Not informed by the institution")
  );
}

/**
 * Safely validates and narrows raw JSONB `course_metadata` from Supabase.
 */
export function parseCourseMetadata(raw: unknown): CourseMetadata | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return null;
  }
  const obj = raw as Record<string, unknown>;
  if (
    typeof obj.institution !== "string" ||
    !obj.about ||
    !obj.access ||
    !Array.isArray(obj.modules)
  ) {
    return null;
  }
  return obj as unknown as CourseMetadata;
}
