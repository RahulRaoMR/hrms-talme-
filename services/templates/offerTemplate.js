import { escapeHtml, renderEmailShell } from "@/services/templates/shared";

export const offerTemplate = (name, role) =>
  renderEmailShell(
    "Offer Letter",
    `
      <p>Dear ${escapeHtml(name)},</p>
      <p>We are pleased to offer you the role of <strong>${escapeHtml(role)}</strong>.</p>
      <p>Our team is excited to welcome you to Talme.</p>
      <p>Please reply to this email if you need any help with the next steps.</p>
    `
  );
