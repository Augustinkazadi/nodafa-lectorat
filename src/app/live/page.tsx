"use client";

import { useEffect, useRef, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import AppNavbar from "@/components/AppNavbar";
import PlatformLiveRoom, { type PlatformLiveRoomHandle } from "@/components/PlatformLiveRoom";
import { LIVE_EVENT_TYPES, liveEventLabel } from "@/lib/liveEvents";

type LiveItem = {
  id: number;
  title: string;
  eventType?: string | null;
  description?: string | null;
  roomName?: string | null;
  replayUrl?: string | null;
  isActive: boolean;
  createdAt: string;
  likesCount?: number;
  commentsCount?: number;
  likedByMe?: boolean;
  comments?: any[];
};

export default function LivePage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const roomRef = useRef<PlatformLiveRoomHandle>(null);

  const [lives, setLives] = useState<LiveItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [unreadCount, setUnreadCount] = useState({ notifications: 0, messages: 0 });
  const [publishMode, setPublishMode] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [stopping, setStopping] = useState(false);
  const [commentText, setCommentText] = useState("");
  const [replayId, setReplayId] = useState<number | null>(null);
  const [form, setForm] = useState({ title: "", eventType: "fete", description: "" });
  const [launching, setLaunching] = useState(false);

  const isAdmin = (session?.user as any)?.role === "ADMIN";

  useEffect(() => {
    if (status === "unauthenticated") router.push("/login");
  }, [status, router]);

  useEffect(() => {
    if (status !== "authenticated") return;
    loadLives();
    fetch("/api/unread-count")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => d && setUnreadCount(d))
      .catch(() => null);
    const t = window.setInterval(loadLives, 15000);
    return () => window.clearInterval(t);
  }, [status]);

  useEffect(() => {
    if (isAdmin && lives.some((l) => l.isActive)) setPublishMode(true);
  }, [isAdmin, lives]);

  const loadLives = async () => {
    try {
      const res = await fetch("/api/lives");
      if (res.ok) setLives(await res.json());
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
    }
  };

  const startLive = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim()) return;
    setLaunching(true);
    try {
      const res = await fetch("/api/lives", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (res.ok) {
        setShowForm(false);
        setPublishMode(true);
        setForm({ title: "", eventType: "fete", description: "" });
        await loadLives();
      } else {
        const data = await res.json().catch(() => ({}));
        alert(data.message || "Impossible de lancer la diffusion");
      }
    } finally {
      setLaunching(false);
    }
  };

  const stopLive = async (id: number) => {
    setStopping(true);
    try {
      let replayUrl: string | null = null;
      if (publishMode && roomRef.current) {
        replayUrl = await roomRef.current.finalizeRecording();
      }
      await fetch("/api/lives", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, isActive: false, ...(replayUrl ? { replayUrl } : {}) }),
      });
      setPublishMode(false);
      await loadLives();
      if (replayUrl) alert("Diffusion arrêtée. La rediffusion est disponible pour ceux qui ont raté l’événement.");
    } finally {
      setStopping(false);
    }
  };

  const toggleLike = async (liveId: number) => {
    const res = await fetch(`/api/lives/${liveId}/like`, { method: "POST" });
    if (!res.ok) return;
    const data = await res.json();
    setLives((prev) =>
      prev.map((l) => (l.id === liveId ? { ...l, likedByMe: data.liked, likesCount: data.count } : l))
    );
  };

  const sendComment = async (liveId: number) => {
    if (!commentText.trim()) return;
    const res = await fetch(`/api/lives/${liveId}/comment`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: commentText }),
    });
    if (!res.ok) return;
    const comment = await res.json();
    setCommentText("");
    setLives((prev) =>
      prev.map((l) =>
        l.id === liveId
          ? {
              ...l,
              comments: [...(l.comments || []), comment],
              commentsCount: (l.commentsCount || 0) + 1,
            }
          : l
      )
    );
  };

  if (status === "loading" || loading) {
    return <div style={{ padding: 50, textAlign: "center" }}>Chargement…</div>;
  }

  const active = lives.find((l) => l.isActive);
  const past = lives.filter((l) => !l.isActive).slice(0, 20);
  const watchingReplay = !active && replayId ? lives.find((l) => l.id === replayId) : null;

  return (
    <div style={{ minHeight: "100vh", background: "#0b1220", color: "#f8fafc" }}>
      <AppNavbar
        userName={session?.user?.name}
        userPhoto={session?.user?.image}
        isAdmin={isAdmin}
        unreadNotifications={unreadCount.notifications}
        unreadMessages={unreadCount.messages}
        active="live"
      />

      <main style={{ maxWidth: 960, margin: "0 auto", padding: "18px 16px 40px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "flex-start", flexWrap: "wrap", marginBottom: 16 }}>
          <div>
            <h1 style={{ margin: 0, fontFamily: "var(--font-display)", fontSize: 30 }}>Événements en direct</h1>
            <p style={{ margin: "6px 0 0", color: "#94a3b8", maxWidth: 560, lineHeight: 1.45 }}>
              Fêtes, excursions, journées d’amitié… Aimez, commentez, et revoyez les rediffusions si vous avez raté le direct.
            </p>
          </div>
          {isAdmin && (
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {!active ? (
                <button type="button" onClick={() => setShowForm(true)} style={dangerBtn}>
                  Diffuser un événement
                </button>
              ) : (
                <>
                  <button type="button" onClick={() => setPublishMode(true)} style={ghostBtn}>
                    Mode diffuseur
                  </button>
                  <button type="button" onClick={() => stopLive(active.id)} disabled={stopping} style={dangerBtn}>
                    {stopping ? "Sauvegarde…" : "Arrêter + enregistrer"}
                  </button>
                </>
              )}
              <Link href="/dashboard/lives" style={{ ...ghostBtn, textDecoration: "none", display: "inline-flex", alignItems: "center" }}>
                Historique
              </Link>
            </div>
          )}
        </div>

        {active?.roomName ? (
          <section style={playerCard}>
            <div style={{ padding: "12px 16px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6, flexWrap: "wrap" }}>
                <span style={liveBadge}>● EN DIRECT</span>
                <span style={typeBadge}>{liveEventLabel(active.eventType)}</span>
              </div>
              <strong style={{ fontSize: 18, display: "block" }}>{active.title}</strong>
              {active.description && <p style={{ margin: "8px 0 0", color: "#94a3b8", fontSize: 14 }}>{active.description}</p>}
            </div>
            <div style={{ padding: "0 8px 8px" }}>
              <PlatformLiveRoom
                ref={roomRef}
                roomName={active.roomName}
                displayName={session?.user?.name || "Membre"}
                isPublisher={!!(isAdmin && publishMode)}
                record={!!(isAdmin && publishMode)}
                height={480}
              />
            </div>
            <LiveSocial
              live={active}
              commentText={commentText}
              setCommentText={setCommentText}
              onLike={() => toggleLike(active.id)}
              onComment={() => sendComment(active.id)}
              userPhoto={session?.user?.image}
              userName={session?.user?.name || "U"}
            />
          </section>
        ) : watchingReplay?.replayUrl ? (
          <section style={playerCard}>
            <div style={{ padding: "12px 16px", display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
              <div>
                <div style={{ display: "flex", gap: 8, marginBottom: 6, flexWrap: "wrap" }}>
                  <span style={{ ...liveBadge, background: "#334155" }}>REDIF</span>
                  <span style={typeBadge}>{liveEventLabel(watchingReplay.eventType)}</span>
                </div>
                <strong style={{ fontSize: 18 }}>{watchingReplay.title}</strong>
              </div>
              <button type="button" onClick={() => setReplayId(null)} style={ghostBtn}>
                Fermer
              </button>
            </div>
            <div style={{ padding: "0 8px 8px" }}>
              <video
                src={watchingReplay.replayUrl}
                controls
                playsInline
                style={{ width: "100%", maxHeight: 480, background: "#000", borderRadius: 12 }}
              />
            </div>
            <LiveSocial
              live={watchingReplay}
              commentText={commentText}
              setCommentText={setCommentText}
              onLike={() => toggleLike(watchingReplay.id)}
              onComment={() => sendComment(watchingReplay.id)}
              userPhoto={session?.user?.image}
              userName={session?.user?.name || "U"}
            />
          </section>
        ) : (
          <section style={{ background: "#111827", borderRadius: 16, padding: 28, textAlign: "center", border: "1px solid #1f2937" }}>
            <div style={{ fontSize: 42, marginBottom: 10 }}>🎉</div>
            <h2 style={{ margin: "0 0 8px", fontSize: 22 }}>Aucune diffusion en cours</h2>
            <p style={{ margin: 0, color: "#94a3b8", lineHeight: 1.5 }}>
              Choisissez une rediffusion ci-dessous, ou attendez le prochain événement en direct.
            </p>
            {isAdmin && (
              <button type="button" onClick={() => setShowForm(true)} style={{ ...dangerBtn, marginTop: 16 }}>
                Diffuser un événement maintenant
              </button>
            )}
          </section>
        )}

        {past.length > 0 && (
          <section style={{ marginTop: 22 }}>
            <h2 style={{ margin: "0 0 12px", fontSize: 18 }}>Rediffusions & événements passés</h2>
            <div style={{ display: "grid", gap: 8 }}>
              {past.map((live) => (
                <div key={live.id} style={pastCard}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 12, color: "#fca5a5", marginBottom: 4 }}>{liveEventLabel(live.eventType)}</div>
                    <div style={{ fontWeight: 700 }}>{live.title}</div>
                    <div style={{ color: "#94a3b8", fontSize: 13, marginTop: 2 }}>
                      {new Date(live.createdAt).toLocaleString("fr-FR")} · 👍 {live.likesCount || 0} · 💬 {live.commentsCount || 0}
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
                    <button type="button" onClick={() => toggleLike(live.id)} style={ghostBtn}>
                      {live.likedByMe ? "💙 Aimé" : "👍 J’aime"}
                    </button>
                    {live.replayUrl ? (
                      <button
                        type="button"
                        onClick={() => {
                          setReplayId(live.id);
                          window.scrollTo({ top: 0, behavior: "smooth" });
                        }}
                        style={dangerBtn}
                      >
                        ▶ Revoir
                      </button>
                    ) : (
                      <span style={{ color: "#64748b", fontSize: 12 }}>Pas encore de vidéo</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}
      </main>

      {showForm && (
        <div role="dialog" aria-modal="true" onClick={() => !launching && setShowForm(false)} style={modalOverlay}>
          <form onClick={(e) => e.stopPropagation()} onSubmit={startLive} style={modalCard}>
            <h3 style={{ margin: "0 0 6px", fontFamily: "var(--font-display)" }}>Diffuser un événement</h3>
            <p style={{ margin: "0 0 14px", color: "#94a3b8", fontSize: 13 }}>
              La vidéo sera enregistrée pour la rediffusion. Les membres pourront aimer et commenter.
            </p>
            <label style={labelStyle}>Type d’événement</label>
            <select value={form.eventType} onChange={(e) => setForm({ ...form, eventType: e.target.value })} style={inputStyle} required>
              {LIVE_EVENT_TYPES.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.emoji} {t.label}
                </option>
              ))}
            </select>
            <label style={labelStyle}>Titre</label>
            <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Ex: Journée d’amitié à Gombe" required style={inputStyle} />
            <label style={labelStyle}>Description (optionnel)</label>
            <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={3} style={{ ...inputStyle, resize: "vertical" }} />
            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 8 }}>
              <button type="button" onClick={() => setShowForm(false)} disabled={launching} style={ghostBtn}>
                Annuler
              </button>
              <button type="submit" disabled={launching || !form.title.trim()} style={dangerBtn}>
                {launching ? "Lancement…" : "Lancer la diffusion"}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

function LiveSocial({
  live,
  commentText,
  setCommentText,
  onLike,
  onComment,
  userPhoto,
  userName,
}: {
  live: LiveItem;
  commentText: string;
  setCommentText: (v: string) => void;
  onLike: () => void;
  onComment: () => void;
  userPhoto?: string | null;
  userName: string;
}) {
  return (
    <div style={{ padding: "12px 16px 16px", borderTop: "1px solid #1f2937" }}>
      <div style={{ display: "flex", gap: 10, marginBottom: 12 }}>
        <button type="button" onClick={onLike} style={{ ...ghostBtn, color: live.likedByMe ? "#60a5fa" : "#e2e8f0" }}>
          {live.likedByMe ? "💙" : "👍"} {live.likesCount || 0} J’aime
        </button>
        <span style={{ ...ghostBtn, cursor: "default" }}>💬 {live.commentsCount || live.comments?.length || 0}</span>
      </div>

      <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
        <Avatar src={userPhoto} name={userName} size={32} />
        <input
          value={commentText}
          onChange={(e) => setCommentText(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && onComment()}
          placeholder="Écrire un commentaire sur l’événement…"
          style={{
            flex: 1,
            border: "1px solid #334155",
            background: "#0b1220",
            color: "#f8fafc",
            borderRadius: 18,
            padding: "8px 14px",
            outline: "none",
          }}
        />
        <button type="button" onClick={onComment} disabled={!commentText.trim()} style={dangerBtn}>
          Publier
        </button>
      </div>

      <div style={{ display: "grid", gap: 8, maxHeight: 240, overflowY: "auto" }}>
        {(live.comments || []).length === 0 && <div style={{ color: "#64748b", fontSize: 13 }}>Soyez le premier à commenter.</div>}
        {(live.comments || []).map((c) => (
          <div key={c.id} style={{ display: "flex", gap: 8 }}>
            <Avatar src={c.user?.photo} name={c.user?.prenom || "U"} size={28} />
            <div style={{ background: "#1e293b", borderRadius: 12, padding: "8px 10px", flex: 1 }}>
              <strong style={{ fontSize: 13 }}>
                {c.user?.prenom} {c.user?.nom}
              </strong>
              <div style={{ fontSize: 14, marginTop: 2 }}>{c.content}</div>
              <div style={{ fontSize: 11, color: "#64748b", marginTop: 4 }}>{new Date(c.createdAt).toLocaleString("fr-FR")}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function Avatar({ src, name, size }: { src?: string | null; name: string; size: number }) {
  if (src) return <img src={src} alt="" style={{ width: size, height: size, borderRadius: "50%", objectFit: "cover" }} />;
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: "50%",
        background: "#1877f2",
        color: "#fff",
        display: "grid",
        placeItems: "center",
        fontWeight: 800,
        fontSize: size * 0.4,
        flexShrink: 0,
      }}
    >
      {(name || "U").charAt(0).toUpperCase()}
    </div>
  );
}

const playerCard: React.CSSProperties = {
  background: "#111827",
  borderRadius: 16,
  overflow: "hidden",
  border: "1px solid rgba(248,113,113,0.35)",
  boxShadow: "0 12px 40px rgba(220,38,38,0.18)",
};

const pastCard: React.CSSProperties = {
  padding: "12px 14px",
  borderRadius: 12,
  background: "#111827",
  border: "1px solid #1f2937",
  display: "flex",
  justifyContent: "space-between",
  gap: 10,
  flexWrap: "wrap",
  alignItems: "center",
};

const liveBadge: React.CSSProperties = {
  background: "#dc2626",
  color: "#fff",
  fontWeight: 800,
  fontSize: 11,
  letterSpacing: "0.06em",
  padding: "3px 8px",
  borderRadius: 999,
};

const typeBadge: React.CSSProperties = {
  background: "#1e293b",
  color: "#e2e8f0",
  fontWeight: 700,
  fontSize: 12,
  padding: "3px 8px",
  borderRadius: 999,
};

const dangerBtn: React.CSSProperties = {
  border: "none",
  background: "#dc2626",
  color: "#fff",
  fontWeight: 700,
  padding: "10px 14px",
  borderRadius: 10,
  cursor: "pointer",
  fontSize: 14,
};

const ghostBtn: React.CSSProperties = {
  border: "1px solid #334155",
  background: "transparent",
  color: "#e2e8f0",
  fontWeight: 700,
  padding: "10px 14px",
  borderRadius: 10,
  cursor: "pointer",
  fontSize: 14,
};

const labelStyle: React.CSSProperties = {
  display: "block",
  fontSize: 12,
  fontWeight: 700,
  color: "#94a3b8",
  marginBottom: 6,
  marginTop: 10,
};

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "10px 12px",
  borderRadius: 10,
  border: "1px solid #334155",
  background: "#0b1220",
  color: "#f8fafc",
  font: "inherit",
  boxSizing: "border-box",
};

const modalOverlay: React.CSSProperties = {
  position: "fixed",
  inset: 0,
  background: "rgba(0,0,0,0.55)",
  zIndex: 1300,
  display: "grid",
  placeItems: "center",
  padding: 16,
};

const modalCard: React.CSSProperties = {
  width: "min(440px, 100%)",
  background: "#111827",
  borderRadius: 16,
  padding: 20,
  border: "1px solid #334155",
};
