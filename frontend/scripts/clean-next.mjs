import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const nextDir = path.join(root, ".next");
const lockFile = path.join(root, ".next-dev.lock");

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
  if (!fs.existsSync(target)) return true;
  try {
    fs.rmSync(target, { recursive: true, force: true, maxRetries: 5, retryDelay: 250 });
    return true;
  } catch {
    return false;
  }
}

const activeLock = readLock();
if (activeLock && isProcessRunning(activeLock.pid)) {
  console.error(`Refusing to remove .next while Next dev is running (pid ${activeLock.pid}). Stop the dev server first.`);
  process.exit(1);
}

removeIfExists(lockFile);

for (const entry of fs.readdirSync(root)) {
  if (entry.startsWith(".next-corrupt-")) {
    removeIfExists(path.join(root, entry));
  }
}

if (!fs.existsSync(nextDir)) process.exit(0);

if (removeIfExists(nextDir)) process.exit(0);

const quarantine = path.join(root, `.next-corrupt-${Date.now()}`);
try {
  fs.renameSync(nextDir, quarantine);
  removeIfExists(quarantine);
} catch (error) {
  console.warn(`Unable to remove or quarantine ${nextDir}. Close any Explorer/editor windows using .next and retry if Next dev still reports cache errors.`);
  console.warn(error instanceof Error ? error.message : error);
}
