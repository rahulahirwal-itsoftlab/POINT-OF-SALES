import fs from "node:fs";
import path from "node:path";
import { spawn } from "node:child_process";
import { createRequire } from "node:module";

const root = process.cwd();
const lockFile = path.join(root, ".next-dev.lock");
const nextDir = path.join(root, ".next");
const shouldClean = process.argv.includes("--clean");

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
  fs.rmSync(target, { recursive: true, force: true, maxRetries: 5, retryDelay: 250 });
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
