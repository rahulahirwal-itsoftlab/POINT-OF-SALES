import { AsyncLocalStorage } from "node:async_hooks";

export interface LogContext {
  requestId?: string;
  principalId?: string;
  role?: string;
  organizationId?: string;
  restaurantId?: string;
  module?: string;
}

export const loggerContext = new AsyncLocalStorage<LogContext>();

export function getLoggerContext(): LogContext | undefined {
  return loggerContext.getStore();
}

export function runWithLoggerContext<T>(context: LogContext, fn: () => T): T {
  return loggerContext.run(context, fn); 
}
