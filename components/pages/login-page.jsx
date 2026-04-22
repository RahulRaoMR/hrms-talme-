"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";

export default function LoginPageClient() {
  const router = useRouter();
  const [formState, setFormState] = useState({
    email: "director@talme.ai",
    password: "talme123",
    role: "Enterprise Admin"
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

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
                const result = await signIn("credentials", {
                  email: formState.email,
                  password: formState.password,
                  redirect: false
                });

                if (result?.error) {
                  throw new Error(result.error);
                }

                router.push("/dashboard");
              } catch {
                setError("Unable to sign in. Please retry.");
              } finally {
                setSubmitting(false);
              }
            }}
          >
            <div className="landing-grid">
              <label>
                <span>Corporate Email</span>
                <input
                  value={formState.email}
                  onChange={(event) =>
                    setFormState((current) => ({ ...current, email: event.target.value }))
                  }
                />
              </label>
              <label>
                <span>Access Role</span>
                <input
                  value={formState.role}
                  onChange={(event) =>
                    setFormState((current) => ({ ...current, role: event.target.value }))
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
                    const result = await signIn("credentials", {
                      email: "director@talme.ai",
                      password: "talme123",
                      redirect: false
                    });

                    if (result?.error) {
                      throw new Error(result.error);
                    }

                    router.push("/dashboard");
                  } catch {
                    setError("Unable to open demo access. Please retry.");
                  } finally {
                    setSubmitting(false);
                  }
                }}
                type="button"
              >
                Demo Access
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
