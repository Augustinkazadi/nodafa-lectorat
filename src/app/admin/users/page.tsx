"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function AdminUsersRedirect() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/dashboard/membres");
  }, [router]);
  return <div style={{ padding: 40, textAlign: "center" }}>Redirection...</div>;
}
