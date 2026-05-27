/**
 * Security utilities for input validation and sanitization
 */

/**
 * Sanitizes user input to prevent XSS attacks
 * Removes/escapes potentially dangerous HTML characters
 * @param input - Raw user input
 * @param maxLength - Maximum allowed length (default: 255)
 * @returns Sanitized input string
 */
export function sanitizeInput(input: string, maxLength: number = 255): string {
  if (!input) return "";

  return input
    .trim()
    .replace(/[<>]/g, "") // Remove angle brackets
    .replace(/&/g, "&amp;") // Escape ampersand
    .replace(/"/g, "&quot;") // Escape quotes
    .replace(/'/g, "&#x27;") // Escape single quotes
    .slice(0, maxLength);
}

/**
 * Normalizes email addresses
 * Converts to lowercase, trims whitespace, prevents injection vectors
 * @param email - Raw email input
 * @returns Normalized email
 */
export function normalizeEmail(email: string): string {
  return email.toLowerCase().trim();
}

/**
 * Validates email format
 * @param email - Email to validate
 * @returns True if valid email format
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(normalizeEmail(email));
}

/**
 * Sanitizes phone number - removes all non-numeric characters
 * @param phone - Raw phone input
 * @returns Numeric-only phone string
 */
export function sanitizePhoneNumber(phone: string): string {
  return phone.replace(/\D/g, "");
}

/**
 * Validates phone number length (10-20 digits)
 * @param phone - Phone number to validate
 * @returns True if valid length
 */
export function isValidPhoneNumber(phone: string): boolean {
  const sanitized = sanitizePhoneNumber(phone);
  return sanitized.length >= 10 && sanitized.length <= 20;
}

/**
 * Sanitizes vehicle number - allows alphanumeric and common separators
 * @param vehicleNumber - Raw vehicle input
 * @returns Sanitized vehicle number
 */
export function sanitizeVehicleNumber(vehicleNumber: string): string {
  return vehicleNumber
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9\-]/g, "") // Allow only alphanumeric and hyphen
    .slice(0, 20);
}

/**
 * Validates password strength
 * Requires: 12+ characters, uppercase, lowercase, number, special character
 * @param password - Password to validate
 * @returns Object with valid boolean and message
 */
export function validatePasswordStrength(password: string): {
  valid: boolean;
  message: string;
} {
  if (password.length < 12) {
    return {
      valid: false,
      message: "Password must be at least 12 characters",
    };
  }

  if (!/[a-z]/.test(password)) {
    return {
      valid: false,
      message: "Password must contain lowercase letters",
    };
  }

  if (!/[A-Z]/.test(password)) {
    return {
      valid: false,
      message: "Password must contain uppercase letters",
    };
  }

  if (!/\d/.test(password)) {
    return {
      valid: false,
      message: "Password must contain numbers",
    };
  }

  if (!/[@$!%*?&]/.test(password)) {
    return {
      valid: false,
      message: "Password must contain special characters (@$!%*?&)",
    };
  }

  return {
    valid: true,
    message: "Password is strong",
  };
}
