import { serve } from "@hono/node-server";
import { app } from "./app.js";
import { env } from "./config/env.js";
import { logger } from "./common/logger/logger.js";
import { pool } from "./config/database.js";

async function startServer() {
  try {
    // Mandatory database connectivity check
    await pool.query("SELECT 1");
    logger.info("Database connected successfully.");
  } catch (error) {
    logger.fatal(
      { error: error instanceof Error ? error.message : "Unknown error" },
      "Startup failed: Database is unreachable or configuration is invalid.",
    );
    process.exit(1);
  }

  const server = serve(
    {
      fetch: app.fetch,
      port: env.PORT,
      hostname: "0.0.0.0",
    },
    (info) => {
      logger.info({ port: info.port, address: info.address }, `Backend API listening at http://${info.address}:${info.port}`);
    },
  );

  server.on("error", (err: unknown) => {
    if (typeof err === "object" && err !== null && "code" in err && (err as { code: string }).code === "EADDRINUSE") {
      logger.error(
        `Port ${env.PORT} is already in use by another process. Use 'npx kill-port ${env.PORT}' or stop the existing node process to free the port.`,
      );
      process.exit(1);
    }
    logger.error({ err }, "Server error occurred");
  });
}

startServer();

