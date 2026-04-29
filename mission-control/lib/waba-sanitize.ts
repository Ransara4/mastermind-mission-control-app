export const VALID_STAGES = [
  "pre-setup", "waba-creation", "number-registration", "display-name",
  "business-verification", "security", "coexistence", "partner-management",
  "triage", "errors", "competitor-reference",
];

export const VALID_MODES = ["keyword", "semantic", "hybrid"];

export const VALID_AUDIENCES = ["customer", "internal"];

/** Strip control chars, null bytes, Unicode direction overrides, truncate to 500 chars */
export function sanitizeQuery(q: string | null): string | null {
  if (!q) return null;
  // Remove null bytes, control chars (0-31 except tab/newline), Unicode bidi overrides
  const cleaned = q
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "")
    .replace(/[\u200E\u200F\u202A-\u202E\u2066-\u2069]/g, "")
    .trim()
    .slice(0, 500);
  return cleaned.length === 0 ? null : cleaned;
}

export function validateStage(s: string | null): string | null {
  if (!s || !VALID_STAGES.includes(s)) return null;
  return s;
}

export function validateMode(s: string | null): string {
  if (!s || !VALID_MODES.includes(s)) return "keyword";
  return s;
}

export function validateAudience(s: string | null): string | null {
  if (!s || !VALID_AUDIENCES.includes(s)) return null;
  return s;
}
