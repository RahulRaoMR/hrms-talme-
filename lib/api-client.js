import { getApiBaseFromEnv } from "@/lib/api-config";

export function apiUrl(path) {
  const baseUrl = getApiBaseFromEnv();
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;

  return baseUrl ? `${baseUrl}${normalizedPath}` : normalizedPath;
}
