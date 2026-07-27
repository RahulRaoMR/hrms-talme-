function cleanEnv(value) {
  return String(value || "").trim().replace(/^"|"$/g, "");
}

function hasEnv(env, key) {
  return Boolean(cleanEnv(env[key]));
}

function getConfiguredChoice(env) {
  const provider = cleanEnv(env.EMAIL_PROVIDER).toLowerCase();
  const service = cleanEnv(env.EMAIL_SERVICE).toLowerCase();
  const hasSmtpCredentials = hasEnv(env, "EMAIL_USER") && hasEnv(env, "EMAIL_PASS");
  const hasResendConfig = hasEnv(env, "RESEND_API_KEY") || hasEnv(env, "EMAIL_FROM");

  if (provider === "resend" || service === "resend") return "resend";
  if (provider === "smtp") return "smtp";
  if (provider === "gmail" || service === "gmail") return hasSmtpCredentials || !hasResendConfig ? "gmail" : "resend";
  if (service === "smtp") return hasSmtpCredentials || !hasResendConfig ? "smtp" : "resend";
  if (hasEnv(env, "SMTP_HOST")) return "smtp";
  if (hasResendConfig) return "resend";

  return "gmail";
}

function getFromAddress(env, provider) {
  const configuredFrom = cleanEnv(env.EMAIL_FROM);
  const emailUser = cleanEnv(env.EMAIL_USER);

  if (configuredFrom) return configuredFrom;
  if (provider !== "resend" && emailUser) return `"Talme HRMS" <${emailUser}>`;

  return "";
}

export function getEmailDiagnostics(env = process.env) {
  const provider = getConfiguredChoice(env);
  const missing = [];

  if (provider === "resend") {
    if (!hasEnv(env, "RESEND_API_KEY")) missing.push("RESEND_API_KEY");
    if (!hasEnv(env, "EMAIL_FROM")) missing.push("EMAIL_FROM");
  } else {
    if (provider === "smtp" && !hasEnv(env, "SMTP_HOST")) missing.push("SMTP_HOST");
    if (!hasEnv(env, "EMAIL_USER")) missing.push("EMAIL_USER");
    if (!hasEnv(env, "EMAIL_PASS")) missing.push("EMAIL_PASS");
  }

  const diagnostics = {
    configured: missing.length === 0,
    provider,
    from: getFromAddress(env, provider)
  };

  if (missing.length) {
    diagnostics.missing = missing;
  }

  return diagnostics;
}
