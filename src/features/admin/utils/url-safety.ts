/**
 * VEXOR — URL Safety & Suspicious Link Analyzer
 *
 * Inspects external links submitted by community members before moderation.
 * Never fetches, navigates to, or executes external URLs.
 * All findings are defensive heuristic indicators, not proof of malicious intent.
 */

export interface UrlSafetyReport {
  isSafe: boolean;
  severity: "safe" | "info" | "warning" | "danger";
  warnings: string[];
  protocol: string;
  hostname: string;
  port: string;
  cleanUrl: string;
  indicators?: string[];
}

const DANGEROUS_PROTOCOLS = new Set([
  "javascript:",
  "data:",
  "vbscript:",
  "file:",
  "blob:",
]);

const KNOWN_SHORTENERS = new Set([
  "bit.ly",
  "tinyurl.com",
  "t.co",
  "is.gd",
  "cutt.ly",
  "ow.ly",
  "buff.ly",
  "adf.ly",
  "goo.gl",
  "rb.gy",
  "shorturl.at",
]);

const SUSPICIOUS_PORTS = new Set([
  "1337",
  "31337",
  "4444",
  "5555",
  "6666",
  "6667",
  "7777",
  "8888",
  "9999",
  "9001",
]);

const IP_V4_REGEX = /^(?:[0-9]{1,3}\.){3}[0-9]{1,3}$/;
const SUSPICIOUS_ENCODING_REGEX = /%00|%25[0-9a-f]{2}|[\u0000-\u001F\u007F\u202A-\u202E\u2066-\u2069]/i;
const REDIRECT_PARAM_NAMES = new Set([
  "redirect",
  "redirect_to",
  "redirect_uri",
  "next",
  "url",
  "target",
  "return",
  "returnto",
  "dest",
  "destination",
  "continue",
]);
const PHISHING_KEYWORDS = /(login|signin|verify|account|security|auth|update|wallet|confirm)/i;
const HIGH_ABUSE_TLDS = new Set(["tk", "ml", "ga", "cf", "gq", "zip", "mov", "top", "xyz"]);

export function analyzeUrlSafety(rawUrl: string | undefined | null): UrlSafetyReport {
  if (!rawUrl || typeof rawUrl !== "string" || !rawUrl.trim()) {
    return {
      isSafe: true,
      severity: "info",
      warnings: ["Nenhum link externo anexado."],
      protocol: "none",
      hostname: "",
      port: "",
      cleanUrl: "",
      indicators: [],
    };
  }

  const trimmed = rawUrl.trim();
  const warnings: string[] = [];
  const indicators: string[] = [];

  // 1. Check for explicit dangerous protocols in raw string (including whitespace/control obfuscation)
  const normalizedPrefix = trimmed.replace(/[\s\u0000-\u001F]+/g, "").toLowerCase();
  for (const dangerous of DANGEROUS_PROTOCOLS) {
    if (normalizedPrefix.startsWith(dangerous)) {
      return {
        isSafe: false,
        severity: "danger",
        warnings: [
          `Protocolo proibido (${dangerous}): possível vetor de injeção de script ou execução local.`,
        ],
        protocol: dangerous,
        hostname: "",
        port: "",
        cleanUrl: trimmed,
        indicators: ["dangerous_protocol"],
      };
    }
  }

  // 2. Check suspicious encodings / invisible or bidi characters before parsing
  if (SUSPICIOUS_ENCODING_REGEX.test(trimmed)) {
    warnings.push(
      "Caracteres de controle, Unicode bidirecional ou codificação dupla detectados na URL."
    );
    indicators.push("suspicious_encoding");
  }

  // 3. Parse URL standard
  try {
    const parsed = new URL(trimmed);

    // Enforce http / https
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      warnings.push(`Protocolo não padrão detectado: ${parsed.protocol}`);
      indicators.push("non_http_protocol");
    } else if (parsed.protocol === "http:") {
      warnings.push("Conexão não criptografada (HTTP). Recomendado uso de HTTPS.");
      indicators.push("insecure_http");
    }

    // Userinfo (@) spoofing check
    if (parsed.username || parsed.password) {
      warnings.push(
        "Presença de credenciais ou caractere '@' na autoridade da URL (possível técnica de ofuscação de destino)."
      );
      indicators.push("userinfo_spoofing");
    }

    const host = parsed.hostname.toLowerCase();

    // 4. Direct IP address detection
    if (IP_V4_REGEX.test(host)) {
      warnings.push(
        "Endereço IP numérico direto (possível infraestrutura não indexada ou serviço temporário)."
      );
      indicators.push("direct_ip");
    }

    // 5. Punycode / Homograph detection
    if (host.includes("xn--")) {
      warnings.push(
        "Domínio internacionalizado em Punycode (possível ataque homógrafo / spoofing visual)."
      );
      indicators.push("punycode");
    }

    // 6. URL Shorteners
    if (KNOWN_SHORTENERS.has(host)) {
      warnings.push(
        "Serviço de encurtador de URL detectado (destino final oculto até análise isolada)."
      );
      indicators.push("url_shortener");
    }

    // 7. Suspicious ports
    if (parsed.port && SUSPICIOUS_PORTS.has(parsed.port)) {
      warnings.push(
        `Porta não padrão frequentemente associada a serviços de laboratório, proxy ou possível C2 (porta ${parsed.port}).`
      );
      indicators.push("suspicious_port");
    }

    // 8. Phishing heuristic indicators (strictly non-conclusive)
    const hostLabels = host.split(".").filter(Boolean);
    const tld = hostLabels[hostLabels.length - 1] ?? "";
    const hasManySubdomains = hostLabels.length >= 4 && !IP_V4_REGEX.test(host);
    const hasPhishingTerms = PHISHING_KEYWORDS.test(host) || PHISHING_KEYWORDS.test(parsed.pathname);

    if ((hasManySubdomains && hasPhishingTerms) || (HIGH_ABUSE_TLDS.has(tld) && hasPhishingTerms)) {
      warnings.push(
        "Indicador heurístico compatível com possível aparência de phishing (subdomínios/termos de credencial). Não conclusivo."
      );
      indicators.push("phishing_heuristic");
    }

    // 9. Suspicious redirect query parameters
    for (const [paramKey, paramValue] of parsed.searchParams.entries()) {
      if (REDIRECT_PARAM_NAMES.has(paramKey.toLowerCase())) {
        const valLower = paramValue.trim().toLowerCase();
        if (
          valLower.startsWith("http://") ||
          valLower.startsWith("https://") ||
          valLower.startsWith("//") ||
          valLower.startsWith("javascript:")
        ) {
          warnings.push(
            `Parâmetro de redirecionamento externo detectado ('${paramKey}'): possível encadeamento de redirecionamento.`
          );
          indicators.push("suspicious_redirect");
          break;
        }
      }
    }

    const isDanger =
      indicators.includes("punycode") ||
      indicators.includes("userinfo_spoofing") ||
      indicators.includes("non_http_protocol") ||
      warnings.some((w) => w.includes("proibido") || w.includes("homógrafo"));

    const severity: UrlSafetyReport["severity"] =
      warnings.length === 0 ? "safe" : isDanger ? "danger" : "warning";

    return {
      isSafe: severity !== "danger",
      severity,
      warnings,
      protocol: parsed.protocol,
      hostname: parsed.hostname,
      port: parsed.port || (parsed.protocol === "https:" ? "443" : "80"),
      cleanUrl: parsed.href,
      indicators,
    };
  } catch {
    return {
      isSafe: false,
      severity: "warning",
      warnings: ["Formato de URL inválido ou malformado."],
      protocol: "unknown",
      hostname: "",
      port: "",
      cleanUrl: trimmed,
      indicators: ["malformed_url"],
    };
  }
}
