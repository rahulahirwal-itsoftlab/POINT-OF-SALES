import type { z } from "zod";
import type { listPaymentsSchema } from "./payment.validation.js";

export type ListPaymentsQuery = z.infer<typeof listPaymentsSchema>;
