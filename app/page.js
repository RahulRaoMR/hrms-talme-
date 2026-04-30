"use client";

import { signIn, signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useState } from "react";

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

export default function LandingPage() {
  const router = useRouter();
  const [formState, setFormState] = useState({
    identifier: roleOptions.admin.identifier,
    password: roleOptions.admin.password,
    role: "admin"
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const selectedRole = roleOptions[formState.role];

  async function enterSuite() {
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
      setError("Unable to sign in. Please check the selected role and ID.");
    } finally {
      setSubmitting(false);
    }
  }

  async function openAccess(email, password, destination) {
    setSubmitting(true);
    setError("");

    try {
      await signOut({ redirect: false });

      const result = await signIn("credentials", {
        email,
        password,
        redirect: false
      });

      if (result?.error) {
        throw new Error(result.error);
      }

      router.replace(destination);
      router.refresh();
    } catch {
      setError("Unable to open access. Please retry.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="landing-body">
      <section className="landing-shell">
        <article className="landing-card">
          <div className="landing-badge">Luxury Workforce Intelligence</div>
          <h1>Talme HRMS</h1>
          <p>
            Premium ATS, HRMS, VMS, payroll, payroll tax, attendance, vendor
            registration, invoices, communication, and salary payment in one
            corporate suite built with Next.js.
          </p>

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
          </div>

          <div className="landing-actions">
            <label className="landing-password-field">
              <span>Password</span>
              <input
                type="password"
                value={formState.password}
                onChange={(event) =>
                  setFormState((current) => ({ ...current, password: event.target.value }))
                }
              />
            </label>
            <button
              className="ghost-button"
              disabled={submitting}
              onClick={() => openAccess("director@talme.ai", "talme123", "/dashboard")}
              type="button"
            >
              Admin Access
            </button>
            <button
              className="ghost-button"
              disabled={submitting}
              onClick={() => openAccess("TLM-2048", "employee123", "/employee-app")}
              type="button"
            >
              Employee Access
            </button>
            <button className="primary-button" disabled={submitting} onClick={enterSuite} type="button">
              {submitting ? "Opening..." : "Enter Suite"}
            </button>
          </div>
          {error ? <p className="form-error">{error}</p> : null}

          <div className="landing-modules">
            <span>ATS</span>
            <span>Employee Lifecycle</span>
            <span>Attendance &amp; T&amp;A</span>
            <span>Performance</span>
            <span>Payroll &amp; Tax</span>
            <span>VMS</span>
            <span>Invoice &amp; Payment</span>
            <span>Notifications</span>
          </div>
        </article>
      </section>
    </main>
  );
}
