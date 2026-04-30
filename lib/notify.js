import { sendEmail } from "@/services/emailService";

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function parseRecipients(recipients) {
  return String(recipients || "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

async function sendViaResend({ to, subject, message }) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM;

  if (!apiKey || !from) {
    return null;
  }

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      from,
      to,
      subject,
      text: message
    })
  });

  const payload = await response.json().catch(() => ({}));
  return {
    ok: response.ok,
    channel: "email",
    detail: payload.id || payload.message || JSON.stringify(payload)
  };
}

async function sendViaEmail({ to, subject, message }) {
  try {
    const info = await sendEmail(
      to,
      subject,
      `<div style="font-family: Arial, sans-serif; line-height: 1.6;"><p>${escapeHtml(message).replaceAll("\n", "<br />")}</p></div>`,
      { text: message }
    );

    return {
      ok: true,
      channel: "email",
      detail: info.messageId || info.response || "Delivered"
    };
  } catch (error) {
    const resendResult = await sendViaResend({ to, subject, message });

    if (resendResult) {
      return resendResult;
    }

    return {
      ok: false,
      channel: "email",
      detail: error?.message || "Email delivery failed."
    };
  }
}

async function sendViaTwilio({ to, body, from }) {
  const sid = process.env.TWILIO_ACCOUNT_SID;
  const token = process.env.TWILIO_AUTH_TOKEN;
  if (!sid || !token || !from) {
    return { ok: false, channel: "twilio", detail: "Missing Twilio credentials or sender" };
  }

  const auth = Buffer.from(`${sid}:${token}`).toString("base64");
  const form = new URLSearchParams({ To: to, From: from, Body: body });
  const response = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${auth}`,
      "Content-Type": "application/x-www-form-urlencoded"
    },
    body: form
  });
  const payload = await response.json().catch(() => ({}));

  return {
    ok: response.ok,
    channel: from.startsWith("whatsapp:") ? "whatsapp" : "sms",
    detail: payload.sid || payload.message || JSON.stringify(payload)
  };
}

export async function deliverNotification(notification) {
  const channels = String(notification.channel || "")
    .split(",")
    .map((value) => value.trim().toLowerCase())
    .filter(Boolean);
  const recipients = parseRecipients(notification.recipients);
  const outcomes = [];

  if (channels.includes("dashboard")) {
    outcomes.push({ ok: true, channel: "dashboard", detail: "Stored in in-app notification feed" });
  }

  const emailRecipients = recipients.filter((recipient) => recipient.includes("@"));
  const phoneRecipients = recipients.filter((recipient) => !recipient.includes("@"));

  if (channels.includes("email") && emailRecipients.length) {
    outcomes.push(
      await sendViaEmail({
        to: emailRecipients,
        subject: notification.subject,
        message: notification.message
      })
    );
  }

  if (channels.includes("sms") && phoneRecipients.length) {
    const from = process.env.TWILIO_SMS_FROM;
    for (const recipient of phoneRecipients) {
      outcomes.push(await sendViaTwilio({ to: recipient, from, body: notification.message }));
    }
  }

  if (channels.includes("whatsapp") && phoneRecipients.length) {
    const from = process.env.TWILIO_WHATSAPP_FROM;
    for (const recipient of phoneRecipients) {
      const to = recipient.startsWith("whatsapp:") ? recipient : `whatsapp:${recipient}`;
      outcomes.push(await sendViaTwilio({ to, from, body: notification.message }));
    }
  }

  if (outcomes.length === 0) {
    return {
      ok: false,
      detail: "No matching configured channels/recipients were available."
    };
  }

  const ok = outcomes.every((outcome) => outcome.ok);
  return {
    ok,
    detail: outcomes.map((outcome) => `${outcome.channel}: ${outcome.detail}`).join(" | ")
  };
}
