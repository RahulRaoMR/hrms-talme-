"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { saveSuiteSession } from "@/lib/auth-session";
import { signInEmployee } from "@/lib/employee-login";
import { isEmployeeMobileApp, beginEmployeeMobileSession, restoreEmployeeMobileSession } from "@/lib/employee-mobile-session";
import EmployeeSessionLoading from "@/components/employee-session-loading";
import PasswordResetForm from "@/components/password-reset-form";
import { ArrowLeft, Eye, EyeOff, LogIn } from "lucide-react";
import "./employee-app.css";

const employeeSessionKey = "talme-employee-app-employee-id";

export default function EmployeeAppLogin() {
  const router = useRouter();
  const [formState, setFormState] = useState({
    employeeId: "",
    password: ""
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [resetOpen, setResetOpen] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);
  const [sessionError, setSessionError] = useState("");
  const [sessionRetry, setSessionRetry] = useState(0);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        setSessionError("");
        if (isEmployeeMobileApp()) {
          const session = await restoreEmployeeMobileSession();
          if (!active) return;
          if (session) { router.replace("/employee-app?mobile=1"); return; }
        }
        if (active) setCheckingSession(false);
      } catch {
        if (active) setSessionError("Unable to connect. Your session is saved. Check your connection and retry.");
      }
    })();
    return () => { active = false; };
  }, [router, sessionRetry]);

  useEffect(() => {
    window.history.pushState({ employeeLogin: true }, "", window.location.href);

    function sendBackToHrms() {
      router.replace("/");
    }

    window.addEventListener("popstate", sendBackToHrms);
    return () => window.removeEventListener("popstate", sendBackToHrms);
  }, [router]);

  function goToHrms() {
    router.replace("/");
  }

  async function submit(event) {
    event.preventDefault();
    setSubmitting(true);
    setError("");

    try {
      const employeeId = formState.employeeId.trim();

      if (!employeeId) {
        throw new Error("Employee ID is required.");
      }

      if (employeeId.includes("@")) {
        throw new Error("Enter Employee ID, not email.");
      }

      if (!formState.password.trim()) {
        throw new Error("Password is required.");
      }

      const response = await signInEmployee(employeeId, formState.password, { sameOrigin: isEmployeeMobileApp() });
      const payload = await response.json().catch(() => ({
        error: "Login service is not available. Check the backend API URL and try again."
      }));

      if (!response.ok) {
        throw new Error(payload?.error || "Invalid employee ID or password.");
      }

      if (isEmployeeMobileApp()) {
        await beginEmployeeMobileSession(payload.token);
        router.replace("/employee-app?mobile=1");
        return;
      }

      const loginEmployeeId = payload?.user?.employeeId || employeeId;
      const destination = `/employee-app?employeeId=${encodeURIComponent(loginEmployeeId)}`;

      window.sessionStorage.setItem(employeeSessionKey, loginEmployeeId);
      window.localStorage.removeItem(employeeSessionKey);
      saveSuiteSession({
        token: payload.token,
        user: payload.user,
        destination
      });
      router.push(destination);
      router.refresh();
    } catch (loginError) {
      setError(loginError?.message || "Invalid employee ID or password.");
    } finally {
      setSubmitting(false);
    }
  }

  if (checkingSession) return <EmployeeSessionLoading error={sessionError} onRetry={() => setSessionRetry((value) => value + 1)} />;

  return (
    <main className="employee-login-shell core-employee-login">
      <section className="employee-login-phone">
        <button
          className="employee-login-back"
          onClick={goToHrms}
          type="button"
          aria-label="Back to Talme HRMS"
        >
          <ArrowLeft size={16} aria-hidden="true" />
          Talme HRMS
        </button>
        <div className="employee-login-hero">
          <div className="employee-login-logo">
            <img src="/talme-logo.png" alt="Talme Logo" />
          </div>
          <p>Talme Technologies</p>
          <h1>Employee App</h1>
        </div>

        {resetOpen ? (
          <PasswordResetForm
            role="employee"
            initialIdentifier={formState.employeeId}
            className="employee-login-form employee-password-reset"
            onClose={() => setResetOpen(false)}
            onComplete={({ identifier, password }) => setFormState({ employeeId: identifier, password })}
          />
        ) : <form className="employee-login-form" onSubmit={submit}>
          <label>
            <span>Employee ID</span>
            <input
              autoComplete="username"
              value={formState.employeeId}
              onChange={(event) => setFormState((current) => ({ ...current, employeeId: event.target.value }))}
              placeholder="Employee ID"
            />
          </label>
          <label>
            <span>Password</span>
            <div className="employee-login-password"><input
              type={showPassword ? "text" : "password"}
              autoComplete="current-password"
              value={formState.password}
              onChange={(event) => setFormState((current) => ({ ...current, password: event.target.value }))}
              placeholder="Password"
            /><button type="button" aria-label={showPassword ? "Hide password" : "Show password"} title={showPassword ? "Hide password" : "Show password"} onClick={() => setShowPassword((visible) => !visible)}>{showPassword ? <EyeOff size={17} /> : <Eye size={17} />}</button></div>
          </label>
          <button className="employee-login-forgot" onClick={() => { setError(""); setShowPassword(false); setResetOpen(true); }} type="button">Forgot Password?</button>
          <button className="phone-primary" disabled={submitting} type="submit">
            <LogIn size={17} aria-hidden="true" />{submitting ? "Signing In..." : "Sign In"}
          </button>
        </form>}

        {!resetOpen && error ? <p className="employee-login-error" role="alert">{error}</p> : null}

        <p className="employee-login-policy">
          By continuing, you agree to the{" "}
          <a href="/privacy-policy" target="_blank" rel="noreferrer">
            Privacy Policy
          </a>
          .
        </p>

      </section>
    </main>
  );
}
