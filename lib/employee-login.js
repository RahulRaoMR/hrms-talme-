import { apiUrl } from "@/lib/api-client";

async function requestLogin(employeeId, password, role) {
  const path = "/api/auth/login";
  const endpoint = apiUrl(path);
  const options = {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: employeeId, password, role })
  };
  if (endpoint !== path) {
    try {
      const response = await fetch(endpoint, options);
      if (response.status < 500 && ![404, 405].includes(response.status)) return response;
    } catch {}
  }
  return fetch(path, options);
}

export async function signInEmployee(employeeId, password) {
  const response = await requestLogin(employeeId, password, "employee");
  // Older deployed APIs still distinguish these two employee account roles.
  return response.status === 401 ? requestLogin(employeeId, password, "employeeHrms") : response;
}
