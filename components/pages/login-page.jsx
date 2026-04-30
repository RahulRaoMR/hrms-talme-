"use client";

import { useState } from "react";
import { signIn, signOut } from "next-auth/react";
import { useRouter } from "next/navigation";

const roleOptions = {
  admin: {
    label: "Enterprise Admin",
    identifierLabel: "Corporate Email",
    identifier: "director@talme.ai",
    password: "talme123",
    destination: "/dashboard"
  },
  employee: {
    label: "Employee",
    identifierLabel: "Employee ID",
    identifier: "TLM-2048",
    password: "employee123",
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
                await signOut({ redirect: false });

                const result = await signIn("credentials", {
                  email: formState.identifier,
                  password: formState.password,
                  redirect: false
                });

                if (result?.error) {
                  throw new Error(result.error);
                }

                router.replace(selectedRole.destination);
                router.refresh();
              } catch {
                setError("Unable to sign in. Please retry.");
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
              <button
                className="ghost-button"
                onClick={async () => {
                  setSubmitting(true);
                  setError("");

                  try {
                    await signOut({ redirect: false });

                    const result = await signIn("credentials", {
                      email: "director@talme.ai",
                      password: "talme123",
                      redirect: false
                    });

                    if (result?.error) {
                      throw new Error(result.error);
                    }

                    router.replace("/dashboard");
                    router.refresh();
                  } catch {
                    setError("Unable to open demo access. Please retry.");
                  } finally {
                    setSubmitting(false);
                  }
                }}
                type="button"
              >
                Admin Access
              </button>
              <button
                className="ghost-button"
                onClick={async () => {
                  setSubmitting(true);
                  setError("");

                  try {
                    await signOut({ redirect: false });

                    const result = await signIn("credentials", {
                      email: "TLM-2048",
                      password: "employee123",
                      redirect: false
                    });

                    if (result?.error) {
                      throw new Error(result.error);
                    }

                    router.replace("/employee-app");
                    router.refresh();
                  } catch {
                    setError("Unable to open employee access. Please retry.");
                  } finally {
                    setSubmitting(false);
                  }
                }}
                type="button"
              >
                Employee Access
              </button>
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
