import { confirmLocalPasswordReset } from "@/lib/password-reset-store";

export async function POST(request) {
  try {
    const payload = await request.json();
    const result = confirmLocalPasswordReset(payload);

    return Response.json(result);
  } catch (error) {
    return Response.json(
      { error: error?.message || "Unable to reset password." },
      { status: error?.status || 500 }
    );
  }
}
