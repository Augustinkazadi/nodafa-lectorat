"use client";
import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import AppNavbar from "@/components/AppNavbar";

type WishPerson = { id: number; prenom: string; nom: string };

export default function NotificationsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [unreadCount, setUnreadCount] = useState({ notifications: 0, messages: 0 });
  const [wishOpen, setWishOpen] = useState(false);
  const [wishPeople, setWishPeople] = useState<WishPerson[]>([]);
  const [wishTo, setWishTo] = useState<number | "">("");
  const [wishText, setWishText] = useState("Joyeux anniversaire 🎂 Que le Seigneur te bénisse !");
  const [wishStatus, setWishStatus] = useState("");
  const [sendingWish, setSendingWish] = useState(false);

  useEffect(() => {
    if (status === "unauthenticated") router.push("/login");
    if (status === "authenticated") {
      fetchNotifications();
      fetch("/api/unread-count")
        .then((r) => (r.ok ? r.json() : null))
        .then((d) => d && setUnreadCount(d))
        .catch(() => null);
    }
  }, [status, router]);

  const fetchNotifications = async () => {
    try {
      const res = await fetch("/api/notifications");
      if (res.ok) setNotifications(await res.json());
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };

  const markAllAsRead = async () => {
    await fetch("/api/notifications", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });
    fetchNotifications();
  };

  const openWishFromNotif = async (notif: any) => {
    await fetch("/api/notifications", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: notif.id }),
    });

    const isBirthday = String(notif.kind || "").startsWith("BIRTHDAY") || String(notif.title || "").toLowerCase().includes("anniversaire");
    if (!isBirthday) {
      const target = notif.url || "/journal";
      // Forcer une navigation complète pour que le journal relise ?post=
      if (typeof window !== "undefined" && String(target).startsWith("/journal")) {
        window.location.assign(target);
      } else {
        router.push(target);
      }
      return;
    }

    const idsFromUrl = String(notif.url || "")
      .split("ids=")[1]
      ?.split("&")[0]
      ?.split(",")
      .map((x: string) => parseInt(x, 10))
      .filter((n: number) => !Number.isNaN(n));

    try {
      const res = await fetch("/api/users");
      const users = res.ok ? await res.json() : [];
      const people: WishPerson[] = (users || [])
        .filter((u: any) => (idsFromUrl?.length ? idsFromUrl.includes(u.id) : true))
        .filter((u: any) => u.id !== parseInt((session?.user as any)?.id || "0"))
        .map((u: any) => ({ id: u.id, prenom: u.prenom, nom: u.nom }));

      // Si URL sans ids, on tente d'extraire les noms du message
      let finalPeople = people;
      if (!idsFromUrl?.length) {
        finalPeople = (users || [])
          .filter((u: any) => String(notif.message || "").includes(`${u.prenom} ${u.nom}`))
          .map((u: any) => ({ id: u.id, prenom: u.prenom, nom: u.nom }));
      }

      setWishPeople(finalPeople);
      setWishTo(finalPeople[0]?.id || "");
      setWishText("Joyeux anniversaire 🎂 Que le Seigneur te bénisse abondamment !");
      setWishStatus("");
      setWishOpen(true);
      fetchNotifications();
    } catch {
      setWishStatus("Impossible de charger les destinataires");
      setWishOpen(true);
    }
  };

  const sendWish = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!wishTo || !wishText.trim()) return;
    setSendingWish(true);
    setWishStatus("Envoi...");
    try {
      const formData = new FormData();
      formData.append("content", wishText.trim());
      formData.append("receiverId", String(wishTo));
      const res = await fetch("/api/messages", { method: "POST", body: formData });
      if (res.ok) {
        setWishStatus("✅ Souhait envoyé !");
        setTimeout(() => {
          setWishOpen(false);
          router.push("/messages");
        }, 700);
      } else {
        const err = await res.json().catch(() => ({}));
        setWishStatus(err.message || "Envoi impossible");
      }
    } catch {
      setWishStatus("Envoi impossible");
    } finally {
      setSendingWish(false);
    }
  };

  if (loading || status === "loading") {
    return <div style={{ padding: 50, textAlign: "center" }}>Chargement...</div>;
  }

  return (
    <div style={{ minHeight: "100vh" }}>
      <AppNavbar
        userName={session?.user?.name}
        userPhoto={session?.user?.image}
        isAdmin={(session?.user as any)?.role === "ADMIN"}
        unreadNotifications={unreadCount.notifications}
        unreadMessages={unreadCount.messages}
        active="notifications"
      />

      <div style={{ maxWidth: 760, margin: "0 auto", padding: "20px 16px 28px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, marginBottom: 20, flexWrap: "wrap" }}>
          <div>
            <h1 style={{ margin: 0, fontFamily: "var(--font-display)", fontSize: 28 }}>Notifications</h1>
            <p style={{ margin: "6px 0 0", color: "var(--muted)" }}>Bonjour {session?.user?.name?.split(" ")[0]}</p>
          </div>
          <button onClick={markAllAsRead} className="nodafa-btn nodafa-btn-primary">
            Tout marquer lu
          </button>
        </div>

        {notifications.length === 0 ? (
          <div className="nodafa-card" style={{ padding: 28, textAlign: "center", color: "var(--muted)" }}>
            Aucune notification pour le moment.
          </div>
        ) : (
          <div style={{ display: "grid", gap: 12 }}>
            {notifications.map((notif) => {
              const isBirthday =
                String(notif.kind || "").startsWith("BIRTHDAY") ||
                String(notif.title || "").toLowerCase().includes("anniversaire");
              return (
                <article
                  key={notif.id}
                  className="nodafa-card nodafa-rise"
                  style={{
                    padding: 18,
                    background: notif.isRead ? "var(--bg-elevated)" : "linear-gradient(180deg, var(--brand-soft), var(--bg-elevated))",
                    borderColor: isBirthday ? "var(--brand)" : undefined,
                  }}
                >
                  <div style={{ fontWeight: 800, marginBottom: 6 }}>{notif.title}</div>
                  <div style={{ color: "var(--ink)", lineHeight: 1.5 }}>{notif.message}</div>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 10, marginTop: 12, alignItems: "center" }}>
                    <span style={{ fontSize: 12, color: "var(--muted)" }}>
                      {new Date(notif.createdAt).toLocaleString("fr-FR", { timeZone: "Africa/Kinshasa" })}
                    </span>
                    <button
                      type="button"
                      onClick={() => openWishFromNotif(notif)}
                      style={{
                        border: "none",
                        background: "transparent",
                        color: "var(--brand)",
                        fontWeight: 700,
                        cursor: "pointer",
                        fontSize: 13,
                      }}
                    >
                      {isBirthday
                        ? "Écrire un souhait →"
                        : String(notif.kind || "") === "LIVE_STARTED" || String(notif.title || "").toLowerCase().includes("live")
                          ? "Rejoindre le live →"
                          : String(notif.kind || "") === "PROFILE_UPDATE" || String(notif.title || "").toLowerCase().includes("profil")
                            ? "Voir le profil →"
                            : String(notif.kind || "").includes("COMMENT") || String(notif.title || "").toLowerCase().includes("commentaire")
                              ? "Voir la publication →"
                              : "Ouvrir →"}
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>

      {wishOpen && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(15,23,42,0.45)",
            zIndex: 300,
            display: "grid",
            placeItems: "center",
            padding: 16,
          }}
          onClick={() => setWishOpen(false)}
        >
          <form
            className="nodafa-card"
            onClick={(e) => e.stopPropagation()}
            onSubmit={sendWish}
            style={{ width: "min(440px, 100%)", padding: 20 }}
          >
            <h3 style={{ margin: "0 0 8px", fontFamily: "var(--font-display)" }}>Souhait d&apos;anniversaire</h3>
            <p style={{ margin: "0 0 14px", color: "var(--muted)", fontSize: 14 }}>
              Choisissez la personne et écrivez votre message. Il sera envoyé en discussion privée.
            </p>

            <label style={{ display: "block", fontWeight: 700, fontSize: 13, marginBottom: 6 }}>Destinataire</label>
            <select
              value={wishTo}
              onChange={(e) => setWishTo(e.target.value ? parseInt(e.target.value, 10) : "")}
              required
              style={{
                width: "100%",
                padding: "12px 14px",
                borderRadius: 12,
                border: "1px solid var(--line)",
                marginBottom: 12,
                background: "var(--bg-soft)",
                color: "var(--ink)",
              }}
            >
              <option value="">Choisir...</option>
              {wishPeople.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.prenom} {p.nom}
                </option>
              ))}
            </select>

            <label style={{ display: "block", fontWeight: 700, fontSize: 13, marginBottom: 6 }}>Votre souhait</label>
            <textarea
              value={wishText}
              onChange={(e) => setWishText(e.target.value)}
              required
              rows={4}
              style={{
                width: "100%",
                padding: 12,
                borderRadius: 12,
                border: "1px solid var(--line)",
                resize: "vertical",
                fontFamily: "inherit",
                marginBottom: 12,
                background: "var(--bg-soft)",
                color: "var(--ink)",
                caretColor: "var(--ink)",
              }}
            />

            {wishStatus && <p style={{ margin: "0 0 10px", fontWeight: 700 }}>{wishStatus}</p>}

            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
              <button type="button" className="nodafa-btn nodafa-btn-ghost" onClick={() => setWishOpen(false)}>
                Annuler
              </button>
              <button type="submit" className="nodafa-btn nodafa-btn-primary" disabled={sendingWish || !wishTo}>
                {sendingWish ? "Envoi..." : "Envoyer"}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
