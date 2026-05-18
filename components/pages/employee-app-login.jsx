"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { apiUrl } from "@/lib/api-client";
import { saveSuiteSession } from "@/lib/auth-session";

const employeeSessionKey = "talme-employee-app-employee-id";

export default function EmployeeAppLogin() {
  const router = useRouter();
  const [formState, setFormState] = useState({
    employeeId: "",
    password: ""
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

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

      if (!formState.password.trim()) {
        throw new Error("Password is required.");
      }

      const response = await fetch(apiUrl("/api/auth/login"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: employeeId,
          password: formState.password,
          role: "employee"
        })
      });
      const payload = await response.json().catch(() => ({
        error: "Login service is not available. Check the backend API URL and try again."
      }));

      if (!response.ok) {
        throw new Error(payload?.error || "Invalid employee ID or password.");
      }

      const loginEmployeeId = payload?.user?.employeeId || employeeId;
      const destination = `/employee-app?employeeId=${encodeURIComponent(loginEmployeeId)}`;

      window.localStorage.setItem(employeeSessionKey, loginEmployeeId);
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

  return (
    <main className="employee-login-shell">
      <section className="employee-login-phone">
        <div className="phone-status">
          <strong>10:40</strong>
          <span>Vo WiFi</span>
          <span>29%</span>
        </div>
        <button
          className="employee-login-back"
          onClick={goToHrms}
          type="button"
          aria-label="Back to Talme HRMS"
        >
          <span>&lt;</span>
          Talme HRMS
        </button>
        <div className="employee-login-hero">
          <div className="employee-login-logo">
            <img src="/talme-logo.png" alt="Talme Logo" />
          </div>
          <p>Talme Employee App</p>
          <h1>Sign in to continue</h1>
        </div>

        <form className="employee-login-form" onSubmit={submit}>
          <label>
            <span>Employee ID</span>
            <input
              value={formState.employeeId}
              onChange={(event) => setFormState((current) => ({ ...current, employeeId: event.target.value }))}
              placeholder="Employee ID"
            />
          </label>
          <label>
            <span>Password</span>
            <input
              type="password"
              value={formState.password}
              onChange={(event) => setFormState((current) => ({ ...current, password: event.target.value }))}
              placeholder="Password"
            />
          </label>
          <button className="phone-primary" disabled={submitting} type="submit">
            {submitting ? "Signing In..." : "Access Employee App"}
          </button>
        </form>

        {error ? <p className="employee-login-error">{error}</p> : null}

      </section>
    </main>
  );
}
