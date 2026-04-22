import LoginPageClient from "@/components/pages/login-page";
import { auth } from "@/auth";
import { redirect } from "next/navigation";

export default async function LoginPage() {
  const session = await auth();

  if (session?.user) {
    redirect("/dashboard");
  }

  return <LoginPageClient />;
}
