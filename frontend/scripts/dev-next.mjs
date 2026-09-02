import fs from "node:fs";
import path from "node:path";
import { spawn } from "node:child_process";
import { createRequire } from "node:module";

const root = process.cwd();
const lockFile = path.join(root, ".next-dev.lock");
const nextDir = path.join(root, ".next");
const routesManifest = path.join(nextDir, "routes-manifest.json");
const buildIdFile = path.join(nextDir, "BUILD_ID");

// Clean stale build artifacts if switching from build mode to dev mode or if manifests are missing
const isBuildArtifact = fs.existsSync(buildIdFile) || (fs.existsSync(nextDir) && !fs.existsSync(routesManifest));
const shouldClean = process.argv.includes("--clean") || isBuildArtifact;

function readLock() {
  if (!fs.existsSync(lockFile)) return null;

  try {
    const lock = JSON.parse(fs.readFileSync(lockFile, "utf8"));
    return Number.isInteger(lock.pid) ? lock : null;
  } catch {
    return null;
  }
}

function isProcessRunning(pid) {
  try {
    process.kill(pid, 0);
    return true;
  } catch (error) {
    return error?.code === "EPERM";
  }
}

function removeIfExists(target) {
  if (!fs.existsSync(target)) return;
  try {
    fs.rmSync(target, { recursive: true, force: true, maxRetries: 5, retryDelay: 250 });
  } catch {
    // Ignore lock errors
  }
}

const existingLock = readLock();
if (existingLock && isProcessRunning(existingLock.pid)) {
  console.error(
    `Next dev already appears to be running for this frontend (pid ${existingLock.pid}). Stop it before starting another dev server.`,
  );
  process.exit(1);
}

removeIfExists(lockFile);

if (shouldClean) {
  removeIfExists(nextDir);
  for (const entry of fs.readdirSync(root)) {
    if (entry.startsWith(".next-corrupt-")) {
      removeIfExists(path.join(root, entry));
    }
  }
}

fs.writeFileSync(
  lockFile,
  JSON.stringify({ pid: process.pid, startedAt: new Date().toISOString() }, null, 2),
);

const require = createRequire(import.meta.url);
const nextBin = require.resolve("next/dist/bin/next");
const child = spawn(process.execPath, [nextBin, "dev"], {
  cwd: root,
  env: process.env,
  stdio: "inherit",
});

function cleanup() {
  const lock = readLock();
  if (lock?.pid === process.pid) removeIfExists(lockFile);
}

child.on("exit", (code, signal) => {
  cleanup();
  process.exit(code ?? (signal ? 1 : 0));
});

process.on("SIGINT", () => {
  child.kill("SIGINT");
});

process.on("SIGTERM", () => {
  child.kill("SIGTERM");
});

process.on("exit", cleanup);
