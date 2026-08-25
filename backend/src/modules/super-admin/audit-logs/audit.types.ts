import type { z } from "zod";
import type { listAuditLogsSchema } from "./audit.validation.js";

export type ListAuditLogsQuery = z.infer<typeof listAuditLogsSchema>;
