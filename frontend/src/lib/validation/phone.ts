/**
 * Reusable Phone Number Validation & Sanitization System
 * Enforces strictly 10 digits across the entire application.
 */

export const PHONE_REGEX = /^\d{10}$/;
export const PHONE_MAX_LENGTH = 10;

/**
 * Sanitizes phone input by removing all non-digit characters
 * and capping the result at exactly 10 digits.
 */
export function sanitizePhone(input: string | null | undefined): string {
  if (!input) return "";
  return input.replace(/\D/g, "").slice(0, PHONE_MAX_LENGTH);
}

/**
 * Validates whether a phone number is exactly 10 digits.
 */
export function validatePhone(
  input: string | null | undefined,
  isRequired = true
): { isValid: boolean; error?: string } {
  const sanitized = sanitizePhone(input);

  if (!sanitized) {
    if (isRequired) {
      return { isValid: false, error: "Phone number is required." };
    }
    return { isValid: true };
  }

  if (sanitized.length !== PHONE_MAX_LENGTH || !PHONE_REGEX.test(sanitized)) {
    return { isValid: false, error: "Please enter a valid 10-digit phone number." };
  }

  return { isValid: true };
}
