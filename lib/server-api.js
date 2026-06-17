function normalizeBaseUrl(value) {
  const baseUrl = String(value || "").trim().replace(/^"|"$/g, "").replace(/\/$/, "");

  if (!baseUrl || baseUrl.includes("your-backend.onrender.com")) {
    return "";
  }

  return baseUrl;
}

export function getConfiguredApiBase(request) {
  const configuredBase = normalizeBaseUrl(process.env.API_BASE_URL || process.env.NEXT_PUBLIC_API_URL);
  const baseUrl = configuredBase;

  if (!baseUrl) return "";

  const requestOrigin = request?.url ? new URL(request.url).origin : "";

  return requestOrigin && baseUrl === requestOrigin ? "" : baseUrl;
}

export async function fetchServerApiJson(path, options = {}) {
  const baseUrl = getConfiguredApiBase();

  if (!baseUrl) return null;

  let response;

  try {
    response = await fetch(`${baseUrl}${path}`, {
      cache: "no-store",
      ...options,
      headers: {
        accept: "application/json",
        ...options.headers
      }
    });
  } catch (error) {
    console.warn(`Configured backend API is unreachable for ${path}. Falling back to local data.`, error);
    return null;
  }

  if (!response.ok) {
    throw new Error(`Backend API request failed with ${response.status}`);
  }

  return response.json();
}

export async function proxyToConfiguredApi(request, path) {
  const baseUrl = getConfiguredApiBase(request);

  if (!baseUrl) return null;

  const headers = new Headers(request.headers);
  headers.delete("host");
  headers.delete("connection");
  headers.delete("content-length");
  headers.delete("expect");
  headers.delete("transfer-encoding");

  const method = request.method || "GET";
  const body = method === "GET" || method === "HEAD" ? undefined : await request.clone().text();
  let response;

  try {
    response = await fetch(`${baseUrl}${path}`, {
      method,
      headers,
      body,
      redirect: "manual"
    });
  } catch (error) {
    console.warn(`Configured backend API is unreachable for ${path}. Falling back to local handler.`, error);
    return null;
  }

  const responseHeaders = new Headers(response.headers);
  responseHeaders.delete("content-encoding");
  responseHeaders.delete("content-length");

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: responseHeaders
  });
}
