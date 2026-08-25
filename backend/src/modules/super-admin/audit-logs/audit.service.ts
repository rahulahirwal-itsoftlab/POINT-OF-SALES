import { AppError } from "../../../common/errors/app-error.js";
import { AuditRepository } from "./audit.repository.js";
import type { ListAuditLogsQuery } from "./audit.types.js";

export class AuditService {
  private readonly repository = new AuditRepository();

  list(query: ListAuditLogsQuery) {
    return this.repository.list(query);
  }

  async detail(id: string) {
    const audit = await this.repository.detail(id);
    if (!audit) throw new AppError("Audit log not found", 404, "AUDIT_LOG_NOT_FOUND");
    return audit;
  }

  listDistinctActions() {
    return this.repository.listDistinctActions();
  }

  listDistinctModules() {
    return this.repository.listDistinctModules();
  }
}
