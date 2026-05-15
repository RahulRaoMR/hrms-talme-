import { requestLocalPasswordReset } from "@/lib/password-reset-store";

export async function POST(request) {
  try {
    const payload = await request.json();
    const result = await requestLocalPasswordReset(payload);

    return Response.json(result);
  } catch (error) {
    return Response.json(
      { error: error?.message || "Unable to send OTP." },
      { status: error?.status || 500 }
    );
  }
}
