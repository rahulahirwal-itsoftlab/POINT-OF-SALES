/**
 * AUDIT SERVICE
 *
 * Records BUSINESS/SECURITY events to the `audit_logs` table.
 * This is NOT the application logger — see common/logger/logger.ts for that.
 *
 * Key design decisions:
 * - requestId is automatically pulled from AsyncLocalStorage if not provided
 * - Errors are fire-and-forget: a failed audit write NEVER breaks the main request
 * - Sensitive fields must be pre-sanitized by callers (never log passwords, tokens, etc.)
 */

import { auditLogs } from "../../db/schema/index.js";
import type { Database } from "../../config/database.js";
import { db as defaultDb } from "../../config/database.js";
import { getLoggerContext } from "../logger/logger.context.js";
import { logger } from "../logger/logger.js";
import type { AuditEventInput } from "./audit.types.js";

export class AuditService {
  constructor(private readonly database: Database = defaultDb) {}

  /**
   * Record a business/security audit event.
   *
   * - requestId is auto-populated from AsyncLocalStorage context if not provided
   * - This method NEVER throws — a failed audit write is logged but does not
   *   interrupt the calling business operation
   */
  async record(input: AuditEventInput): Promise<void> {
    const context = getLoggerContext();

    // Auto-populate requestId from AsyncLocalStorage if caller didn't provide it
    const requestId = input.requestId ?? context?.requestId ?? undefined;

    try {
      await this.database.insert(auditLogs).values({
        restaurantId: input.restaurantId ?? undefined,
        actorSuperAdminId: input.actorSuperAdminId ?? undefined,
        actorAdminId: input.actorAdminId ?? undefined,
        actorEmployeeId: input.actorEmployeeId ?? undefined,
        actorRole: input.actorRole,
        module: input.module ?? undefined,
        action: input.action,
        description: input.description ?? undefined,
        entityType: input.entityType,
        entityId: input.entityId ?? undefined,
        entityPublicId: input.entityPublicId ?? undefined,
        adminId: input.adminId ?? undefined,
        subscriptionId: input.subscriptionId ?? undefined,
        licenseId: input.licenseId ?? undefined,
        ipAddress: input.ipAddress ?? undefined,
        userAgent: input.userAgent ?? undefined,
        oldValues: input.oldValues ?? undefined,
        newValues: input.newValues ?? undefined,
        metadata: input.metadata ?? undefined,
      });
    } catch (err) {
      // Audit failures must NEVER break business operations — log and continue
      logger.error(
        { err, action: input.action, entityType: input.entityType, requestId },
        "Failed to write audit log record"
      );
    }
  }

  /**
   * Fire-and-forget version for use in non-async contexts.
   * Errors are silently swallowed after logging.
   */
  recordAsync(input: AuditEventInput): void {
    this.record(input).catch(() => {
      // Already handled inside record()
    });
  }
}

/** Singleton instance for use across the application */
export const auditService = new AuditService();
