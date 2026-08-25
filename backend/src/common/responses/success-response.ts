export function successResponse<T>(data: T, message = "Success", meta?: Record<string, unknown>) {
  return {
    success: true,
    message,
    data,
    meta,
  };
}
