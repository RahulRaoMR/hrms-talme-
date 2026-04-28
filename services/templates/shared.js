function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

export function renderEmailShell(title, content) {
  return `
    <div style="font-family: Arial, sans-serif; color: #1f2937; line-height: 1.6; max-width: 640px; margin: 0 auto; padding: 24px;">
      <div style="border: 1px solid #e5e7eb; border-radius: 16px; overflow: hidden;">
        <div style="background: linear-gradient(135deg, #0f766e, #1d4ed8); color: #ffffff; padding: 24px;">
          <p style="margin: 0 0 8px; font-size: 12px; letter-spacing: 0.12em; text-transform: uppercase;">Talme HRMS</p>
          <h2 style="margin: 0; font-size: 28px;">${escapeHtml(title)}</h2>
        </div>
        <div style="padding: 24px;">
          ${content}
        </div>
      </div>
    </div>
  `;
}

export { escapeHtml };
