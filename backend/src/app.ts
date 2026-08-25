import { Hono } from "hono";
import { cors } from "hono/cors";
import { secureHeaders } from "hono/secure-headers";
import { requestId } from "hono/request-id";
import { env } from "./config/env.js";
import { registerRoutes } from "./routes/index.js";
import { errorHandler } from "./middleware/error.middleware.js";
import { requestContextMiddleware } from "./middleware/request-context.middleware.js";
import { requestLoggerMiddleware } from "./middleware/request-logger.middleware.js";
import { serveStatic } from "@hono/node-server/serve-static";
import { AppError } from "./common/errors/app-error.js";

export const app = new Hono();

// 1. Generate a Hono-native request ID first (used as fallback by requestContextMiddleware)
app.use("*", requestId());

// 2. Security headers
app.use("*", secureHeaders());

// 3. CORS
app.use(
  "*",
  cors({
    origin: (origin) => {
      if (!origin) return env.CORS_ORIGIN;
      if (
        origin === env.CORS_ORIGIN ||
        origin.startsWith("http://localhost:") ||
        origin.startsWith("http://127.0.0.1:")
      ) {
        return origin;
      }
      return env.CORS_ORIGIN;
    },
    allowHeaders: ["Content-Type", "X-Restaurant-Id", "X-Request-ID", "Authorization"],
    allowMethods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    credentials: true,
    exposeHeaders: ["X-Request-ID"], // Allow client to read the requestId
  })
);

// 4. Request Context — attaches requestId to AsyncLocalStorage and response header.
//    This MUST run before any auth, logging, or business logic middleware.
app.use("*", requestContextMiddleware);

// 5. Request Logger — logs HTTP entry/exit with timing.
//    Runs after requestContextMiddleware so requestId is available.
app.use("*", requestLoggerMiddleware);

// 6. CSRF origin check for state-mutating requests
app.use("*", async (c, next) => {
  const method = c.req.method.toUpperCase();
  if (["GET", "HEAD", "OPTIONS"].includes(method)) {
    await next();
    return;
  }

  const origin = c.req.header("origin");
  const isAllowedOrigin =
    !origin ||
    origin === env.CORS_ORIGIN ||
    origin.startsWith("http://localhost:") ||
    origin.startsWith("http://127.0.0.1:");

  if (!isAllowedOrigin) {
    throw new AppError("Request origin is not allowed", 403, "CSRF_ORIGIN_FORBIDDEN");
  }

  await next();
});

// Static file serving for uploaded local images (/uploads/*)
app.use("/uploads/*", serveStatic({ root: "./public" }));

// Health check — does not require auth, returns basic database connectivity
app.get("/health", (c) =>
  c.json({
    status: "ok",
    timestamp: new Date().toISOString(),
    environment: env.NODE_ENV,
  })
);

registerRoutes(app);

app.onError(errorHandler);
