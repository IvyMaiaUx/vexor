import type {
  UrlCheckProviderResult,
  UrlReputationProvider,
} from "../types";

const SAFE_BROWSING_ENDPOINT =
  "https://safebrowsing.googleapis.com/v4/threatMatches:find";
const WEB_RISK_ENDPOINT = "https://webrisk.googleapis.com/v1/uris:search";

const THREAT_TYPES = [
  "MALWARE",
  "SOCIAL_ENGINEERING",
  "UNWANTED_SOFTWARE",
] as const;

/**
 * Google Safe Browsing Lookup API v4 (free for non-commercial use).
 * Abstracted behind UrlReputationProvider so it can be swapped for
 * GoogleWebRiskProvider via `URL_REPUTATION_PROVIDER=webrisk` with zero refactor.
 */
export class GoogleSafeBrowsingProvider implements UrlReputationProvider {
  readonly id = "google_safe_browsing" as const;
  private readonly apiKey: string;
  private readonly fetchImpl: typeof fetch;

  constructor(options?: { apiKey?: string; fetchImpl?: typeof fetch }) {
    this.apiKey = (
      options?.apiKey ??
      process.env.GOOGLE_SAFE_BROWSING_API_KEY ??
      ""
    ).trim();
    this.fetchImpl = options?.fetchImpl ?? fetch;
  }

  async checkUrl(
    url: string,
    signal?: AbortSignal
  ): Promise<UrlCheckProviderResult> {
    if (!this.apiKey) {
      return {
        source: this.id,
        status: "skipped",
        verdict: "unknown",
        attribution: null,
        skipReason: "missing_api_key",
      };
    }

    try {
      const endpoint = `${SAFE_BROWSING_ENDPOINT}?key=${encodeURIComponent(this.apiKey)}`;
      const response = await this.fetchImpl(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          client: {
            clientId: "vexor-community-platform",
            clientVersion: "1.0.0",
          },
          threatInfo: {
            threatTypes: [...THREAT_TYPES],
            platformTypes: ["ANY_PLATFORM"],
            threatEntryTypes: ["URL"],
            threatEntries: [{ url }],
          },
        }),
        signal: signal ?? AbortSignal.timeout(5000),
        cache: "no-store",
      });

      if (!response.ok) {
        return {
          source: this.id,
          status: "error",
          verdict: "unknown",
          attribution: null,
          errorMessage: `Safe Browsing HTTP ${response.status}`,
        };
      }

      const data = (await response.json()) as {
        matches?: Array<{ threatType?: string }>;
      };

      if (Array.isArray(data.matches) && data.matches.length > 0) {
        return {
          source: this.id,
          status: "checked",
          verdict: "suspicious",
          // Only attribute to Google when the match actually comes from Google's list
          attribution: "google",
        };
      }

      return {
        source: this.id,
        status: "checked",
        verdict: "unknown",
        attribution: null,
      };
    } catch (err) {
      return {
        source: this.id,
        status: "error",
        verdict: "unknown",
        attribution: null,
        errorMessage:
          err instanceof Error ? err.message : "Safe Browsing request failed",
      };
    }
  }
}

/**
 * Google Web Risk Lookup API v1 (commercial-ready drop-in replacement).
 * Activate by setting `URL_REPUTATION_PROVIDER=webrisk` and `GOOGLE_WEB_RISK_API_KEY`.
 */
export class GoogleWebRiskProvider implements UrlReputationProvider {
  readonly id = "google_web_risk" as const;
  private readonly apiKey: string;
  private readonly fetchImpl: typeof fetch;

  constructor(options?: { apiKey?: string; fetchImpl?: typeof fetch }) {
    this.apiKey = (
      options?.apiKey ??
      process.env.GOOGLE_WEB_RISK_API_KEY ??
      ""
    ).trim();
    this.fetchImpl = options?.fetchImpl ?? fetch;
  }

  async checkUrl(
    url: string,
    signal?: AbortSignal
  ): Promise<UrlCheckProviderResult> {
    if (!this.apiKey) {
      return {
        source: this.id,
        status: "skipped",
        verdict: "unknown",
        attribution: null,
        skipReason: "missing_api_key",
      };
    }

    try {
      const params = new URLSearchParams();
      params.set("uri", url);
      params.set("key", this.apiKey);
      for (const threatType of THREAT_TYPES) {
        params.append("threatTypes", threatType);
      }

      const response = await this.fetchImpl(
        `${WEB_RISK_ENDPOINT}?${params.toString()}`,
        {
          method: "GET",
          signal: signal ?? AbortSignal.timeout(5000),
          cache: "no-store",
        }
      );

      if (!response.ok) {
        return {
          source: this.id,
          status: "error",
          verdict: "unknown",
          attribution: null,
          errorMessage: `Web Risk HTTP ${response.status}`,
        };
      }

      const data = (await response.json()) as {
        threat?: { threatTypes?: string[] };
      };

      if (
        data.threat &&
        Array.isArray(data.threat.threatTypes) &&
        data.threat.threatTypes.length > 0
      ) {
        return {
          source: this.id,
          status: "checked",
          verdict: "suspicious",
          attribution: "google",
        };
      }

      return {
        source: this.id,
        status: "checked",
        verdict: "unknown",
        attribution: null,
      };
    } catch (err) {
      return {
        source: this.id,
        status: "error",
        verdict: "unknown",
        attribution: null,
        errorMessage:
          err instanceof Error ? err.message : "Web Risk request failed",
      };
    }
  }
}

export function createReputationProvider(options?: {
  provider?: "safebrowsing" | "webrisk";
  fetchImpl?: typeof fetch;
}): UrlReputationProvider {
  const configured = (
    options?.provider ??
    process.env.URL_REPUTATION_PROVIDER ??
    "safebrowsing"
  )
    .trim()
    .toLowerCase();

  if (configured === "webrisk" || configured === "web_risk") {
    return new GoogleWebRiskProvider({ fetchImpl: options?.fetchImpl });
  }

  return new GoogleSafeBrowsingProvider({ fetchImpl: options?.fetchImpl });
}
