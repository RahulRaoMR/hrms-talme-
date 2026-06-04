export function apiUrl(path) {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  const shouldUseSameOrigin =
    typeof window !== "undefined" && ["hrms.talme.in", "www.hrms.talme.in"].includes(window.location.hostname);
  const baseUrl = shouldUseSameOrigin ? "" : normalizeApiBaseUrl(process.env.API_BASE_URL || process.env.NEXT_PUBLIC_API_URL);

  return baseUrl ? `${baseUrl}${normalizedPath}` : normalizedPath;
}

function normalizeApiBaseUrl(value) {
  const baseUrl = String(value || "").trim().replace(/^"|"$/g, "").replace(/\/$/, "");

  if (!baseUrl || baseUrl.includes("your-backend.onrender.com")) {
    return "";
  }

  return baseUrl;
}
