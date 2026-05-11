"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { apiUrl } from "@/lib/api-client";
import { saveSuiteSession } from "@/lib/auth-session";

const roleOptions = {
  admin: {
    label: "Enterprise Admin",
    identifierLabel: "Corporate Email",
    identifier: "director@talme.ai",
    password: "",
    destination: "/dashboard"
  },
  hr: {
    label: "HR",
    identifierLabel: "Corporate Email",
    identifier: "hr@talme.ai",
    password: "",
    destination: "/dashboard"
  },
  employee: {
    label: "Employee",
    identifierLabel: "Employee ID",
    identifier: "",
    password: "",
    destination: "/employee-app"
  }
};

export default function LoginPageClient() {
  const router = useRouter();
  const [formState, setFormState] = useState({
    identifier: roleOptions.admin.identifier,
    password: roleOptions.admin.password,
    role: "admin"
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const selectedRole = roleOptions[formState.role];
  const selectedCredentials = {
    email: formState.identifier,
    password: formState.password,
    destination: selectedRole.destination
  };

  return (
    <main className="landing-body">
      <section className="landing-shell">
        <article className="landing-card">
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
                  throw new Error(formState.role === "employee" ? "Enter Employee ID." : "Enter corporate email.");
                }

                if (!selectedCredentials.password.trim()) {
                  throw new Error("Enter your password.");
                }

                const response = await fetch(apiUrl("/api/auth/login"), {
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

                saveSuiteSession({
                  token: payload.token,
                  user: payload.user,
                  destination: selectedCredentials.destination
                });
                router.push(selectedCredentials.destination);
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
                    const nextConfig = roleOptions[nextRole];
                    setFormState({
                      identifier: nextConfig.identifier,
                      password: nextConfig.password,
                      role: nextRole
                    });
                  }}
                >
                  <option value="admin">Enterprise Admin</option>
                  <option value="hr">HR</option>
                  <option value="employee">Employee</option>
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
                  value={formState.password}
                  onChange={(event) =>
                    setFormState((current) => ({ ...current, password: event.target.value }))
                  }
                />
              </label>
            </div>

            <div className="landing-actions">
              <button className="primary-button" disabled={submitting} type="submit">
                {submitting ? "Signing In..." : "Enter Suite"}
              </button>
            </div>
          </form>

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
