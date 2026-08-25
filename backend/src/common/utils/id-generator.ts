import { randomBytes } from "node:crypto";

export function createPublicId(prefix: string) {
  const token = randomBytes(6).toString("hex").toUpperCase();
  return `${prefix}-${token}`;
}

export function createLicenseKey() {
  const segments = Array.from({ length: 3 }, () => randomBytes(2).toString("hex").toUpperCase());
  return `POS-${segments.join("-")}`;
}

export function createYearSequence(prefix: string, sequence: number, date = new Date()) {
  return `${prefix}-${date.getFullYear()}-${String(sequence).padStart(6, "0")}`;
}
