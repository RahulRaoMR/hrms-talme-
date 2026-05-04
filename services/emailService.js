import nodemailer from "nodemailer";

let transporter;
const EMAIL_TIMEOUT_MS = 20000;

function parseBoolean(value, defaultValue = false) {
  if (value === undefined || value === null || value === "") {
    return defaultValue;
  }

  if (value === true || value === "true") {
    return true;
  }

  if (value === false || value === "false") {
    return false;
  }

  return defaultValue;
}

function getTransportOptions() {
  const smtpHost = process.env.SMTP_HOST;
  const smtpPort = Number(process.env.SMTP_PORT || 587);
  const emailUser = process.env.EMAIL_USER;
  const emailPass = process.env.EMAIL_PASS?.replace(/\s/g, "");

  if (smtpHost) {
    return {
      host: smtpHost,
      port: smtpPort,
      secure: parseBoolean(process.env.SMTP_SECURE, smtpPort === 465),
      auth:
        emailUser && emailPass
          ? {
              user: emailUser,
              pass: emailPass
            }
          : undefined
    };
  }

  return {
    service: process.env.EMAIL_SERVICE || "gmail",
    auth: {
      user: emailUser,
      pass: emailPass
    }
  };
}

function hasSmtpCredentials() {
  return Boolean(process.env.EMAIL_USER && process.env.EMAIL_PASS);
}

function hasResendKey() {
  return Boolean(process.env.RESEND_API_KEY);
}

function shouldUseResend() {
  const provider = process.env.EMAIL_PROVIDER?.trim().toLowerCase();

  if (provider === "resend") {
    return hasResendKey();
  }

  if (provider === "smtp" || provider === "gmail") {
    return false;
  }

  return hasResendKey() && !hasSmtpCredentials();
}

function getDefaultFrom(provider = "smtp") {
  const from = process.env.EMAIL_FROM?.trim();

  if (from && provider === "resend") {
    return from;
  }

  const emailUser = process.env.EMAIL_USER?.trim();
  return emailUser ? `"Talme HRMS" <${emailUser}>` : '"Talme HRMS" <no-reply@example.com>';
}

export function isEmailConfigured() {
  if (hasResendKey()) {
    return true;
  }

  if (process.env.SMTP_HOST) {
    return hasSmtpCredentials();
  }

  return hasSmtpCredentials();
}

export function getEmailTransporter() {
  if (!transporter) {
    transporter = nodemailer.createTransport(getTransportOptions());
  }

  return transporter;
}

export async function sendEmail(to, subject, html, options = {}) {
  if (!isEmailConfigured()) {
    throw new Error("Email service is not configured. Set RESEND_API_KEY, EMAIL_USER and EMAIL_PASS, or SMTP credentials.");
  }

  if (shouldUseResend()) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), EMAIL_TIMEOUT_MS);

    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
        "Content-Type": "application/json"
      },
      signal: controller.signal,
      body: JSON.stringify({
        from: options.from || getDefaultFrom("resend"),
        to,
        subject,
        html,
        text: options.text
      })
    }).finally(() => clearTimeout(timeout));

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new Error(data?.message || data?.error || "Email API request failed.");
    }

    return data;
  }

  const info = await Promise.race([
    getEmailTransporter().sendMail({
      from: options.from || getDefaultFrom("smtp"),
      to,
      subject,
      html,
      text: options.text
    }),
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error("Email send timed out. Check SMTP credentials and network access.")), EMAIL_TIMEOUT_MS)
    )
  ]);

  return info;
}
