import { appConfig } from "../../config/app-config.js";

export type PaginationQuery = {
  page?: number;
  limit?: number;
  search?: string;
  sort?: string;
};

export function normalizePagination(query: PaginationQuery) {
  const page = Math.max(Number(query.page ?? 1), 1);
  const rawLimit = Math.max(Number(query.limit ?? appConfig.defaultPageSize), 1);
  const limit = Math.min(rawLimit, appConfig.maxPageSize);
  const offset = (page - 1) * limit;

  return { page, limit, offset, search: query.search, sort: query.sort };
}
