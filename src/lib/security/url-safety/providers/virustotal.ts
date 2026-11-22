import type { UrlCheckProviderResult } from "../types";

const VIRUSTOTAL_URL_ENDPOINT = "https://www.virustotal.com/api/v3/urls";

// Public VirusTotal API strict limits (single key, never bypassed with multiple accounts)
const VT_MAX_PER_MINUTE = 4;
const VT_MAX_PER_DAY = 500;
const VT_MINUTE_WINDOW_MS = 60_000;
const VT_MAX_QUEUE_LENGTH = 25;
const VT_MAX_RETRY_AFTER_MS = 15_000;
const VT_MAX_ATTEMPTS = 2;

function toBase64UrlNoPadding(input: string): string {
  return Buffer.from(input, "utf8")
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

function parseRetryAfterMs(headerValue: string | null): number {
  if (!headerValue) return 5_000;
  const seconds = Number(headerValue);
  if (Number.isFinite(seconds) && seconds >= 0) {
    return Math.min(seconds * 1000, VT_MAX_RETRY_AFTER_MS);
  }
  const targetMs = Date.parse(headerValue);
  if (Number.isFinite(targetMs)) {
    return Math.min(Math.max(0, targetMs - Date.now()), VT_MAX_RETRY_AFTER_MS);
  }
  return 5_000;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function getUtcDayKey(nowMs: number): string {
  return new Date(nowMs).toISOString().slice(0, 10);
}

interface QueueJob {
  run: () => Promise<void>;
}

/**
 * Serialized queue + sliding-window (4/min) + daily UTC (500/day) limiter
 * for the public VirusTotal API (single API key).
 */
class VirusTotalRateLimitedQueue {
  private readonly minuteTimestamps: number[] = [];
  private dayKey: string = getUtcDayKey(Date.now());
  private dayCount = 0;
  private blockedUntilMs = 0;
  private readonly queue: QueueJob[] = [];
  private processing = false;

  private pruneAndSync(nowMs: number): void {
    const today = getUtcDayKey(nowMs);
    if (today !== this.dayKey) {
      this.dayKey = today;
      this.dayCount = 0;
    }
    while (
      this.minuteTimestamps.length > 0 &&
      nowMs - this.minuteTimestamps[0] >= VT_MINUTE_WINDOW_MS
    ) {
      this.minuteTimestamps.shift();
    }
  }

  hasDailyQuota(nowMs = Date.now()): boolean {
    this.pruneAndSync(nowMs);
    return this.dayCount < VT_MAX_PER_DAY;
  }

  noteRetryAfter(delayMs: number): void {
    this.blockedUntilMs = Math.max(this.blockedUntilMs, Date.now() + delayMs);
  }

  enqueue<T>(task: () => Promise<T>): Promise<T> {
    if (this.queue.length >= VT_MAX_QUEUE_LENGTH) {
      return Promise.reject(new Error("QUEUE_FULL"));
    }

    return new Promise<T>((resolve, reject) => {
      this.queue.push({
        run: async () => {
          try {
            const nowMs = Date.now();
            this.pruneAndSync(nowMs);
            if (this.dayCount >= VT_MAX_PER_DAY) {
              reject(new Error("DAILY_QUOTA_EXCEEDED"));
              return;
            }

            // Respect server Retry-After backoff
            if (this.blockedUntilMs > nowMs) {
              await sleep(this.blockedUntilMs - nowMs);
            }

            // Respect 4 req/min sliding window
            const afterBackoffMs = Date.now();
            this.pruneAndSync(afterBackoffMs);
            if (this.minuteTimestamps.length >= VT_MAX_PER_MINUTE) {
              const waitMs =
                VT_MINUTE_WINDOW_MS - (afterBackoffMs - this.minuteTimestamps[0]) + 50;
              if (waitMs > 0) {
                await sleep(Math.min(waitMs, VT_MAX_RETRY_AFTER_MS));
              }
              this.pruneAndSync(Date.now());
              if (this.minuteTimestamps.length >= VT_MAX_PER_MINUTE) {
                reject(new Error("RATE_LIMITED"));
                return;
              }
            }

            this.minuteTimestamps.push(Date.now());
            this.dayCount += 1;
            const result = await task();
            resolve(result);
          } catch (err) {
            reject(err);
          }
        },
      });

      if (!this.processing) {
        void this.drain();
      }
    });
  }

  private async drain(): Promise<void> {
    this.processing = true;
    while (this.queue.length > 0) {
      const next = this.queue.shift();
      if (next) {
        await next.run();
      }
    }
    this.processing = false;
  }
}

const sharedVtQueue = new VirusTotalRateLimitedQueue();

/**
 * Layer 3: VirusTotal public API (single key, 4 req/min, 500 req/day).
 * Used ONLY as a 3rd layer for URLs still unknown after URLhaus & Google.
 * Respects `Retry-After` on HTTP 429 and never rotates multiple accounts/keys.
 */
export async function checkUrlWithVirusTotal(
  url: string,
  options?: {
    apiKey?: string;
    fetchImpl?: typeof fetch;
    signal?: AbortSignal;
  }
): Promise<UrlCheckProviderResult> {
  const apiKey = (options?.apiKey ?? process.env.VIRUSTOTAL_API_KEY ?? "").trim();

  if (!apiKey) {
    return {
      source: "virustotal",
      status: "skipped",
      verdict: "unknown",
      attribution: null,
      skipReason: "missing_api_key",
    };
  }

  if (!sharedVtQueue.hasDailyQuota()) {
    return {
      source: "virustotal",
      status: "skipped",
      verdict: "unknown",
      attribution: null,
      skipReason: "daily_quota_exceeded",
    };
  }

  const fetchFn = options?.fetchImpl ?? fetch;
  const urlId = toBase64UrlNoPadding(url);

  const executeAttempt = async (attempt: number): Promise<UrlCheckProviderResult> => {
    const response = await fetchFn(`${VIRUSTOTAL_URL_ENDPOINT}/${urlId}`, {
      method: "GET",
      headers: {
        "x-apikey": apiKey,
        Accept: "application/json",
      },
      signal: options?.signal ?? AbortSignal.timeout(6000),
      cache: "no-store",
    });

    if (response.status === 404) {
      // Unknown to VirusTotal; do not waste extra quota submitting automatically
      return {
        source: "virustotal",
        status: "checked",
        verdict: "unknown",
        attribution: null,
      };
    }

    if (response.status === 429) {
      const retryAfterMs = parseRetryAfterMs(response.headers.get("Retry-After"));
      sharedVtQueue.noteRetryAfter(retryAfterMs);
      if (attempt < VT_MAX_ATTEMPTS && sharedVtQueue.hasDailyQuota()) {
        await sleep(retryAfterMs);
        return executeAttempt(attempt + 1);
      }
      return {
        source: "virustotal",
        status: "skipped",
        verdict: "unknown",
        attribution: null,
        skipReason: "rate_limited",
      };
    }

    if (!response.ok) {
      return {
        source: "virustotal",
        status: "error",
        verdict: "unknown",
        attribution: null,
        errorMessage: `VirusTotal HTTP ${response.status}`,
      };
    }

    const data = (await response.json()) as {
      data?: {
        attributes?: {
          last_analysis_stats?: {
            malicious?: number;
            suspicious?: number;
            harmless?: number;
          };
        };
      };
    };

    const stats = data.data?.attributes?.last_analysis_stats;
    const malicious = stats?.malicious ?? 0;
    const suspicious = stats?.suspicious ?? 0;

    if (malicious > 0 || suspicious > 0) {
      return {
        source: "virustotal",
        status: "checked",
        verdict: "suspicious",
        attribution: null,
      };
    }

    return {
      source: "virustotal",
      status: "checked",
      verdict: (stats?.harmless ?? 0) > 0 ? "clean" : "unknown",
      attribution: null,
    };
  };

  try {
    return await sharedVtQueue.enqueue(() => executeAttempt(1));
  } catch (err) {
    const code = err instanceof Error ? err.message : "";
    if (code === "DAILY_QUOTA_EXCEEDED") {
      return {
        source: "virustotal",
        status: "skipped",
        verdict: "unknown",
        attribution: null,
        skipReason: "daily_quota_exceeded",
      };
    }
    if (code === "RATE_LIMITED") {
      return {
        source: "virustotal",
        status: "skipped",
        verdict: "unknown",
        attribution: null,
        skipReason: "rate_limited",
      };
    }
    if (code === "QUEUE_FULL") {
      return {
        source: "virustotal",
        status: "skipped",
        verdict: "unknown",
        attribution: null,
        skipReason: "queue_full",
      };
    }
    return {
      source: "virustotal",
      status: "error",
      verdict: "unknown",
      attribution: null,
      errorMessage:
        err instanceof Error ? err.message : "VirusTotal request failed",
    };
  }
}
