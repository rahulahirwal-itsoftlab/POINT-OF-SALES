import type { z } from "zod";
import type { listSubscriptionsSchema, createSubscriptionSchema, renewSubscriptionSchema, updateSubscriptionSchema } from "./subscription.validation.js";

export type ListSubscriptionsQuery = z.infer<typeof listSubscriptionsSchema>;
export type CreateSubscriptionBody = z.infer<typeof createSubscriptionSchema>;
export type RenewSubscriptionBody = z.infer<typeof renewSubscriptionSchema>;
export type UpdateSubscriptionBody = z.infer<typeof updateSubscriptionSchema>;

