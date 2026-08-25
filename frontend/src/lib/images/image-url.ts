const defaultApiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api/v1";

function backendOrigin() {
  return defaultApiUrl.replace(/\/api\/v1\/?$/, "");
}

export function getImageUrl(url?: string | null): string {
  const value = url?.trim();
  if (!value) return "";
  if (/^(https?:|blob:|data:)/i.test(value)) return value;
  return `${backendOrigin()}${value.startsWith("/") ? "" : "/"}${value}`;
}
