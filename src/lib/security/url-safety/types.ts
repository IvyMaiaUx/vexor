export type UrlSafetySource =
  | "urlhaus"
  | "google_safe_browsing"
  | "google_web_risk"
  | "virustotal";

export type UrlSafetyVerdict = "unknown" | "clean" | "suspicious";

export type UrlProviderStatus = "checked" | "skipped" | "error";

export interface UrlCheckProviderResult {
  source: UrlSafetySource;
  status: UrlProviderStatus;
  verdict: UrlSafetyVerdict;
  /**
   * Only populated as "google" when a match actually comes from a Google list
   * (Google Safe Browsing or Google Web Risk). Never set for other providers.
   */
  attribution: "google" | null;
  skipReason?:
    | "missing_auth_key"
    | "missing_api_key"
    | "rate_limited"
    | "daily_quota_exceeded"
    | "queue_full";
  errorMessage?: string;
}

export interface UrlReputationProvider {
  readonly id: "google_safe_browsing" | "google_web_risk";
  checkUrl(url: string, signal?: AbortSignal): Promise<UrlCheckProviderResult>;
}

export interface UrlSafetyCheckResult {
  normalizedUrl: string;
  verdict: UrlSafetyVerdict;
  source: UrlSafetySource | null;
  /**
   * Only "google" when the link matched a Google list.
   */
  attribution: "google" | null;
  cached: boolean;
  checkedAt: string;
  layers: Array<{
    source: UrlSafetySource;
    status: UrlProviderStatus;
    verdict: UrlSafetyVerdict;
    skipReason?: UrlCheckProviderResult["skipReason"];
  }>;
}
