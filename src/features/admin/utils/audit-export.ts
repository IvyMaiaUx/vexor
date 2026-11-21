/**
 * VEXOR — Audit Log Export & Sanitization Utilities
 *
 * Implements strict security defenses:
 * 1. CSV Formula Injection mitigation (escapes '=', '+', '-', '@', '\t', '\r', '\n',
 *    including payloads preceded by whitespace or control characters)
 * 2. Sensitive credential & private data redaction (passwords, tokens, API keys, secrets, emails)
 * 3. UTF-8 BOM encoding for seamless Microsoft Excel rendering
 * 4. RFC 4180 CSV escaping compliance
 */

import type { AuditLog, AuditSeverity } from "../types";

const SENSITIVE_KEY_REGEX =
  /(password|passwd|token|secret|apiKey|api_key|credential|auth|hash|private_key|service_role|jwt|cookie|session|email)/i;

const FORMULA_INJECTION_REGEX =
  /^[\s\u0000-\u001F\u007F]*[=+\-@]|^[\u0000-\u001F\u007F]/;

/**
 * Classifies an audit event into a consistent severity level.
 */
export function classifyAuditSeverity(
  log: Pick<AuditLog, "action" | "incomplete">
): AuditSeverity {
  const action = (log.action || "").toLowerCase();

  if (action.includes("denied") || action.includes("unauthorized")) {
    return "access_denied";
  }

  if (
    log.incomplete === true ||
    action === "user.role_changed" ||
    action === "user.role_updated" ||
    action === "user.suspended" ||
    action === "system.config_updated" ||
    action === "topic.delete" ||
    action === "post.delete" ||
    action === "resource.rejected"
  ) {
    return "critical";
  }

  if (
    action === "user.unsuspended" ||
    action === "topic.lock" ||
    action === "topic.hide" ||
    action === "post.hide" ||
    action === "research.rejected" ||
    action === "research.revision_requested" ||
    action === "report.reviewing" ||
    action === "maintenance.cleanup"
  ) {
    return "warning";
  }

  return "info";
}

/**
 * Sanitizes metadata objects by recursively removing or masking sensitive fields
 * and safely handling malformed or circular structures.
 */
export function sanitizeAuditMetadata(
  meta: Record<string, unknown> | null | undefined,
  seen: WeakSet<object> = new WeakSet()
): Record<string, unknown> {
  if (!meta || typeof meta !== "object" || Array.isArray(meta)) return {};
  if (seen.has(meta)) return { _circular: "[TRUNCATED]" };
  seen.add(meta);

  const sanitized: Record<string, unknown> = {};

  for (const [key, val] of Object.entries(meta)) {
    if (SENSITIVE_KEY_REGEX.test(key)) {
      sanitized[key] = "[REDACTED_FOR_SECURITY]";
      continue;
    }

    if (typeof val === "string") {
      if (
        /^Bearer\s+/i.test(val) ||
        /^eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/.test(val)
      ) {
        sanitized[key] = "[REDACTED_TOKEN]";
      } else {
        sanitized[key] = val;
      }
    } else if (Array.isArray(val)) {
      sanitized[key] = val.map((item) =>
        item && typeof item === "object" && !Array.isArray(item)
          ? sanitizeAuditMetadata(item as Record<string, unknown>, seen)
          : item
      );
    } else if (val && typeof val === "object") {
      sanitized[key] = sanitizeAuditMetadata(val as Record<string, unknown>, seen);
    } else {
      sanitized[key] = val;
    }
  }

  return sanitized;
}

/**
 * Escapes a single CSV cell according to RFC 4180 and protects against
 * CSV Formula Injection (DDE / spreadsheet formula execution).
 * Neutralizes '=', '+', '-', '@', '\t', '\r', '\n', and control/whitespace-prefixed formulas.
 */
export function escapeCsvCell(raw: unknown): string {
  if (raw === null || raw === undefined) {
    return '""';
  }

  let str = String(raw);

  if (/^[=+\-@\t\r]/.test(str) || FORMULA_INJECTION_REGEX.test(str)) {
    str = `'${str}`;
  }

  const escaped = str.replace(/"/g, '""');
  return `"${escaped}"`;
}

/**
 * Safely serializes sanitized metadata into JSON without throwing on malformed values.
 */
export function safeStringifyAuditMetadata(
  meta: Record<string, unknown> | null | undefined
): string {
  try {
    return JSON.stringify(sanitizeAuditMetadata(meta));
  } catch {
    return "{}";
  }
}

/**
 * Converts a list of AuditLog records into an RFC 4180 compliant CSV string
 * with UTF-8 BOM prefix for Microsoft Excel compatibility.
 */
export function generateAuditLogsCsv(
  logs: readonly AuditLog[],
  customHeaders?: string[]
): string {
  const headers = customHeaders ?? [
    "ID",
    "Data/Hora (UTC)",
    "Operador",
    "ID do Operador",
    "Ação",
    "Classificação",
    "Tipo de Entidade",
    "ID da Entidade",
    "Status de Integridade",
    "Metadados Sanitizados",
  ];

  const rows = logs.map((log) => {
    const isComplete = log.incomplete !== true && !!log.actorUsername && !!log.action;
    const severity = classifyAuditSeverity(log);
    const metaString = safeStringifyAuditMetadata(log.metadata);

    return [
      escapeCsvCell(log.id),
      escapeCsvCell(log.createdAt),
      escapeCsvCell(log.actorUsername || "system"),
      escapeCsvCell(log.actorId || "N/A"),
      escapeCsvCell(log.action),
      escapeCsvCell(severity),
      escapeCsvCell(log.entityType),
      escapeCsvCell(log.entityId),
      escapeCsvCell(isComplete ? "Completo" : "Informação Parcial"),
      escapeCsvCell(metaString),
    ].join(",");
  });

  return "\uFEFF" + [headers.map(escapeCsvCell).join(","), ...rows].join("\r\n");
}

/**
 * Client-side browser download helper for the generated CSV file.
 * Exports the audit records returned by the authenticated admin API.
 */
export function exportAuditLogsToCsv(
  logs: readonly AuditLog[],
  customFilename?: string,
  customHeaders?: string[]
): boolean {
  if (typeof window === "undefined" || logs.length === 0) return false;

  try {
    const csvContent = generateAuditLogsCsv(logs, customHeaders);
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);

    const now = new Date().toISOString().slice(0, 10);
    const filename = customFilename || `vexor-audit-${now}.csv`;

    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    return true;
  } catch {
    return false;
  }
}
