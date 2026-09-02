/**
 * Global Validation Rules & Field Sanitizers
 * Used for consistent field-level validation across all application modules.
 */

export const EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

export function validateRequired(value: string | null | undefined, fieldName: string): { isValid: boolean; error?: string } {
  if (!value || !value.trim()) {
    return { isValid: false, error: `${fieldName} is required.` };
  }
  return { isValid: true };
}

export function validateEmail(value: string | null | undefined, isRequired = true): { isValid: boolean; error?: string } {
  if (!value || !value.trim()) {
    if (isRequired) return { isValid: false, error: "Email address is required." };
    return { isValid: true };
  }
  if (!EMAIL_REGEX.test(value.trim())) {
    return { isValid: false, error: "Please enter a valid email address." };
  }
  return { isValid: true };
}

export function validateAmount(
  value: number | string | null | undefined,
  fieldName = "Amount",
  canBeZero = false
): { isValid: boolean; error?: string } {
  if (value === null || value === undefined || value === "") {
    return { isValid: false, error: `${fieldName} is required.` };
  }
  const num = typeof value === "number" ? value : Number(value);
  if (isNaN(num)) {
    return { isValid: false, error: `${fieldName} must be a valid number.` };
  }
  if (canBeZero ? num < 0 : num <= 0) {
    return { isValid: false, error: canBeZero ? `${fieldName} cannot be negative.` : `${fieldName} must be greater than zero.` };
  }
  return { isValid: true };
}

export function validateQuantity(
  value: number | string | null | undefined,
  fieldName = "Quantity",
  min = 1
): { isValid: boolean; error?: string } {
  if (value === null || value === undefined || value === "") {
    return { isValid: false, error: `${fieldName} is required.` };
  }
  const num = typeof value === "number" ? value : Number(value);
  if (isNaN(num) || !Number.isInteger(num)) {
    return { isValid: false, error: `${fieldName} must be a valid whole number.` };
  }
  if (num < min) {
    return { isValid: false, error: `${fieldName} must be at least ${min}.` };
  }
  return { isValid: true };
}

export function validateGst(value: number | string | null | undefined): { isValid: boolean; error?: string } {
  if (value === null || value === undefined || value === "") {
    return { isValid: true };
  }
  const num = typeof value === "number" ? value : Number(value);
  if (isNaN(num) || num < 0 || num > 100) {
    return { isValid: false, error: "Please enter a valid GST percentage (0 - 100)." };
  }
  return { isValid: true };
}

export function validateDateRange(
  startDate: string | Date | null | undefined,
  endDate: string | Date | null | undefined
): { isValid: boolean; error?: string } {
  if (!startDate || !endDate) return { isValid: true };
  const start = new Date(startDate);
  const end = new Date(endDate);
  if (isNaN(start.getTime()) || isNaN(end.getTime())) {
    return { isValid: false, error: "Please select valid dates." };
  }
  if (start > end) {
    return { isValid: false, error: "Start date cannot be after end date." };
  }
  return { isValid: true };
}
