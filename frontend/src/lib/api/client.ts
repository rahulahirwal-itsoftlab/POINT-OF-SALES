/**
 * Centralized Frontend API Client
 *
 * All backend communication goes through this single Axios instance.
 * Responsibilities:
 * - Send HTTP-only cookies automatically (withCredentials)
 * - Capture X-Request-ID from responses for user-facing "Reference ID"
 * - Normalize backend errors into a consistent shape
 * - Handle 401 (session expired) → redirect to login
 * - Handle 403 LICENSE_ errors → redirect to subscription-required
 * - Avoid duplicate error handling logic in every component
 *
 * Frontend components should NEVER parse raw error shapes.
 * They should use the normalized error from this client.
 */

import axios, { type AxiosError, type InternalAxiosRequestConfig } from "axios";
import { isLogoutInProgress } from "@/lib/auth/session-state";
export { getImageUrl } from "@/lib/images/image-url";
import { frontendLogger } from "@/lib/logger";

export function getApiBaseUrl(): string {
  const rawUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api/v1";
  const trimmed = rawUrl.trim().replace(/\/+$/, "");
  if (trimmed.endsWith("/api/v1")) {
    return trimmed;
  }
  return `${trimmed}/api/v1`;
}

const defaultApiUrl = getApiBaseUrl();

export const apiClient = axios.create({
  baseURL: defaultApiUrl,
  withCredentials: true,
  timeout: 30_000,
});

const refreshClient = axios.create({
  baseURL: defaultApiUrl,
  withCredentials: true,
  timeout: 30_000,
});

type RetriableRequestConfig = InternalAxiosRequestConfig & {
  _retry?: boolean;
  _startedAt?: number;
};

export type NormalizedApiError = {
  code: string;
  message: string;
  requestId?: string;
  statusCode: number;
  details?: unknown;
};

/**
 * Extract a normalized error from an Axios response error.
 * This is the ONLY place where raw backend error shapes are parsed.
 */
export function extractApiError(error: unknown): NormalizedApiError {
  if (axios.isAxiosError(error)) {
    const axiosError = error as AxiosError<{
      error?: { code?: string; message?: string; requestId?: string; details?: unknown };
    }>;

    const statusCode = axiosError.response?.status ?? 0;
    const errorBody = axiosError.response?.data?.error;
    const requestId = axiosError.response?.headers?.["x-request-id"] as string | undefined;

    if (axiosError.code === "ECONNABORTED" || axiosError.code === "ERR_NETWORK") {
      return {
        code: "NETWORK_ERROR",
        message: "Unable to connect to the server. Please check your connection.",
        requestId,
        statusCode: 0,
      };
    }

    return {
      code: errorBody?.code ?? "UNKNOWN_ERROR",
      message: errorBody?.message ?? "An unexpected error occurred. Please try again.",
      requestId: errorBody?.requestId ?? requestId,
      statusCode,
      details: errorBody?.details,
    };
  }

  return {
    code: "CLIENT_ERROR",
    message: "An unexpected error occurred. Please try again.",
    statusCode: 0,
  };
}

apiClient.interceptors.request.use((config) => {
  const url = config.url ?? "";
  const isAuthRequest = url.includes("/auth/login") || url.includes("/auth/logout") || url.includes("/auth/refresh");
  if (isLogoutInProgress() && !isAuthRequest) {
    throw new axios.CanceledError("Request cancelled during logout");
  }
  (config as RetriableRequestConfig)._startedAt = Date.now();
  return config;
});

// Response interceptor — runs on every response
apiClient.interceptors.response.use(
  (response) => {
    // Capture requestId from header for successful responses too
    const requestId = response.headers["x-request-id"] as string | undefined;
    if (requestId) {
      response.data._requestId = requestId; 
    }
    if (process.env.NODE_ENV === "development") {
      const startedAt = (response.config as RetriableRequestConfig)._startedAt;
      frontendLogger.debug(
        {
          method: response.config.method?.toUpperCase(),
          url: response.config.url,
          status: response.status,
          durationMs: startedAt ? Date.now() - startedAt : undefined,
          requestId,
        },
        "API request completed",
      );
    }
    return response;
  },
  async (error: AxiosError) => {
    if (axios.isCancel(error)) {
      return Promise.reject(error);
    }

    const normalized = extractApiError(error);
    const statusCode = normalized.statusCode;
    const originalRequest = error.config as RetriableRequestConfig | undefined;
    const durationMs = originalRequest?._startedAt ? Date.now() - originalRequest._startedAt : undefined;

    frontendLogger.warn(
      {
        requestId: normalized.requestId,
        statusCode,
        errorCode: normalized.code,
        endpoint: error.config?.url,
        method: error.config?.method?.toUpperCase(),
        durationMs,
      },
      `API Error: ${normalized.code} — ${normalized.message}`
    );

    // 401: Session expired — redirect to login
    if (
      statusCode === 401 &&
      originalRequest &&
      !originalRequest._retry &&
      !isLogoutInProgress() &&
      !originalRequest.url?.includes("/auth/login") &&
      !originalRequest.url?.includes("/auth/refresh")
    ) {
      try {
        originalRequest._retry = true;
        await refreshClient.post("/auth/refresh");
        return apiClient.request(originalRequest);
      } catch {
        // Continue to the login redirect below.
      }
    }

    if (statusCode === 401 && typeof window !== "undefined" && !isLogoutInProgress()) {
      // Don't redirect on the login page itself
      if (!window.location.pathname.includes("/login")) {
        const next = `${window.location.pathname}${window.location.search}`;
        window.location.href = `/login?reason=session_expired&next=${encodeURIComponent(next)}`;
      }
    }

    // 403 with LICENSE_ code: redirect to subscription required page
    if (statusCode === 403 && normalized.code.startsWith("LICENSE_")) {
      if (typeof window !== "undefined") {
        window.location.href = `/subscription-required?reason=${normalized.code}&ref=${normalized.requestId ?? ""}`;
      }
    }

    return Promise.reject(error);
  }
);
