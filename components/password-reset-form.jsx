"use client";

import { useId, useState } from "react";
import { RefreshCw, X } from "lucide-react";
import { isEmployeeLoginRole } from "@/lib/login-roles";
import "./password-reset-form.css";

async function postReset(path, body) {
  const response = await fetch(`/api/auth/password-reset/${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(30000)
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload.error || "Unable to reset password. Please try again.");
  return payload;
}

export default function PasswordResetForm({ role, initialIdentifier = "", onClose, onComplete, className = "password-reset-panel" }) {
  const id = useId();
  const employeeLogin = isEmployeeLoginRole(role);
  const identifierLabel = employeeLogin ? "Employee ID" : "Registered Email";
  const [step, setStep] = useState("request");
  const [identifier, setIdentifier] = useState(initialIdentifier);
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function requestOtp() {
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const value = identifier.trim();
      if (!value) throw new Error(`Enter ${employeeLogin ? "Employee ID" : "your registered email"} first.`);
      if (employeeLogin && value.includes("@")) throw new Error("Enter Employee ID, not email.");
      const payload = await postReset("request", { identifier: value, email: value, role });
      if (!payload.email) throw new Error("Unable to start password reset. Please try again.");
      setEmail(payload.email);
      setOtp("");
      setStep("confirm");
      setMessage(payload.message || "OTP sent to your registered email account.");
    } catch (failure) {
      setError(failure.name === "TimeoutError" ? "Request timed out. Please try again." : failure.message);
    } finally {
      setBusy(false);
    }
  }

  async function submit(event) {
    event.preventDefault();
    if (busy) return;
    if (step === "request") return requestOtp();
    if (step !== "confirm") return;
    setBusy(true);
    setError("");
    setMessage("");
    try {
      if (!/^\d{6}$/.test(otp)) throw new Error("Enter the 6-digit OTP from your email.");
      if (password.length < 6) throw new Error("Password must be at least 6 characters.");
      if (password !== password.trim()) throw new Error("Password cannot start or end with spaces.");
      if (password !== confirmation) throw new Error("New password and confirm password must match.");
      const payload = await postReset("confirm", { email, otp, password });
      setStep("done");
      setMessage(payload.message || "Password changed successfully. You can sign in now.");
      onComplete?.({ identifier: identifier.trim(), password });
      setPassword("");
      setConfirmation("");
      setOtp("");
    } catch (failure) {
      setError(failure.name === "TimeoutError" ? "Request timed out. Please try again." : failure.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className={`shared-password-reset ${className}`} aria-label="Reset password" aria-busy={busy} onSubmit={submit} noValidate>
      <div className="password-reset-head">
        <h2>{step === "done" ? "Password Updated" : step === "confirm" ? "Verify OTP" : "Reset Password"}</h2>
        <button className="password-reset-close" type="button" onClick={onClose} disabled={busy} aria-label="Back to sign in" title="Back to sign in"><X size={18} aria-hidden="true" /></button>
      </div>
      {step === "request" ? (
        <label htmlFor={`${id}-identifier`}>
          <span>{identifierLabel}</span>
          <input id={`${id}-identifier`} autoComplete="username" value={identifier} onChange={(event) => setIdentifier(event.target.value)} autoFocus />
        </label>
      ) : null}
      {step === "confirm" ? (
        <>
          <p className="password-reset-note">OTP sent to {email}.</p>
          <div className="password-reset-grid">
            <label htmlFor={`${id}-otp`}><span>OTP</span><input id={`${id}-otp`} inputMode="numeric" autoComplete="one-time-code" maxLength={6} value={otp} onChange={(event) => setOtp(event.target.value.replace(/\D/g, "").slice(0, 6))} autoFocus /></label>
            <label htmlFor={`${id}-password`}><span>New Password</span><input id={`${id}-password`} type="password" autoComplete="new-password" value={password} onChange={(event) => setPassword(event.target.value)} /></label>
            <label htmlFor={`${id}-confirmation`}><span>Confirm Password</span><input id={`${id}-confirmation`} type="password" autoComplete="new-password" value={confirmation} onChange={(event) => setConfirmation(event.target.value)} /></label>
          </div>
          <div className="password-reset-secondary">
            <button type="button" disabled={busy} onClick={requestOtp}><RefreshCw size={14} aria-hidden="true" />Resend OTP</button>
            <button type="button" disabled={busy} onClick={() => { setStep("request"); setOtp(""); setMessage(""); setError(""); }}>Change {identifierLabel}</button>
          </div>
        </>
      ) : null}
      {message ? <p className="password-reset-message" role="status">{message}</p> : null}
      {error ? <p className="form-error" role="alert">{error}</p> : null}
      {step === "done" ? (
        <button className="primary-button phone-primary" type="button" onClick={onClose}>Back to Sign In</button>
      ) : (
        <button className="primary-button phone-primary" type="submit" disabled={busy}>{busy ? step === "request" ? "Sending OTP..." : "Please wait..." : step === "request" ? "Send OTP" : "Reset Password"}</button>
      )}
    </form>
  );
}
