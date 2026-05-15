"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { apiUrl } from "@/lib/api-client";
import { saveSuiteSession } from "@/lib/auth-session";

const roleOptions = {
  admin: {
    label: "Enterprise Admin",
    identifierLabel: "Corporate Email",
    identifier: "director@talme.ai",
    destination: "/dashboard"
  },
  hr: {
    label: "HR",
    identifierLabel: "Corporate Email",
    identifier: "hr@talme.ai",
    destination: "/dashboard"
  },
  employee: {
    label: "Employee",
    identifierLabel: "Employee ID",
    identifier: "",
    destination: "/employee-app"
  }
};
const RESET_REQUEST_TIMEOUT_MS = 30000;
const employeeSessionKey = "talme-employee-app-employee-id";

export default function LandingPage() {
  const router = useRouter();
  const [formState, setFormState] = useState({
    identifier: roleOptions.admin.identifier,
    password: "",
    role: "admin"
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [resetState, setResetState] = useState({
    open: false,
    email: roleOptions.admin.identifier,
    otp: "",
    password: "",
    step: "request",
    submitting: false,
    message: "",
    status: "info"
  });
  const selectedRole = roleOptions[formState.role];
  const selectedCredentials = {
    email: formState.identifier,
    password: formState.password,
    destination: selectedRole.destination
  };
  const resetIdentifierLabel = formState.role === "employee" ? "Employee ID" : "Email Account";
  const resetTargetHint = formState.role === "employee"
    ? "OTP will be sent to the registered mail saved for this Employee ID."
    : "OTP will be sent to this email account.";

  async function parseApiResponse(response) {
    const contentType = response.headers.get("content-type") || "";

    if (contentType.includes("application/json")) {
      return response.json();
    }

    const text = await response.text();
    return {
      error: text.includes("<!DOCTYPE")
        ? "Reset service is not available. Restart the dev server and try again."
        : text || "Unexpected server response."
    };
  }

  async function fetchResetApi(url, body) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), RESET_REQUEST_TIMEOUT_MS);

    try {
      return await fetch(apiUrl(url), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: controller.signal,
        body: JSON.stringify(body)
      });
    } catch (requestError) {
      if (requestError.name === "AbortError") {
        throw new Error("OTP request timed out. Check email settings and try again.");
      }

      throw requestError;
    } finally {
      clearTimeout(timeout);
    }
  }

  async function parseAuthResponse(response) {
    const contentType = response.headers.get("content-type") || "";

    if (contentType.includes("application/json")) {
      return response.json();
    }

    return {
      error: "Login service is not available. Check the backend API URL and try again."
    };
  }

  async function enterSuite() {
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
      const payload = await parseAuthResponse(response);

      if (!response.ok) {
        throw new Error(payload?.error || "Invalid email or password.");
      }

      const loginEmployeeId =
        formState.role === "employee"
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
      setError(loginError.message || "Unable to sign in. Please check the selected role and password.");
    } finally {
      setSubmitting(false);
    }
  }

  async function submitResetRequest() {
    setResetState((current) => ({
      ...current,
      submitting: true,
      message: ""
    }));
    setError("");

    try {
      if (!formState.identifier.trim()) {
        throw new Error(formState.role === "employee" ? "Enter Employee ID first." : "Enter your email first.");
      }

      const response = await fetchResetApi("/api/auth/password-reset/request", {
        identifier: formState.identifier,
        role: formState.role
      });
      const payload = await parseApiResponse(response);

      if (!response.ok) {
        throw new Error(payload?.error || "Unable to send OTP.");
      }

      setResetState((current) => ({
        ...current,
        email: payload.email || current.email,
        step: "confirm",
        submitting: false,
        message: payload.message,
        status: "success"
      }));
    } catch (resetError) {
      setResetState((current) => ({
        ...current,
        submitting: false,
        message: resetError.message,
        status: "error"
      }));
    }
  }

  async function confirmResetPassword() {
    setResetState((current) => ({ ...current, submitting: true, message: "" }));
    setError("");

    try {
      const response = await fetchResetApi("/api/auth/password-reset/confirm", {
        email: resetState.email,
        otp: resetState.otp,
        password: resetState.password
      });
      const payload = await parseApiResponse(response);

      if (!response.ok) {
        throw new Error(payload?.error || "Unable to reset password.");
      }

      setFormState((current) => ({
        ...current,
        identifier: formState.role === "employee" ? current.identifier : resetState.email,
        password: resetState.password
      }));
      setResetState((current) => ({
        ...current,
        step: "request",
        otp: "",
        password: "",
        submitting: false,
        message: payload.message,
        status: "success"
      }));
    } catch (resetError) {
      setResetState((current) => ({
        ...current,
        submitting: false,
        message: resetError.message,
        status: "error"
      }));
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
                    password: "",
                    role: nextRole
                  });
                  setResetState((current) => ({
                    ...current,
                    email: "",
                    otp: "",
                    password: "",
                    step: "request",
                    message: ""
                  }));
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
                onChange={(event) => {
                  const nextIdentifier = event.target.value;
                  setFormState((current) => ({ ...current, identifier: nextIdentifier }));
                  setResetState((current) =>
                    current.open
                      ? {
                          ...current,
                          otp: "",
                          password: "",
                          step: "request",
                          message: ""
                        }
                      : current
                  );
                }}
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
            <button className="primary-button" disabled={submitting} onClick={enterSuite} type="button">
              {submitting ? "Opening..." : "Enter Suite"}
            </button>
            <button
              className="ghost-button"
              onClick={() =>
                setResetState((current) => ({
                  ...current,
                  open: !current.open,
                  email: "",
                  otp: "",
                  password: "",
                  step: "request",
                  message: ""
                }))
              }
              type="button"
            >
              Forgot Password?
            </button>
          </div>
          {resetState.open ? (
            <div className="landing-reset-panel">
              <div className="landing-grid">
                <div className="reset-target-card">
                  <span>{resetIdentifierLabel}</span>
                  <strong>{formState.identifier || `Enter ${resetIdentifierLabel} above`}</strong>
                  <small>{resetTargetHint}</small>
                </div>
                {resetState.step === "confirm" ? (
                  <label>
                    <span>OTP</span>
                    <input
                      inputMode="numeric"
                      maxLength={6}
                      value={resetState.otp}
                      onChange={(event) =>
                        setResetState((current) => ({
                          ...current,
                          otp: event.target.value.replace(/\D/g, ""),
                          message: ""
                        }))
                      }
                    />
                  </label>
                ) : null}
                {resetState.step === "confirm" ? (
                  <label>
                    <span>New Password</span>
                    <input
                      type="password"
                      value={resetState.password}
                      onChange={(event) =>
                        setResetState((current) => ({
                          ...current,
                          password: event.target.value,
                          message: ""
                        }))
                      }
                    />
                  </label>
                ) : null}
              </div>
              <div className="landing-actions">
                {resetState.step === "request" ? (
                  <button
                    className="primary-button"
                    disabled={resetState.submitting}
                    onClick={submitResetRequest}
                    type="button"
                  >
                    {resetState.submitting ? "Sending OTP..." : "Send OTP"}
                  </button>
                ) : (
                  <>
                    <button
                      className="primary-button"
                      disabled={resetState.submitting}
                      onClick={confirmResetPassword}
                      type="button"
                    >
                      {resetState.submitting ? "Changing..." : "Reset Password"}
                    </button>
                    <button
                      className="ghost-button"
                      disabled={resetState.submitting}
                      onClick={submitResetRequest}
                      type="button"
                    >
                      Resend OTP
                    </button>
                  </>
                )}
              </div>
              {resetState.message ? (
                <p className={resetState.status === "error" ? "form-error" : "session-note"}>
                  {resetState.message}
                </p>
              ) : null}
            </div>
          ) : null}
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
