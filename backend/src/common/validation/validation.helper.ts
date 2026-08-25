import type { Context } from "hono";
import type { z } from "zod";
import { AppError } from "../errors/app-error.js";

export async function validateJson<TSchema extends z.ZodTypeAny>(c: Context, schema: TSchema) {
  let payload: unknown;

  try {
    payload = await c.req.json();
  } catch (error) {
    throw new AppError(
      "Malformed JSON request body",
      422,
      "VALIDATION_ERROR",
      undefined,
      "Request validation failed. Please check the provided data.",
      error,
    );
  }

  return schema.parse(payload) as z.infer<TSchema>;
}

export function validateQuery<TSchema extends z.ZodTypeAny>(c: Context, schema: TSchema) {
  return schema.parse(Object.fromEntries(new URL(c.req.url).searchParams)) as z.infer<TSchema>;
}
