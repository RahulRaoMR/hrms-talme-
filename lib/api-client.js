import { getApiBaseFromEnv } from "@/lib/api-config";

export function apiUrl(path) {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  const shouldUseSameOrigin =
    typeof window !== "undefined" && ["hrms.talme.in", "www.hrms.talme.in"].includes(window.location.hostname);
  const baseUrl = shouldUseSameOrigin ? "" : getApiBaseFromEnv();

  return baseUrl ? `${baseUrl}${normalizedPath}` : normalizedPath;
}
