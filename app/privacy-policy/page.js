export const metadata = {
  title: "Privacy Policy | Talme HRMS",
  description: "Privacy policy for the Talme HRMS employee app."
};

const sections = [
  {
    title: "Information we collect",
    body: [
      "Account and identity information such as employee ID, name, work email, role, department, and login/session details.",
      "HRMS information used by the service, including attendance, leave, timesheet, payroll, document, notification, approval, recruitment, vendor, and related workplace records.",
      "Files or documents uploaded through the HRMS, where enabled by the employer or administrator.",
      "Basic technical information required to operate and secure the app, such as browser or WebView information, IP address, device information, timestamps, and diagnostic logs."
    ]
  },
  {
    title: "How we use information",
    body: [
      "To authenticate users and provide access to the Talme HRMS employee app.",
      "To operate HR, attendance, payroll, document, approval, notification, and employee self-service workflows.",
      "To secure the service, prevent misuse, troubleshoot issues, maintain audit records, and improve reliability.",
      "To comply with employer instructions, legal obligations, and applicable workplace record requirements."
    ]
  },
  {
    title: "Sharing of information",
    body: [
      "We do not sell personal or sensitive user data.",
      "Information may be visible to authorized employer administrators, HR, payroll, finance, operations, and other permitted users based on their role.",
      "Information may be processed by service providers used to host, store, email, secure, or operate the service.",
      "Information may be disclosed when required by law, regulation, legal process, or to protect the rights, safety, and security of users, the employer, or the service."
    ]
  },
  {
    title: "Security",
    body: [
      "The app uses HTTPS for data transmission.",
      "Access is controlled through authenticated user sessions and role-based permissions.",
      "We use reasonable administrative and technical safeguards to protect information, but no digital service can be guaranteed to be completely secure."
    ]
  },
  {
    title: "Data retention and deletion",
    body: [
      "HRMS records are retained for as long as required to provide the service, support employer HR operations, maintain audit history, comply with legal obligations, or resolve disputes.",
      "Employees may request correction, access, or deletion of eligible personal information through their employer or by contacting Talme HRMS support.",
      "Some records may need to be retained where required for payroll, attendance, tax, accounting, security, legal, or compliance purposes."
    ]
  }
];

export default function PrivacyPolicyPage() {
  return (
    <main
      style={{
        minHeight: "100vh",
        background: "#f6f8fb",
        color: "#172033",
        padding: "48px 18px",
        fontFamily: "Aptos, Segoe UI, sans-serif"
      }}
    >
      <article
        style={{
          maxWidth: 920,
          margin: "0 auto",
          background: "#ffffff",
          border: "1px solid #dfe6ef",
          borderRadius: 24,
          boxShadow: "0 24px 70px rgba(15, 23, 42, 0.10)",
          padding: "clamp(24px, 5vw, 56px)"
        }}
      >
        <p
          style={{
            margin: "0 0 10px",
            color: "#a06f1a",
            letterSpacing: "0.16em",
            textTransform: "uppercase",
            fontSize: 13,
            fontWeight: 800
          }}
        >
          Talme HRMS
        </p>
        <h1 style={{ margin: "0 0 12px", fontSize: "clamp(2rem, 5vw, 3.4rem)", lineHeight: 1.05 }}>
          Privacy Policy
        </h1>
        <p style={{ margin: "0 0 30px", color: "#5f6f85", lineHeight: 1.7 }}>
          Effective date: 10 July 2026. This Privacy Policy explains how Talme HRMS handles user data for the
          Talme HRMS employee app, including the Android app package <strong>in.talme.hrms.employee</strong>.
        </p>

        <section style={{ borderTop: "1px solid #e5ebf3", paddingTop: 24 }}>
          <h2 style={{ fontSize: "1.2rem", marginBottom: 10 }}>Developer and privacy contact</h2>
          <p style={{ color: "#4d5f75", lineHeight: 1.7 }}>
            Developer/App: <strong>Talme HRMS</strong>
            <br />
            Privacy contact: <a href="mailto:hr@talme.in">hr@talme.in</a>
            <br />
            Website: <a href="https://www.talme.in">www.talme.in</a>
          </p>
        </section>

        {sections.map((section) => (
          <section key={section.title} style={{ borderTop: "1px solid #e5ebf3", paddingTop: 24, marginTop: 24 }}>
            <h2 style={{ fontSize: "1.2rem", marginBottom: 12 }}>{section.title}</h2>
            <ul style={{ paddingLeft: 22, color: "#4d5f75", lineHeight: 1.75 }}>
              {section.body.map((item) => (
                <li key={item} style={{ marginBottom: 8 }}>
                  {item}
                </li>
              ))}
            </ul>
          </section>
        ))}

        <section style={{ borderTop: "1px solid #e5ebf3", paddingTop: 24, marginTop: 24 }}>
          <h2 style={{ fontSize: "1.2rem", marginBottom: 10 }}>Children</h2>
          <p style={{ color: "#4d5f75", lineHeight: 1.7 }}>
            The Talme HRMS employee app is intended for workplace use by authorized employees and administrators. It is
            not directed to children.
          </p>
        </section>

        <section style={{ borderTop: "1px solid #e5ebf3", paddingTop: 24, marginTop: 24 }}>
          <h2 style={{ fontSize: "1.2rem", marginBottom: 10 }}>Changes to this policy</h2>
          <p style={{ color: "#4d5f75", lineHeight: 1.7 }}>
            We may update this Privacy Policy when the service, legal requirements, or data practices change. Updates
            will be posted on this page with a revised effective date.
          </p>
        </section>
      </article>
    </main>
  );
}
