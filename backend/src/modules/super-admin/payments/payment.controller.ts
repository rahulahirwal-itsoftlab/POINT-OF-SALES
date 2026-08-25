import type { Context } from "hono";
import { successResponse } from "../../../common/responses/success-response.js";
import { validateQuery } from "../../../common/validation/validation.helper.js";
import { requiredId } from "../shared/id-param.js";
import { PaymentService } from "./payment.service.js";
import { listPaymentsSchema } from "./payment.validation.js";

export class PaymentController {
  private readonly service = new PaymentService();

  async list(c: Context) {
    const query = validateQuery(c, listPaymentsSchema);
    const data = await this.service.list(query);
    return c.json(successResponse(data.rows, "Payments loaded", { total: data.total, page: data.page, limit: data.limit }));
  }

  async detail(c: Context) {
    const data = await this.service.detail(requiredId(c, "payment"));
    return c.json(successResponse(data, "Payment details loaded"));
  }
}
