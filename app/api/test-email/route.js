import { getEmailDiagnostics } from "@/lib/email-diagnostics";

export async function GET() {
  return Response.json(getEmailDiagnostics());
}
