import "./globals.css";
import AppSessionProvider from "@/components/session-provider";

export const metadata = {
  title: "Talme HRMS Suite",
  description: "Premium ATS, HRMS, VMS, payroll, attendance, and vendor payment suite."
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <AppSessionProvider>{children}</AppSessionProvider>
      </body>
    </html>
  );
}
