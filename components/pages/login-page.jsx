"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { apiUrl } from "@/lib/api-client";
import { saveSuiteSession } from "@/lib/auth-session";
import PasswordResetForm from "@/components/password-reset-form";
import { canAccess } from "@/lib/permissions";

const roleOptions = {
  admin: {
    label: "Super Admin",
    identifierLabel: "Corporate Email",
    identifier: "",
    password: "",
    destination: "/dashboard"
  },
  payrollAts: {
    label: "Payroll + ATS",
    identifierLabel: "Corporate Email",
    identifier: "",
    password: "",
    destination: "/payroll"
  },
  invoice: {
    label: "Accounts",
    identifierLabel: "Corporate Email",
    identifier: "",
    password: "",
    destination: "/invoices"
  },
  ats: {
    label: "ATS",
    identifierLabel: "Corporate Email",
    identifier: "",
    password: "",
    destination: "/ats"
  }
};

async function fetchWithLocalFallback(path, options) {
  const endpointUrl = apiUrl(path);

  if (endpointUrl === path) {
    return fetch(path, options);
  }

  try {
    const response = await fetch(endpointUrl, options);

    if (response.status < 500 && ![404, 405].includes(response.status)) {
      return response;
    }
  } catch {}

  return fetch(path, options);
}

export default function LoginPageClient() {
  const router = useRouter();
  const [formState, setFormState] = useState({
    identifier: roleOptions.admin.identifier,
    password: roleOptions.admin.password,
    role: "admin"
  });
  const [resetOpen, setResetOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const selectedRole = roleOptions[formState.role];
  const selectedCredentials = {
    email: formState.identifier,
    password: formState.password,
    destination: selectedRole.destination
  };

  return (
    <main className="landing-body login-body">
      <section className="landing-shell">
        <article className="landing-card login-card">
          <div className="login-brand">
            <img src="/talme-logo.png" alt="Talme Technologies" />
            <div>
              <strong>Talme</strong>
              <span>HRMS Suite</span>
            </div>
          </div>
          <div className="landing-badge">Secure Enterprise Access</div>
          <h1>Talme Login</h1>
          <p>
            Enter the premium ATS, HRMS, VMS, payroll, invoice, and notification suite
            through a corporate access flow backed by mock API routes and session state.
          </p>

          <form
            onSubmit={async (event) => {
              event.preventDefault();
              setSubmitting(true);
              setError("");

              try {
                if (!selectedCredentials.email.trim()) {
                  throw new Error("Enter corporate email.");
                }

                if (!selectedCredentials.password.trim()) {
                  throw new Error("Enter your password.");
                }

                const response = await fetchWithLocalFallback("/api/auth/login", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    email: selectedCredentials.email,
                    password: selectedCredentials.password,
                    role: formState.role
                  })
                });
                const payload = await response.json().catch(() => ({
                  error: "Login service is not available. Check the backend API URL and try again."
                }));

                if (!response.ok) {
                  throw new Error(payload?.error || "Invalid email or password.");
                }

                const returnToInvoices = new URLSearchParams(window.location.search).get("next") === "/invoices" && canAccess(payload.user?.role, "/invoices");
                const loginDestination = returnToInvoices ? "/invoices" : selectedCredentials.destination;
                saveSuiteSession({
                  token: payload.token,
                  user: payload.user,
                  destination: loginDestination
                });
                router.push(loginDestination);
                router.refresh();
              } catch (loginError) {
                setError(loginError.message || "Unable to sign in. Please retry.");
              } finally {
                setSubmitting(false);
              }
            }}
          >
            <div className="landing-grid">
              <label>
                <span>Access Role</span>
                <select
                  value={formState.role}
                  onChange={(event) => {
                    const nextRole = event.target.value;
                    if (nextRole === "employeeHrms") {
                      router.push("/employee-app/login");
                      return;
                    }
                    const nextConfig = roleOptions[nextRole];
                    setResetOpen(false);
                    setFormState({
                      identifier: nextConfig.identifier,
                      password: nextConfig.password,
                      role: nextRole
                    });
                  }}
                >
                  <option value="admin">Super Admin</option>
                  <option value="payrollAts">Payroll + ATS</option>
                  <option value="invoice">Accounts</option>
                  <option value="ats">ATS</option>
                  <option value="employeeHrms">Employee Attendance</option>
                </select>
              </label>
              <label>
                <span>{selectedRole.identifierLabel}</span>
                <input
                  value={formState.identifier}
                  onChange={(event) =>
                    setFormState((current) => ({ ...current, identifier: event.target.value }))
                  }
                />
              </label>
              <label>
                <span>Password</span>
                <input
                  type="password"
                  aria-label="Password"
                  value={formState.password}
                  onChange={(event) =>
                    setFormState((current) => ({ ...current, password: event.target.value }))
                  }
                />
                <button className="forgot-password-button" onClick={() => setResetOpen(true)} type="button">
                  Forgot Password?
                </button>
              </label>
            </div>

            <div className="landing-actions">
              <button className="primary-button" disabled={submitting} type="submit">
                {submitting ? "Signing In..." : "Enter Suite"}
              </button>
            </div>
          </form>

          {resetOpen ? (
            <PasswordResetForm
              role={formState.role}
              initialIdentifier={formState.identifier}
              onClose={() => setResetOpen(false)}
              onComplete={({ identifier, password }) => setFormState((current) => ({ ...current, identifier, password }))}
            />
          ) : null}

          {error ? <p className="form-error">{error}</p> : null}

          <div className="landing-modules">
            <span>Role-aware entry</span>
            <span>Mock auth API</span>
            <span>Protected suite pages</span>
            <span>Local session persistence</span>
          </div>
        </article>
      </section>
    </main>
  );
}
