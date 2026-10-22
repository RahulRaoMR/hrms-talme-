import { apiUrl } from "@/lib/api-client";

async function requestLogin(employeeId, password, role, options = {}) {
  const path = "/api/auth/login";
  const endpoint = options.sameOrigin ? path : apiUrl(path);
  const request = {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: employeeId, password, role })
  };
  if (endpoint !== path) {
    try {
      const response = await fetch(endpoint, request);
      if (response.status < 500 && ![404, 405].includes(response.status)) return response;
    } catch {}
  }
  return fetch(path, request);
}

export async function signInEmployee(employeeId, password, options) {
  const response = await requestLogin(employeeId, password, "employee", options);
  // Older deployed APIs still distinguish these two employee account roles.
  return response.status === 401 ? requestLogin(employeeId, password, "employeeHrms", options) : response;
}
