import { z } from "zod";

export const requiredNameSchema = z
  .string()
  .trim()
  .min(2)
  .max(100)
  .regex(/^[\p{L}\p{N}][\p{L}\p{N}\s.'&()-]*$/u, "Name contains unsupported characters")
  .transform((value) => value.replace(/\s+/g, " "));

export const optionalNameSchema = requiredNameSchema.optional();

export const indianPhoneSchema = z
  .string()
  .trim()
  .regex(/^\d{10}$/, "Phone number must be exactly 10 digits");

export const optionalIndianPhoneSchema = z.preprocess(
  (value) => (typeof value === "string" && value.trim() === "" ? undefined : value),
  indianPhoneSchema.optional(),
);

export const optionalEmailSchema = z.preprocess(
  (value) => (typeof value === "string" && value.trim() === "" ? undefined : value),
  z.string().trim().toLowerCase().email().max(254).optional(),
);

export const moneySchema = z.coerce.number().finite().min(0).max(9_999_999);
export const positiveMoneySchema = z.coerce.number().finite().positive().max(9_999_999);
export const percentageSchema = z.coerce.number().finite().min(0).max(100);
export const quantitySchema = z.coerce.number().int().min(1).max(999);

export const optionalNotesSchema = z.preprocess(
  (value) => (typeof value === "string" && value.trim() === "" ? undefined : value),
  z.string().trim().max(500).optional(),
);

export const optionalDescriptionSchema = z.preprocess(
  (value) => (typeof value === "string" && value.trim() === "" ? undefined : value),
  z.string().trim().max(500).optional(),
);

export const nullableImageUrlSchema = z
  .string()
  .trim()
  .min(1)
  .max(2048)
  .refine((value) => {
    if (value.startsWith("/")) return true;
    try {
      const parsed = new URL(value);
      return parsed.protocol === "http:" || parsed.protocol === "https:";
    } catch {
      return false;
    }
  }, "Image URL must be an absolute URL or backend-relative path")
  .nullable()
  .optional();
