import "./globals.css";
import AppSessionProvider from "@/components/session-provider";

export const metadata = {
  title: "Talme HRMS Suite",
  description: "Premium ATS, HRMS, VMS, payroll, attendance, and vendor payment suite.",
  icons: {
    icon: "/talme-logo.png",
    shortcut: "/talme-logo.png",
    apple: "/talme-logo.png"
  }
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" data-scroll-behavior="smooth">
      <body>
        <AppSessionProvider>{children}</AppSessionProvider>
      </body>
    </html>
  );
}
