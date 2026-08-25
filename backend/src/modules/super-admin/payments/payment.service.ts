import { AppError } from "../../../common/errors/app-error.js";
import { PaymentRepository } from "./payment.repository.js";
import type { ListPaymentsQuery } from "./payment.types.js";

export class PaymentService {
  private readonly repository = new PaymentRepository();

  list(query: ListPaymentsQuery) {
    return this.repository.list(query);
  }

  async detail(id: string) {
    const payment = await this.repository.detail(id);
    if (!payment) throw new AppError("Payment not found", 404, "PAYMENT_NOT_FOUND");
    return payment;
  }
}
