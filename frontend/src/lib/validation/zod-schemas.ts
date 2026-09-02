import { z } from "zod";
import { sanitizePhone, PHONE_REGEX } from "./phone";
import { EMAIL_REGEX } from "./rules";

export const zPhoneSchema = z
  .string()
  .transform(sanitizePhone)
  .refine((val) => PHONE_REGEX.test(val), {
    message: "Please enter a valid 10-digit phone number.",
  });

export const zOptionalPhoneSchema = z
  .string()
  .optional()
  .nullable()
  .transform((val) => (val ? sanitizePhone(val) : ""))
  .refine((val) => !val || PHONE_REGEX.test(val), {
    message: "Please enter a valid 10-digit phone number.",
  });

export const zEmailSchema = z
  .string()
  .trim()
  .min(1, "Email address is required.")
  .regex(EMAIL_REGEX, "Please enter a valid email address.");

export const zRequiredString = (fieldName: string) =>
  z.string().trim().min(1, `${fieldName} is required.`);

export const zNonNegativeNumber = (fieldName = "Amount") =>
  z.coerce
    .number({ invalid_type_error: `${fieldName} must be a valid number.` })
    .min(0, `${fieldName} cannot be negative.`);

export const zPositiveInt = (fieldName = "Count") =>
  z.coerce
    .number({ invalid_type_error: `${fieldName} must be a whole number.` })
    .int(`${fieldName} must be a whole number.`)
    .min(0, `${fieldName} cannot be negative.`);
