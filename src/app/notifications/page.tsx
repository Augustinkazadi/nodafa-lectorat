"use client";
import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function NotificationsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (status === "unauthenticated") router.push("/login");
    if (status === "authenticated") fetchNotifications();
  }, [status, router]);

  const fetchNotifications = async () => {
    try {
      const res = await fetch("/api/notifications");
      if (res.ok) setNotifications(await res.json());
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  const markAllAsRead = async () => {
    await fetch("/api/notifications", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });
    setNotifications([]);
  };

  if (loading) return <div style={{ padding: "50px", textAlign: "center", fontFamily: "Arial" }}>Chargement...</div>;

  return (
    <div style={{ padding: "40px", maxWidth: "800px", margin: "0 auto", fontFamily: "Segoe UI", background: "#f8fafc", minHeight: "100vh" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "30px" }}>
        <h1>🔔 Notifications</h1>
        <div style={{ display: "flex", gap: "10px" }}>
          <button onClick={markAllAsRead} style={{ padding: "8px 16px", background: "#1877f2", color: "white", border: "none", borderRadius: "6px", cursor: "pointer", fontWeight: "bold" }}>
            Tout marquer comme lu
          </button>
          <Link href="/journal" style={{ padding: "8px 16px", background: "#64748b", color: "white", borderRadius: "6px", textDecoration: "none", fontWeight: "bold" }}>
            Retour au journal
          </Link>
        </div>
      </div>

      {notifications.length === 0 ? (
        <p style={{ color: "#64748b", textAlign: "center" }}>Aucune notification pour le moment.</p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "15px" }}>
          {notifications.map((notif: any) => (
            <div
              key={notif.id}
              style={{
                background: notif.isRead ? "white" : "#e0e7ff",
                padding: "15px 20px",
                borderRadius: "12px",
                boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
              }}
            >
              <div style={{ fontWeight: "bold", fontSize: "15px", color: "#050505", marginBottom: "5px" }}>
                {notif.title}
              </div>
              <div style={{ color: "#475569", fontSize: "14px", marginBottom: "5px" }}>
                {notif.message}
              </div>
              {notif.url && (
                <Link href={notif.url} style={{ color: "#1877f2", fontSize: "13px", textDecoration: "none" }}>
                  Voir →
                </Link>
              )}
              <div style={{ fontSize: "11px", color: "#64748b", marginTop: "5px" }}>
                {new Date(notif.createdAt).toLocaleString("fr-FR")}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}