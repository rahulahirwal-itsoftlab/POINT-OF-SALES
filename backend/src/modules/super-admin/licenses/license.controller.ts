import type { Context } from "hono";
import { successResponse } from "../../../common/responses/success-response.js";
import { validateJson, validateQuery } from "../../../common/validation/validation.helper.js";
import { requiredId } from "../shared/id-param.js";
import { LicenseService } from "./license.service.js";
import { listLicensesSchema, renewLicenseSchema } from "./license.validation.js";

export class LicenseController {
  private readonly service = new LicenseService();

  async list(c: Context) {
    const query = validateQuery(c, listLicensesSchema);
    const data = await this.service.list(query);
    return c.json(successResponse(data.rows, "Licenses loaded", { total: data.total, page: data.page, limit: data.limit }));
  }

  async detail(c: Context) {
    const data = await this.service.detail(requiredId(c, "license"));
    return c.json(successResponse(data, "License details loaded"));
  }

  async history(c: Context) {
    const data = await this.service.history(requiredId(c, "license"));
    return c.json(successResponse(data, "License subscription history loaded"));
  }

  async expiring(c: Context) {
    const query = validateQuery(c, listLicensesSchema);
    // Overwrite status and expiresInDays for expiring
    const data = await this.service.list({ ...query, status: "ACTIVE", expiresInDays: String(Number(query.expiresInDays) || 30) });
    return c.json(successResponse(data.rows, "Expiring licenses loaded", { total: data.total, page: data.page, limit: data.limit }));
  }

  async expired(c: Context) {
    const query = validateQuery(c, listLicensesSchema);
    const data = await this.service.list({ ...query, status: "EXPIRED" });
    return c.json(successResponse(data.rows, "Expired licenses loaded", { total: data.total, page: data.page, limit: data.limit }));
  }

  async triggerExpiry(c: Context) {
    const user = c.get("user");
    const count = await this.service.triggerExpiry(user?.id);
    return c.json(successResponse({ processedCount: count }, `Expired ${count} licenses`));
  }

  async activate(c: Context) {
    const id = requiredId(c, "license");
    const user = c.get("user");
    const data = await this.service.changeStatus(id, "ACTIVE", user?.id);
    return c.json(successResponse(data, "License activated"));
  }

  async suspend(c: Context) {
    const id = requiredId(c, "license");
    const user = c.get("user");
    const data = await this.service.changeStatus(id, "SUSPENDED", user?.id);
    return c.json(successResponse(data, "License suspended"));
  }

  async revoke(c: Context) {
    const id = requiredId(c, "license");
    const user = c.get("user");
    const data = await this.service.changeStatus(id, "REVOKED", user?.id);
    return c.json(successResponse(data, "License revoked"));
  }

  async renew(c: Context) {
    const id = requiredId(c, "license");
    const input = await validateJson(c, renewLicenseSchema);
    const user = c.get("user");
    const data = await this.service.renew(id, input, user?.id);
    return c.json(successResponse(data, "Subscription renewed and license updated"));
  }
}
