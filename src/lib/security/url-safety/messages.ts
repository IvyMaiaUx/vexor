import type { SupportedLocale } from "@/config/site";
import type { UrlSafetyCheckResult } from "./types";

export interface UrlSafetyUserWarning {
  /**
   * Always cautious wording ("link suspeito / possivelmente inseguro"),
   * never an absolute claim.
   */
  warningText: string | null;
  /**
   * Google attribution is ONLY returned when the link matched a Google list
   * (Google Safe Browsing or Google Web Risk).
   */
  googleAttributionText: string | null;
}

export function buildUrlSafetyWarning(
  result: Pick<UrlSafetyCheckResult, "verdict" | "source" | "attribution">,
  locale: SupportedLocale = "pt-BR"
): UrlSafetyUserWarning {
  if (result.verdict !== "suspicious") {
    return {
      warningText: null,
      googleAttributionText: null,
    };
  }

  const isPt = locale === "pt-BR";
  const warningText = isPt
    ? "Link suspeito ou possivelmente inseguro. Tenha cautela antes de abrir."
    : "Suspicious or possibly unsafe link. Use caution before opening.";

  // Only show Google attribution when the match actually came from a Google list.
  let googleAttributionText: string | null = null;
  if (result.attribution === "google") {
    if (result.source === "google_web_risk") {
      googleAttributionText = isPt
        ? "Alerta baseado em lista do Google Web Risk."
        : "Alert based on Google Web Risk list.";
    } else if (result.source === "google_safe_browsing") {
      googleAttributionText = isPt
        ? "Alerta baseado em lista do Google Safe Browsing."
        : "Alert based on Google Safe Browsing list.";
    }
  }

  return {
    warningText,
    googleAttributionText,
  };
}
