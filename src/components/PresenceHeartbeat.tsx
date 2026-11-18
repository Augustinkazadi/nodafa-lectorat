"use client";

import { useEffect } from "react";
import { useSession } from "next-auth/react";

/** Envoie un signal de présence tant que l'utilisateur est connecté. */
export default function PresenceHeartbeat() {
  const { status } = useSession();

  useEffect(() => {
    if (status !== "authenticated") return;

    let stopped = false;

    const ping = () => {
      if (stopped || document.visibilityState === "hidden") return;
      fetch("/api/presence", { method: "POST" }).catch(() => null);
    };

    ping();
    const interval = window.setInterval(ping, 45000);

    const onVisible = () => {
      if (document.visibilityState === "visible") ping();
    };
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      stopped = true;
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [status]);

  return null;
}
