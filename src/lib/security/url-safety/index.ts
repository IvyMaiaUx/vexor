import { checkUrlWithUrlhaus } from "./providers/urlhaus";
import { createReputationProvider } from "./providers/reputation-provider";
import { checkUrlWithVirusTotal } from "./providers/virustotal";
import type {
  UrlReputationProvider,
  UrlSafetyCheckResult,
} from "./types";

export { buildUrlSafetyWarning } from "./messages";
export {
  createReputationProvider,
  GoogleSafeBrowsingProvider,
  GoogleWebRiskProvider,
} from "./providers/reputation-provider";
export type {
  UrlCheckProviderResult,
  UrlReputationProvider,
  UrlSafetyCheckResult,
  UrlSafetySource,
  UrlSafetyVerdict,
} from "./types";

const CLEAN_CACHE_TTL_MS = 6 * 60 * 60 * 1000; // 6 hours
const SUSPICIOUS_CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours
const MAX_CACHE_ENTRIES = 1000;

interface CacheEntry {
  result: UrlSafetyCheckResult;
  expiresAt: number;
}

const urlCache = new Map<string, CacheEntry>();
const inFlightChecks = new Map<string, Promise<UrlSafetyCheckResult>>();

export function normalizeSafeCheckUrl(rawUrl: string): string | null {
  const trimmed = rawUrl.trim();
  if (!trimmed || trimmed.length > 2048) return null;
  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      return null;
    }
    parsed.hostname = parsed.hostname.toLowerCase();
    return parsed.toString();
  } catch {
    return null;
  }
}

function getCached(normalizedUrl: string): UrlSafetyCheckResult | null {
  const entry = urlCache.get(normalizedUrl);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    urlCache.delete(normalizedUrl);
    return null;
  }
  return { ...entry.result, cached: true };
}

function setCached(normalizedUrl: string, result: UrlSafetyCheckResult): void {
  if (urlCache.size >= MAX_CACHE_ENTRIES) {
    const oldestKey = urlCache.keys().next().value;
    if (oldestKey) urlCache.delete(oldestKey);
  }
  const ttl =
    result.verdict === "suspicious"
      ? SUSPICIOUS_CACHE_TTL_MS
      : CLEAN_CACHE_TTL_MS;
  urlCache.set(normalizedUrl, {
    result,
    expiresAt: Date.now() + ttl,
  });
}

/**
 * 3-layer server-side URL safety check:
 *   1. URLhaus (requires server-side URLHAUS_AUTH_KEY; skipped if absent)
 *   2. Google Safe Browsing / Web Risk (abstracted behind UrlReputationProvider)
 *   3. VirusTotal public API (4 req/min, 500/day, queued + Retry-After, only for unknown URLs)
 *
 * Results are cached per normalized URL to protect rate limits.
 */
export async function checkUrlSafety(
  rawUrl: string,
  options?: {
    reputationProvider?: UrlReputationProvider;
    fetchImpl?: typeof fetch;
    bypassCache?: boolean;
  }
): Promise<UrlSafetyCheckResult> {
  const normalizedUrl = normalizeSafeCheckUrl(rawUrl);
  if (!normalizedUrl) {
    throw new Error("Invalid URL: only http(s) URLs up to 2048 characters are supported.");
  }

  if (!options?.bypassCache) {
    const cached = getCached(normalizedUrl);
    if (cached) return cached;

    const existing = inFlightChecks.get(normalizedUrl);
    if (existing) return existing;
  }

  const run = async (): Promise<UrlSafetyCheckResult> => {
    const layers: UrlSafetyCheckResult["layers"] = [];

    // Layer 1: URLhaus
    const urlhausRes = await checkUrlWithUrlhaus(normalizedUrl, {
      fetchImpl: options?.fetchImpl,
    });
    layers.push({
      source: urlhausRes.source,
      status: urlhausRes.status,
      verdict: urlhausRes.verdict,
      skipReason: urlhausRes.skipReason,
    });

    if (urlhausRes.verdict === "suspicious") {
      const result: UrlSafetyCheckResult = {
        normalizedUrl,
        verdict: "suspicious",
        source: "urlhaus",
        attribution: null,
        cached: false,
        checkedAt: new Date().toISOString(),
        layers,
      };
      setCached(normalizedUrl, result);
      return result;
    }

    // Layer 2: Abstracted Google Safe Browsing / Web Risk provider
    const reputationProvider =
      options?.reputationProvider ??
      createReputationProvider({ fetchImpl: options?.fetchImpl });
    const repRes = await reputationProvider.checkUrl(normalizedUrl);
    layers.push({
      source: repRes.source,
      status: repRes.status,
      verdict: repRes.verdict,
      skipReason: repRes.skipReason,
    });

    if (repRes.verdict === "suspicious") {
      const result: UrlSafetyCheckResult = {
        normalizedUrl,
        verdict: "suspicious",
        source: repRes.source,
        // Attribution to Google ONLY when match comes from Google's list
        attribution: repRes.attribution,
        cached: false,
        checkedAt: new Date().toISOString(),
        layers,
      };
      setCached(normalizedUrl, result);
      return result;
    }

    // Layer 3: VirusTotal public API (only for URLs still unknown)
    const vtRes = await checkUrlWithVirusTotal(normalizedUrl, {
      fetchImpl: options?.fetchImpl,
    });
    layers.push({
      source: vtRes.source,
      status: vtRes.status,
      verdict: vtRes.verdict,
      skipReason: vtRes.skipReason,
    });

    const finalVerdict =
      vtRes.verdict === "suspicious"
        ? "suspicious"
        : vtRes.verdict === "clean"
          ? "clean"
          : "unknown";

    const result: UrlSafetyCheckResult = {
      normalizedUrl,
      verdict: finalVerdict,
      source: vtRes.verdict === "suspicious" ? "virustotal" : null,
      attribution: null,
      cached: false,
      checkedAt: new Date().toISOString(),
      layers,
    };
    setCached(normalizedUrl, result);
    return result;
  };

  const promise = run().finally(() => {
    inFlightChecks.delete(normalizedUrl);
  });
  inFlightChecks.set(normalizedUrl, promise);
  return promise;
}
