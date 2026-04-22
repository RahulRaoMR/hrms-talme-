import { NextResponse } from "next/server";

export async function POST(request) {
  const body = await request.json();

  const email = body?.email?.trim() || "director@talme.ai";
  const role = body?.role?.trim() || "Enterprise Admin";

  return NextResponse.json({
    user: {
      name: email.split("@")[0].replace(/[._-]/g, " "),
      email,
      role
    }
  });
}
