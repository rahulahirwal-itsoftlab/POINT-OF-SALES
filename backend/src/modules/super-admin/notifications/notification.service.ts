import { AppError } from "../../../common/errors/app-error.js";
import { NotificationRepository } from "./notification.repository.js";
import type { ListNotificationsQuery } from "./notification.types.js";

export class NotificationService {
  private readonly repository = new NotificationRepository();

  list(query: ListNotificationsQuery) {
    return this.repository.list(query);
  }

  async detail(id: string) {
    const notification = await this.repository.detail(id);
    if (!notification) throw new AppError("Notification not found", 404, "NOTIFICATION_NOT_FOUND");
    return notification;
  }

  async markRead(id: string) {
    const notification = await this.repository.markRead(id);
    if (!notification) throw new AppError("Notification not found", 404, "NOTIFICATION_NOT_FOUND");
    return notification;
  }

  markAllRead(query: ListNotificationsQuery) {
    return this.repository.markAllRead(query);
  }
}
