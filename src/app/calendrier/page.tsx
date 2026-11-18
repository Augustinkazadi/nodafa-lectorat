"use client";
import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import AppNavbar from "@/components/AppNavbar";

export default function CalendrierPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [unreadCount, setUnreadCount] = useState({ notifications: 0, messages: 0 });

  const isAdmin = (session?.user as any)?.role === "ADMIN";

  useEffect(() => {
    if (status === "unauthenticated") router.push("/login");
    if (status === "authenticated") {
      fetchEvents();
      fetch("/api/unread-count")
        .then((r) => (r.ok ? r.json() : null))
        .then((d) => d && setUnreadCount(d))
        .catch(() => null);
    }
  }, [status, router]);

  const fetchEvents = async () => {
    const res = await fetch("/api/liturgical");
    if (res.ok) setEvents(await res.json());
    setLoading(false);
  };

  const getColorCode = (couleur: string) => {
    const map: Record<string, string> = {
      Vert: "#22c55e",
      Rouge: "#dc2626",
      Blanc: "#f8fafc",
      Violet: "#8b5cf6",
      Rose: "#f472b6",
      vert: "#22c55e",
      rouge: "#dc2626",
      blanc: "#f8fafc",
      violet: "#8b5cf6",
      rose: "#f472b6",
    };
    return map[couleur] || "#64748b";
  };

  if (loading || status === "loading") {
    return <div style={{ padding: 50, textAlign: "center" }}>Chargement...</div>;
  }

  return (
    <div style={{ minHeight: "100vh" }}>
      <AppNavbar
        userName={session?.user?.name}
        userPhoto={session?.user?.image}
        isAdmin={isAdmin}
        unreadNotifications={unreadCount.notifications}
        unreadMessages={unreadCount.messages}
        active="calendrier"
      />

      <div style={{ padding: "20px 16px 28px", maxWidth: 1000, margin: "0 auto" }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "flex-start", flexWrap: "wrap", marginBottom: 18 }}>
          <div>
            <h1 style={{ margin: 0, fontFamily: "var(--font-display)", fontSize: 28 }}>Calendrier liturgique</h1>
            <p style={{ margin: "6px 0 0", color: "var(--muted)" }}>Fêtes et couleurs — hors du Journal</p>
          </div>
          {isAdmin && (
            <Link href="/dashboard" className="nodafa-btn nodafa-btn-primary" style={{ textDecoration: "none" }}>
              + Ajouter (Admin)
            </Link>
          )}
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {events.map((event: any) => {
            const bg = getColorCode(event.color || "");
            const darkText = ["Blanc", "blanc", "Rose", "rose"].includes(event.color || "");
            return (
              <div
                key={event.id}
                style={{
                  display: "flex",
                  background: bg,
                  color: darkText ? "var(--bg-soft)" : "white",
                  padding: "14px 16px",
                  borderRadius: 14,
                  alignItems: "center",
                  gap: 14,
                  flexWrap: "wrap",
                  border: darkText ? "1px solid var(--line)" : "none",
                }}
              >
                <div
                  style={{
                    fontSize: 13,
                    fontWeight: 700,
                    background: darkText ? "rgba(15,23,42,0.08)" : "rgba(0,0,0,0.18)",
                    padding: "6px 10px",
                    borderRadius: 8,
                  }}
                >
                  {new Date(event.date).toLocaleDateString("fr-FR", {
                    weekday: "short",
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                  })}
                </div>
                <div style={{ flex: 1, minWidth: 160 }}>
                  <div style={{ fontWeight: 800 }}>{event.title}</div>
                  {event.note && <div style={{ fontSize: 14, opacity: 0.92 }}>{event.note}</div>}
                  {event.color && (
                    <div style={{ fontSize: 12, marginTop: 4, opacity: 0.85 }}>Couleur : {event.color}</div>
                  )}
                </div>
              </div>
            );
          })}
          {events.length === 0 && (
            <div className="nodafa-card" style={{ padding: 24, textAlign: "center", color: "var(--muted)" }}>
              Aucun événement liturgique pour le moment.
              {isAdmin && (
                <div style={{ marginTop: 12 }}>
                  <Link href="/dashboard" style={{ color: "var(--brand)", fontWeight: 700 }}>
                    Publier depuis Admin →
                  </Link>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
