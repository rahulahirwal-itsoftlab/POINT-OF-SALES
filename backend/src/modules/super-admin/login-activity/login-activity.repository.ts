import { and, count, desc, eq, ilike, or, type SQL } from "drizzle-orm";
import { db } from "../../../config/database.js";
import { loginActivity, restaurants, superAdmins, admins, employees } from "../../../db/schema/index.js";
import type { ListLoginActivityQuery } from "./login-activity.types.js";

export class LoginActivityRepository {
  async list(query: ListLoginActivityQuery) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const offset = (page - 1) * limit;
    const filters = [
      query.status ? eq(loginActivity.status, query.status) : undefined,
      query.superAdminId ? eq(loginActivity.superAdminId, query.superAdminId) : undefined,
      query.adminId ? eq(loginActivity.adminId, query.adminId) : undefined,
      query.employeeId ? eq(loginActivity.employeeId, query.employeeId) : undefined,
      query.restaurantId ? eq(loginActivity.restaurantId, query.restaurantId) : undefined,
      query.search ? or(ilike(superAdmins.name, `%${query.search}%`), ilike(superAdmins.email, `%${query.search}%`), ilike(admins.fullName, `%${query.search}%`), ilike(admins.email, `%${query.search}%`), ilike(employees.fullName, `%${query.search}%`), ilike(employees.email, `%${query.search}%`)) : undefined,
    ].filter((filter): filter is SQL => Boolean(filter));
    const where = filters.length ? and(...filters) : undefined;

    const rows = await db
      .select({ activity: loginActivity, superAdmin: superAdmins, admin: admins, employee: employees, restaurant: restaurants })
      .from(loginActivity)
      .leftJoin(superAdmins, eq(loginActivity.superAdminId, superAdmins.id))
      .leftJoin(admins, eq(loginActivity.adminId, admins.id))
      .leftJoin(employees, eq(loginActivity.employeeId, employees.id))
      .leftJoin(restaurants, eq(loginActivity.restaurantId, restaurants.id))
      .where(where)
      .orderBy(desc(loginActivity.loginAt))
      .limit(limit)
      .offset(offset);
    const [total] = await db
      .select({ value: count() })
      .from(loginActivity)
      .leftJoin(superAdmins, eq(loginActivity.superAdminId, superAdmins.id))
      .leftJoin(admins, eq(loginActivity.adminId, admins.id))
      .leftJoin(employees, eq(loginActivity.employeeId, employees.id))
      .where(where);
    return { rows, total: total.value, page, limit };
  }

  async detail(id: string) {
    const [row] = await db
      .select({ activity: loginActivity, superAdmin: superAdmins, admin: admins, employee: employees, restaurant: restaurants })
      .from(loginActivity)
      .leftJoin(superAdmins, eq(loginActivity.superAdminId, superAdmins.id))
      .leftJoin(admins, eq(loginActivity.adminId, admins.id))
      .leftJoin(employees, eq(loginActivity.employeeId, employees.id))
      .leftJoin(restaurants, eq(loginActivity.restaurantId, restaurants.id))
      .where(eq(loginActivity.id, id));
    return row;
  }
}
