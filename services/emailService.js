import nodemailer from "nodemailer";

let transporter;

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
  const emailPass = process.env.EMAIL_PASS;

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

function getDefaultFrom() {
  const from = process.env.EMAIL_FROM?.trim();

  if (from) {
    return from;
  }

  const emailUser = process.env.EMAIL_USER?.trim();
  return emailUser ? `"Talme HRMS" <${emailUser}>` : '"Talme HRMS" <no-reply@example.com>';
}

export function isEmailConfigured() {
  if (process.env.SMTP_HOST) {
    return Boolean(process.env.EMAIL_USER && process.env.EMAIL_PASS);
  }

  return Boolean(process.env.EMAIL_USER && process.env.EMAIL_PASS);
}

export function getEmailTransporter() {
  if (!transporter) {
    transporter = nodemailer.createTransport(getTransportOptions());
  }

  return transporter;
}

export async function sendEmail(to, subject, html, options = {}) {
  if (!isEmailConfigured()) {
    throw new Error("Email service is not configured. Set EMAIL_USER and EMAIL_PASS, or SMTP credentials.");
  }

  const info = await getEmailTransporter().sendMail({
    from: options.from || getDefaultFrom(),
    to,
    subject,
    html,
    text: options.text
  });

  return info;
}
