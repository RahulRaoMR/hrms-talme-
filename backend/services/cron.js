import cron from "node-cron";
import { releasePayrollEmails } from "@/services/emailAutomation";

let jobsStarted = false;

export function startEmailCronJobs() {
  if (jobsStarted) {
    return;
  }

  jobsStarted = true;

  cron.schedule("0 0 1 * *", async () => {
    const result = await releasePayrollEmails();
    console.log(
      `[email-cron] Payroll email run completed for ${result.periodLabel}: ${result.sent}/${result.eligible} delivered.`
    );
  });
}
