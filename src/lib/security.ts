/**
 * Security utilities for preventing XSS and injection attacks
 */

/**
 * Escapes HTML special characters to prevent XSS attacks
 * @param str - The string to escape
 * @returns Escaped string safe for HTML rendering
 */
export function escapeHtml(str: string | null | undefined): string {
  if (!str) return "";

  const map: Record<string, string> = {
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
    "/": "&#47;",
    "`": "&#96;",
  };

  return String(str).replace(/[&<>"'`\/]/g, (char) => {
    const escaped = map[char];
    return escaped || char;
  });
}

/**
 * Safely sanitizes URL to prevent javascript: and data: protocol attacks
 * @param url - The URL to sanitize
 * @returns Safe URL or empty string if invalid
 */
export function sanitizeUrl(url: string | null | undefined): string {
  if (!url) return "";

  try {
    const trimmed = url.trim();

    // Block dangerous protocols
    if (/^(javascript|data|vbscript|file|blob):/i.test(trimmed)) {
      return "";
    }

    // Allow relative URLs and common protocols
    if (trimmed.startsWith("/") || /^https?:\/\//.test(trimmed)) {
      return encodeURI(trimmed);
    }

    return "";
  } catch {
    return "";
  }
}

/**
 * Safely validates and encodes JSON strings
 * @param data - Data to convert to JSON
 * @returns Valid JSON string
 */
export function safeJsonStringify(data: unknown): string {
  try {
    return JSON.stringify(data);
  } catch {
    return "{}";
  }
}

/**
 * Validates email addresses
 * @param email - Email to validate
 * @returns true if valid email
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Sanitizes object keys to prevent prototype pollution
 * @param obj - Object to sanitize
 * @returns Sanitized object
 */
export function sanitizeObject<T extends Record<string, unknown>>(obj: T): Partial<T> {
  const dangerous = ["__proto__", "constructor", "prototype"];
  const sanitized: Partial<T> = {};

  for (const [key, value] of Object.entries(obj)) {
    if (!dangerous.includes(key) && key !== "__proto__") {
      sanitized[key as keyof T] = value as T[keyof T];
    }
  }

  return sanitized;
}

/**
 * Validates file types for upload
 * @param file - File to validate
 * @param allowedTypes - Array of allowed MIME types
 * @returns true if file type is allowed
 */
export function isAllowedFileType(file: File, allowedTypes: string[]): boolean {
  return allowedTypes.includes(file.type);
}

/**
 * Limits string length to prevent buffer overflows
 * @param str - String to limit
 * @param maxLength - Maximum length
 * @returns Trimmed string
 */
export function limitStringLength(str: string, maxLength: number): string {
  if (!str) return "";
  return str.substring(0, Math.max(0, maxLength));
}

/**
 * Removes potentially dangerous patterns from strings
 * @param str - String to clean
 * @returns Cleaned string
 */
export function removeScriptPatterns(str: string): string {
  if (!str) return "";

  return (
    str
      // Remove script tags with proper character matching
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
      // Remove event handlers (all variations)
      .replace(/on(?:load|error|click|change|submit|focus|blur)\s*=\s*["'](?:[^"]|\\")*["']/gi, "")
      .replace(/on\w+\s*=\s*(?:[^\s>"']|["'][^"']*["'])+/gi, "")
      // Remove dangerous HTML with proper character matching
      .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, "")
      .replace(/<object\b[^<]*(?:(?!<\/object>)<[^<]*)*<\/object>/gi, "")
      .replace(/<embed\b[^>]*>/gi, "")
      // Remove form tags that could be XSS vectors
      .replace(/<form\b[^>]*>/gi, "")
      .replace(/<\/form>/gi, "")
  );
}

export default {
  escapeHtml,
  sanitizeUrl,
  safeJsonStringify,
  isValidEmail,
  sanitizeObject,
  isAllowedFileType,
  limitStringLength,
  removeScriptPatterns,
};
