import { z } from "zod";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

if (typeof process.loadEnvFile === "function") {
  const envPaths = [
    path.resolve(process.cwd(), ".env"),
    path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../.env"),
  ];
  for (const envPath of envPaths) {
    if (!fs.existsSync(envPath)) continue;
    try {
      process.loadEnvFile(envPath);
    } catch {
      // Ignore if file doesn't exist or already loaded
    }
  }
}

const envSchema = z.object({
  DATABASE_URL: z.string().url(),
  SESSION_SECRET: z.string().min(16).default("dev_session_secret_pos_saas_2026_min32chars"),
  JWT_SECRET: z.string().min(16),
  JWT_REFRESH_SECRET: z.string().min(16),
  PORT: z.coerce.number().default(4000),
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  LOG_LEVEL: z.enum(["fatal", "error", "warn", "info", "debug", "trace"]).default("info"),
  SLOW_REQUEST_THRESHOLD_MS: z.coerce.number().positive().default(1000),
  SLOW_DB_QUERY_THRESHOLD_MS: z.coerce.number().positive().default(500),
  REDIS_URL: z.string().optional(),
  CORS_ORIGIN: z.string().default("http://localhost:3000"),
  DB_POOL_MAX: z.coerce.number().int().positive().default(5),
  DB_CONNECTION_TIMEOUT_MS: z.coerce.number().int().positive().default(15_000),
  DB_IDLE_TIMEOUT_MS: z.coerce.number().int().positive().default(10_000),
  SUPER_ADMIN_EMAIL: z.string().email().default("admin.pos@gmail.com"),
  SUPER_ADMIN_PASSWORD: z.string().min(8).default("Admin@1234"),
  SUPER_ADMIN_NAME: z.string().default("ITSOFTLAB Super Admin"),
  AUTH_SESSION_DAYS: z.coerce.number().int().positive().default(7),
  ADMIN_INVITATION_EXPIRY_HOURS: z.coerce.number().int().positive().default(24),
  CLOUDINARY_CLOUD_NAME: z.string().optional(),
  CLOUDINARY_API_KEY: z.string().optional(),
  CLOUDINARY_API_SECRET: z.string().optional(),
});

export const env = envSchema.parse(process.env);
