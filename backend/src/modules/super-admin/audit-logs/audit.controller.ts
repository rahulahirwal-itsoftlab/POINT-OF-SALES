import type { Context } from "hono";
import { successResponse } from "../../../common/responses/success-response.js";
import { validateQuery } from "../../../common/validation/validation.helper.js";
import { requiredId } from "../shared/id-param.js";
import { AuditService } from "./audit.service.js";
import { listAuditLogsSchema } from "./audit.validation.js";

export class AuditController {
  private readonly service = new AuditService();

  async list(c: Context) {
    const query = validateQuery(c, listAuditLogsSchema);
    const data = await this.service.list(query);
    return c.json(
      successResponse(data.rows, "Audit logs loaded", {
        total: data.total,
        page: data.page,
        limit: data.limit,
        totalPages: Math.ceil(data.total / data.limit),
      })
    );
  }

  async detail(c: Context) {
    const data = await this.service.detail(requiredId(c, "audit"));
    return c.json(successResponse(data, "Audit log details loaded"));
  }

  async listFilters(c: Context) {
    const [actions, modules] = await Promise.all([
      this.service.listDistinctActions(),
      this.service.listDistinctModules(),
    ]);
    return c.json(successResponse({ actions, modules }, "Audit log filter options loaded"));
  }
}
