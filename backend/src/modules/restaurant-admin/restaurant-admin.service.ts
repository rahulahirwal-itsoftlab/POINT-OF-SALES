import { RestaurantAdminRepository } from "./restaurant-admin.repository.js";

export class RestaurantAdminService {
  private readonly repository = new RestaurantAdminRepository();

  dashboard = this.repository.dashboard.bind(this.repository);
  listStaff = this.repository.listStaff.bind(this.repository);
  createStaff = this.repository.createStaff.bind(this.repository);
  getStaff = this.repository.getStaff.bind(this.repository);
  updateStaff = this.repository.updateStaff.bind(this.repository);
  changeStaffStatus = this.repository.changeStaffStatus.bind(this.repository);
  listBills = this.repository.listBills.bind(this.repository);
  getBill = this.repository.getBill.bind(this.repository);
  subscription = this.repository.subscription.bind(this.repository);
  availablePlans = this.repository.availablePlans.bind(this.repository);
  renewSubscription = this.repository.renewSubscription.bind(this.repository);
  auditLogs = this.repository.auditLogs.bind(this.repository);
  activityLogs = this.repository.activityLogs.bind(this.repository);
  notifications = this.repository.notifications.bind(this.repository);
  markNotificationRead = this.repository.markNotificationRead.bind(this.repository);
  markAllNotificationsRead = this.repository.markAllNotificationsRead.bind(this.repository);
}
