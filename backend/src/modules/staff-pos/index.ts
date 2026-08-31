import { Hono } from "hono";
import { requireRole } from "../../middleware/role.middleware.js";
import { StaffPosController } from "./staff-pos.controller.js";

export const staffPosRoutes = new Hono();
const controller = new StaffPosController();

staffPosRoutes.get("/dashboard", requireRole("RESTAURANT_ADMIN", "RECEPTION", "WAITER", "KITCHEN"), (c) => controller.dashboard(c));

staffPosRoutes.get("/menu/categories", requireRole("RESTAURANT_ADMIN", "RECEPTION", "WAITER", "KITCHEN"), (c) => controller.categories(c));
staffPosRoutes.post("/menu/categories", requireRole("RESTAURANT_ADMIN", "RECEPTION"), (c) => controller.createCategory(c));
staffPosRoutes.get("/menu", requireRole("RESTAURANT_ADMIN", "RECEPTION", "WAITER", "KITCHEN"), (c) => controller.menu(c));
staffPosRoutes.post("/menu", requireRole("RESTAURANT_ADMIN", "RECEPTION"), (c) => controller.createMenuItem(c));
staffPosRoutes.patch("/menu/:id", requireRole("RESTAURANT_ADMIN", "RECEPTION"), (c) => controller.updateMenuItem(c));
staffPosRoutes.delete("/menu/:id", requireRole("RESTAURANT_ADMIN", "RECEPTION"), (c) => controller.deleteMenuItem(c));
staffPosRoutes.post("/uploads/menu-image", requireRole("RESTAURANT_ADMIN", "RECEPTION"), (c) => controller.uploadMenuImage(c));

staffPosRoutes.get("/tables", requireRole("RESTAURANT_ADMIN", "RECEPTION", "WAITER", "KITCHEN"), (c) => controller.tables(c));
staffPosRoutes.post("/tables", requireRole("RESTAURANT_ADMIN", "RECEPTION"), (c) => controller.createTable(c));
staffPosRoutes.get("/tables/:id", requireRole("RESTAURANT_ADMIN", "RECEPTION", "WAITER", "KITCHEN"), (c) => controller.tableDetail(c));
staffPosRoutes.patch("/tables/:id", requireRole("RESTAURANT_ADMIN", "RECEPTION"), (c) => controller.updateTable(c));
staffPosRoutes.delete("/tables/:id", requireRole("RESTAURANT_ADMIN", "RECEPTION"), (c) => controller.deleteTable(c));
staffPosRoutes.post("/tables/assign", requireRole("WAITER"), (c) => controller.assignTable(c));
staffPosRoutes.post("/tables/:id/assign", requireRole("WAITER"), (c) => controller.assignTable(c));
staffPosRoutes.get("/orders", requireRole("RESTAURANT_ADMIN", "RECEPTION", "WAITER", "KITCHEN"), (c) => controller.orders(c));
staffPosRoutes.post("/orders", requireRole("RESTAURANT_ADMIN", "WAITER", "RECEPTION"), (c) => controller.createOrder(c));
staffPosRoutes.get("/orders/:id", requireRole("RESTAURANT_ADMIN", "RECEPTION", "WAITER", "KITCHEN"), (c) => controller.orderDetail(c));
staffPosRoutes.post("/orders/:id/items", requireRole("WAITER"), (c) => controller.addOrderItems(c));
staffPosRoutes.post("/orders/:id/serve", requireRole("WAITER"), (c) => controller.serveOrder(c));
staffPosRoutes.post("/orders/:id/send-to-billing", requireRole("WAITER"), (c) => controller.sendToBilling(c));
staffPosRoutes.patch("/orders/:id/status", requireRole("RESTAURANT_ADMIN", "WAITER", "KITCHEN"), (c) => controller.updateOrderStatus(c));
staffPosRoutes.get("/notifications", requireRole("RESTAURANT_ADMIN", "RECEPTION", "WAITER", "KITCHEN"), (c) => controller.notifications(c));
staffPosRoutes.patch("/notifications/read-all", requireRole("RESTAURANT_ADMIN", "RECEPTION", "WAITER", "KITCHEN"), (c) => controller.readAllNotifications(c));
staffPosRoutes.patch("/notifications/:id/read", requireRole("RESTAURANT_ADMIN", "RECEPTION", "WAITER", "KITCHEN"), (c) => controller.readNotification(c));
staffPosRoutes.get("/kitchen/orders", requireRole("RESTAURANT_ADMIN", "KITCHEN"), (c) => controller.kitchenOrders(c));
staffPosRoutes.patch("/kitchen/orders/:id/status", requireRole("RESTAURANT_ADMIN", "KITCHEN"), (c) => controller.updateOrderStatus(c));

staffPosRoutes.get("/bills", requireRole("RESTAURANT_ADMIN", "RECEPTION", "WAITER"), (c) => controller.bills(c));
staffPosRoutes.get("/bills/:id", requireRole("RESTAURANT_ADMIN", "RECEPTION", "WAITER"), (c) => controller.billDetail(c));
staffPosRoutes.post("/orders/:id/bill", requireRole("RESTAURANT_ADMIN", "RECEPTION", "WAITER"), (c) => controller.generateBill(c));
staffPosRoutes.patch("/bills/:id/payment", requireRole("RESTAURANT_ADMIN", "RECEPTION"), (c) => controller.payBill(c));
