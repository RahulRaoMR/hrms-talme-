"use client";

import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

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
      const result = await signIn("credentials", {
        email: formState.employeeId,
        password: formState.password,
        role: "employee",
        redirect: false
      });

      if (result?.error) {
        throw new Error(result.error);
      }

      router.push("/employee-app");
      router.refresh();
    } catch {
      setError("Invalid employee ID or password.");
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
