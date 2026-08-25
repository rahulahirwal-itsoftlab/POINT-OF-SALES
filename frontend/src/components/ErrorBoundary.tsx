"use client";

import React, { Component, type ReactNode, type ErrorInfo } from "react";
import { frontendLogger } from "@/lib/logger";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  errorCode?: string;
  requestId?: string;
}

/**
 * Global React Error Boundary
 *
 * Catches unexpected rendering errors that bypass component try/catch.
 * Provides a safe, user-friendly fallback UI with a correlation ID.
 *
 * Design rules:
 * - Never exposes stack traces, SQL errors, or technical details to users
 * - Logs the full error internally (to browser console / future log endpoint)
 * - Shows "Reference ID" if available for support/debugging
 * - Provides retry (remount) and reload options
 */
export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Extract requestId if attached to window by the API client
    const requestId =
      typeof window !== "undefined"
        ? (window as unknown as Record<string, string>)["__lastRequestId"]
        : undefined;

    frontendLogger.error(
      {
        component: errorInfo.componentStack?.split("\n")[1]?.trim() ?? "Unknown",
        requestId,
        errorCode: "RENDER_ERROR",
        route: typeof window !== "undefined" ? window.location.pathname : undefined,
      },
      `Rendering error: ${error.message}`
    );

    this.setState({ hasError: true, requestId });
  }

  handleRetry = () => {
    this.setState({ hasError: false, requestId: undefined });
  };

  handleReload = () => {
    if (typeof window !== "undefined") {
      window.location.reload();
    }
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="flex min-h-[60vh] flex-col items-center justify-center p-8 text-center">
          <div className="max-w-md rounded-xl border border-red-100 bg-red-50 p-8 shadow-sm">
            <div className="mb-4 text-5xl">⚠️</div>
            <h2 className="mb-2 text-xl font-semibold text-gray-900">
              Something went wrong
            </h2>
            <p className="mb-6 text-sm text-gray-600">
              An unexpected error occurred while displaying this page. Our team
              has been notified.
            </p>

            {this.state.requestId && (
              <p className="mb-6 rounded-lg bg-gray-100 px-3 py-2 font-mono text-xs text-gray-500">
                Reference ID: {this.state.requestId}
              </p>
            )}

            <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
              <button
                onClick={this.handleRetry}
                className="rounded-lg bg-blue-600 px-5 py-2 text-sm font-medium text-white hover:bg-blue-700 transition-colors"
              >
                Try Again
              </button>
              <button
                onClick={this.handleReload}
                className="rounded-lg border border-gray-300 bg-white px-5 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Reload Page
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
