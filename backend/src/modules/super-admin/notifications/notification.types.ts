import type { z } from "zod";
import type { listNotificationsSchema } from "./notification.validation.js";

export type ListNotificationsQuery = z.infer<typeof listNotificationsSchema>;
