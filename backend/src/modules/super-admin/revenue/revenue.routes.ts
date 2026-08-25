import { Hono } from "hono";
import { RevenueController } from "./revenue.controller.js";

export const revenueRoutes = new Hono();
const controller = new RevenueController();

revenueRoutes.get("/", (c) => controller.overview(c));
revenueRoutes.get("/monthly", (c) => controller.monthly(c));
revenueRoutes.get("/yearly", (c) => controller.yearly(c));
