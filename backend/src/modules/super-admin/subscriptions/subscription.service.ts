import { AppError } from "../../../common/errors/app-error.js";
import { SubscriptionRepository } from "./subscription.repository.js";
import type { ListSubscriptionsQuery, CreateSubscriptionBody, RenewSubscriptionBody, UpdateSubscriptionBody } from "./subscription.types.js";

export class SubscriptionService {
  private readonly repository = new SubscriptionRepository();

  list(query: ListSubscriptionsQuery) {
    return this.repository.list(query);
  }

  async detail(id: string) {
    const subscription = await this.repository.detail(id);
    if (!subscription) throw new AppError("Subscription not found", 404, "SUBSCRIPTION_NOT_FOUND");
    return subscription;
  }

  async create(body: CreateSubscriptionBody, actorSuperAdminId?: string) {
    return this.repository.create(body, actorSuperAdminId);
  }

  async renew(id: string, body: RenewSubscriptionBody, actorSuperAdminId?: string) {
    await this.detail(id); // Ensure exists
    return this.repository.renew(id, body, actorSuperAdminId);
  }

  async suspend(id: string, actorSuperAdminId?: string) {
    await this.detail(id);
    return this.repository.changeStatus(id, "SUSPENDED", actorSuperAdminId);
  }

  async cancel(id: string, actorSuperAdminId?: string) {
    await this.detail(id);
    return this.repository.changeStatus(id, "CANCELLED", actorSuperAdminId);
  }

  async reactivate(id: string, actorSuperAdminId?: string) {
    await this.detail(id);
    return this.repository.reactivate(id, actorSuperAdminId);
  }

  async update(id: string, body: UpdateSubscriptionBody, actorSuperAdminId?: string) {
    await this.detail(id);
    return this.repository.update(id, body, actorSuperAdminId);
  }

  triggerExpiry(actorSuperAdminId?: string) {
    return this.repository.triggerExpiry(actorSuperAdminId);
  }

  notifyExpiringSoon() {
    return this.repository.notifyExpiringSoon();
  }
}

