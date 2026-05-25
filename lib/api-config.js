export const DEFAULT_PRODUCTION_API_URL = "https://talme-hrms-backend.onrender.com";

export function normalizeApiBaseUrl(value) {
  const baseUrl = String(value || "").trim().replace(/^"|"$/g, "").replace(/\/$/, "");

  if (!baseUrl || baseUrl.includes("your-backend.onrender.com")) {
    return "";
  }

  return baseUrl;
}

export function getApiBaseFromEnv() {
  return (
    normalizeApiBaseUrl(process.env.API_BASE_URL) ||
    normalizeApiBaseUrl(process.env.NEXT_PUBLIC_API_URL) ||
    (process.env.NODE_ENV === "production" ? DEFAULT_PRODUCTION_API_URL : "")
  );
}
