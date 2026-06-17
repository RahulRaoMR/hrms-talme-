"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { apiUrl } from "@/lib/api-client";
import { saveSuiteSession } from "@/lib/auth-session";

const roleOptions = {
  admin: {
    label: "Enterprise Admin",
    identifierLabel: "Corporate Email",
    identifier: "saidarshaan@talme.in",
    password: "",
    destination: "/dashboard"
  },
  payrollAts: {
    label: "Payroll + ATS",
    identifierLabel: "Corporate Email",
    identifier: "Nandhini@talme.in",
    password: "",
    destination: "/payroll"
  },
  invoice: {
    label: "Invoice",
    identifierLabel: "Corporate Email",
    identifier: "accounts@talme.in",
    password: "",
    destination: "/invoices"
  },
  ats: {
    label: "ATS",
    identifierLabel: "Corporate Email",
    identifier: "Harshitha@talme.in",
    password: "",
    destination: "/ats"
  },
  hr: {
    label: "HR",
    identifierLabel: "Corporate Email",
    identifier: "hr@talme.ai",
    password: "",
    destination: "/dashboard"
  },
  employeeHrms: {
    label: "Employee Attendance",
    identifierLabel: "Employee ID",
    identifier: "",
    password: "",
    destination: "/employee-app"
  },
  payroll: {
    label: "Payroll",
    identifierLabel: "Corporate Email",
    identifier: "",
    password: "",
    destination: "/payroll"
  },
  employee: {
    label: "Employee",
    identifierLabel: "Employee ID",
    identifier: "",
    password: "",
    destination: "/employee-app"
  }
};
const employeeSessionKey = "talme-employee-app-employee-id";

async function fetchWithLocalFallback(path, options) {
  const endpointUrl = apiUrl(path);

  try {
    return await fetch(endpointUrl, options);
  } catch (error) {
    if (endpointUrl === path) {
      throw error;
    }

    return fetch(path, options);
  }
}

export default function LoginPageClient() {
  const router = useRouter();
  const [formState, setFormState] = useState({
    identifier: roleOptions.admin.identifier,
    password: roleOptions.admin.password,
    role: "admin"
  });
  const [resetForm, setResetForm] = useState({
    open: false,
    step: "request",
    identifier: "",
    email: "",
    otp: "",
    password: "",
    confirmPassword: "",
    message: "",
    error: ""
  });
  const [submitting, setSubmitting] = useState(false);
  const [resetSubmitting, setResetSubmitting] = useState(false);
  const [error, setError] = useState("");
  const selectedRole = roleOptions[formState.role];
  const selectedCredentials = {
    email: formState.identifier,
    password: formState.password,
    destination: selectedRole.destination
  };
  const usesEmployeeIdLogin = ["employee", "employeeHrms"].includes(formState.role);

  function openPasswordReset() {
    setResetForm({
      open: true,
      step: "request",
      identifier: formState.identifier,
      email: "",
      otp: "",
      password: "",
      confirmPassword: "",
      message: "",
      error: ""
    });
  }

  async function requestPasswordReset() {
    setResetSubmitting(true);
    setResetForm((current) => ({ ...current, error: "", message: "" }));

    try {
      const identifier = resetForm.identifier.trim();

      if (!identifier) {
        throw new Error(usesEmployeeIdLogin ? "Enter Employee ID first." : "Enter corporate email first.");
      }

      const response = await fetch("/api/auth/password-reset/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          identifier,
          email: identifier,
          role: formState.role
        })
      });
      const payload = await response.json().catch(() => ({
        error: "Unable to send OTP. Check email settings and try again."
      }));

      if (!response.ok) {
        throw new Error(payload?.error || "Unable to send OTP.");
      }

      setResetForm((current) => ({
        ...current,
        step: "confirm",
        email: payload.email || identifier,
        message: payload.message || "OTP sent to your registered email account.",
        error: ""
      }));
    } catch (resetError) {
      setResetForm((current) => ({
        ...current,
        error: resetError?.message || "Unable to send OTP."
      }));
    } finally {
      setResetSubmitting(false);
    }
  }

  async function confirmPasswordReset() {
    setResetSubmitting(true);
    setResetForm((current) => ({ ...current, error: "", message: "" }));

    try {
      if (resetForm.password !== resetForm.confirmPassword) {
        throw new Error("New password and confirm password must match.");
      }

      const response = await fetch("/api/auth/password-reset/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: resetForm.email,
          otp: resetForm.otp,
          password: resetForm.password,
          role: formState.role
        })
      });
      const payload = await response.json().catch(() => ({
        error: "Unable to reset password. Please try again."
      }));

      if (!response.ok) {
        throw new Error(payload?.error || "Unable to reset password.");
      }

      setFormState((current) => ({
        ...current,
        identifier: resetForm.identifier,
        password: resetForm.password
      }));
      setResetForm((current) => ({
        ...current,
        step: "done",
        message: payload.message || "Password changed successfully. You can sign in now.",
        error: ""
      }));
    } catch (resetError) {
      setResetForm((current) => ({
        ...current,
        error: resetError?.message || "Unable to reset password."
      }));
    } finally {
      setResetSubmitting(false);
    }
  }

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
                  throw new Error(usesEmployeeIdLogin ? "Enter Employee ID." : "Enter corporate email.");
                }

                if (usesEmployeeIdLogin && selectedCredentials.email.includes("@")) {
                  throw new Error("Enter Employee ID, not email.");
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

                const loginEmployeeId =
                  usesEmployeeIdLogin
                    ? payload?.user?.employeeId || selectedCredentials.email.trim()
                    : "";
                const loginDestination = loginEmployeeId
                  ? `/employee-app?employeeId=${encodeURIComponent(loginEmployeeId)}`
                  : selectedCredentials.destination;

                if (loginEmployeeId) {
                  window.localStorage.setItem(employeeSessionKey, loginEmployeeId);
                }

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
                    const nextConfig = roleOptions[nextRole];
                    setFormState({
                      identifier: nextConfig.identifier,
                      password: nextConfig.password,
                      role: nextRole
                    });
                  }}
                >
                  <option value="admin">Enterprise Admin</option>
                  <option value="payrollAts">Payroll + ATS</option>
                  <option value="invoice">Invoice</option>
                  <option value="ats">ATS</option>
                  <option value="hr">HR</option>
                  <option value="employeeHrms">Employee Attendance</option>
                  <option value="payroll">Payroll</option>
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
                <button className="forgot-password-button" onClick={openPasswordReset} type="button">
                  Forgot Password?
                </button>
              </label>
            </div>

            {resetForm.open ? (
              <div className="password-reset-panel">
                {resetForm.step === "request" ? (
                  <>
                    <div className="password-reset-head">
                      <strong>Reset Password</strong>
                      <button onClick={() => setResetForm((current) => ({ ...current, open: false }))} type="button">Close</button>
                    </div>
                    <label>
                      <span>{usesEmployeeIdLogin ? "Employee ID" : "Registered Email"}</span>
                      <input
                        value={resetForm.identifier}
                        onChange={(event) => setResetForm((current) => ({ ...current, identifier: event.target.value }))}
                      />
                    </label>
                    <div className="password-reset-actions">
                      <button className="primary-button" disabled={resetSubmitting} onClick={requestPasswordReset} type="button">
                        {resetSubmitting ? "Sending OTP..." : "Send OTP"}
                      </button>
                    </div>
                  </>
                ) : null}

                {resetForm.step === "confirm" ? (
                  <>
                    <div className="password-reset-head">
                      <strong>Enter OTP</strong>
                      <button onClick={requestPasswordReset} disabled={resetSubmitting} type="button">Resend</button>
                    </div>
                    <p className="password-reset-note">OTP sent to {resetForm.email}.</p>
                    <div className="password-reset-grid">
                      <label>
                        <span>OTP</span>
                        <input
                          inputMode="numeric"
                          value={resetForm.otp}
                          onChange={(event) => setResetForm((current) => ({ ...current, otp: event.target.value }))}
                        />
                      </label>
                      <label>
                        <span>New Password</span>
                        <input
                          type="password"
                          value={resetForm.password}
                          onChange={(event) => setResetForm((current) => ({ ...current, password: event.target.value }))}
                        />
                      </label>
                      <label>
                        <span>Confirm Password</span>
                        <input
                          type="password"
                          value={resetForm.confirmPassword}
                          onChange={(event) => setResetForm((current) => ({ ...current, confirmPassword: event.target.value }))}
                        />
                      </label>
                    </div>
                    <div className="password-reset-actions">
                      <button className="primary-button" disabled={resetSubmitting} onClick={confirmPasswordReset} type="button">
                        {resetSubmitting ? "Resetting..." : "Reset Password"}
                      </button>
                    </div>
                  </>
                ) : null}

                {resetForm.step === "done" ? (
                  <div className="password-reset-done">
                    <strong>Password Updated</strong>
                    <button className="primary-button" onClick={() => setResetForm((current) => ({ ...current, open: false }))} type="button">
                      Back to Login
                    </button>
                  </div>
                ) : null}

                {resetForm.message ? <p className="password-reset-message">{resetForm.message}</p> : null}
                {resetForm.error ? <p className="form-error">{resetForm.error}</p> : null}
              </div>
            ) : null}

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
