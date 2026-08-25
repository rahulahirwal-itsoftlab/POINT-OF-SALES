import { getApiBaseUrl } from "@/lib/api/client";

function backendOrigin() {
  return getApiBaseUrl().replace(/\/api\/v1\/?$/, "");
}

export function getImageUrl(url?: string | null): string {
  const value = url?.trim();
  if (!value) return "";
  if (/^(https?:|blob:|data:)/i.test(value)) return value;
  return `${backendOrigin()}${value.startsWith("/") ? "" : "/"}${value}`;
}
