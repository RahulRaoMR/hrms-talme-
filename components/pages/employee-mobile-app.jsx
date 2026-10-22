"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import EmployeePhoneApp from "./employee-phone-app";
import EmployeeSessionLoading from "@/components/employee-session-loading";
import { isEmployeeMobileApp, restoreEmployeeMobileSession, employeeMobileFetch } from "@/lib/employee-mobile-session";
import "./employee-app.css";

export default function EmployeeMobileApp() {
  const router = useRouter();
  const [data, setData] = useState(null);
  const [user, setUser] = useState(null);
  const [error, setError] = useState("");
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    let active = true;
    const signIn = () => { setData(null); setUser(null); router.replace("/employee-app/login"); };
    window.addEventListener("talme-employee-session-ended", signIn);
    (async () => {
      try {
        setError("");
        if (!isEmployeeMobileApp()) { signIn(); return; }
        const session = await restoreEmployeeMobileSession();
        if (!active) return;
        if (!session) { signIn(); return; }
        const response = await employeeMobileFetch("/api/hrms");
        if (!response.ok) throw new Error("Unable to load your employee details. Please retry.");
        const next = await response.json();
        if (active) { setUser(session.user); setData(next); }
      } catch (failure) {
        if (active) { if (failure.status === 401) signIn(); else setError("Unable to connect. Your session is saved. Check your connection and retry."); }
      }
    })();
    return () => { active = false; window.removeEventListener("talme-employee-session-ended", signIn); };
  }, [retry, router]);
  if (!data || !user) return <EmployeeSessionLoading error={error} onRetry={() => setRetry((value) => value + 1)} />;
  return <EmployeePhoneApp data={data} employeeId={user.employeeId} />;
}
