import type { z } from "zod";
import type { listLicensesSchema, renewLicenseSchema } from "./license.validation.js";

export type ListLicensesQuery = z.infer<typeof listLicensesSchema>;
export type RenewLicenseBody = z.infer<typeof renewLicenseSchema>;
