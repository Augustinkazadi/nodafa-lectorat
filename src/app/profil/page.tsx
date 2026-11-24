"use client";

import { useEffect, useRef, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import AppNavbar from "@/components/AppNavbar";
import PhotoLightbox from "@/components/PhotoLightbox";
import { uploadMediaFile } from "@/lib/clientUpload";

type Profile = {
  id: number;
  email: string;
  nom: string;
  prenom: string;
  telephone?: string | null;
  dateNaissance?: string | null;
  photo?: string | null;
  coverPhoto?: string | null;
  bio?: string | null;
  role?: string;
  isOwnProfile?: boolean;
  posts?: any[];
  postsCount?: number;
};

export default function ProfilPage() {
  const { data: session, status, update: updateSession } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const viewId = searchParams.get("id");

  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(false);
  const [statusMsg, setStatusMsg] = useState("");
  const [unreadCount, setUnreadCount] = useState({ notifications: 0, messages: 0 });
  const [lightbox, setLightbox] = useState<{ images: string[]; index: number; alt: string } | null>(null);
  const [form, setForm] = useState({
    prenom: "",
    nom: "",
    telephone: "",
    dateNaissance: "",
    bio: "",
  });

  const avatarInputRef = useRef<HTMLInputElement>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);

  const openPhoto = (url: string | null | undefined, alt: string) => {
    if (!url) return;
    setLightbox({ images: [url], index: 0, alt });
  };

  useEffect(() => {
    if (status === "unauthenticated") router.push("/login");
  }, [status, router]);

  useEffect(() => {
    if (status !== "authenticated") return;
    loadProfile();
    fetch("/api/unread-count")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => d && setUnreadCount(d))
      .catch(() => null);
  }, [status, viewId]);

  const loadProfile = async () => {
    setLoading(true);
    try {
      const qs = viewId ? `?id=${encodeURIComponent(viewId)}` : "";
      const res = await fetch(`/api/auth/profil${qs}`);
      if (!res.ok) throw new Error("Profil indisponible");
      const data = await res.json();
      setProfile(data);
      setForm({
        prenom: data.prenom || "",
        nom: data.nom || "",
        telephone: data.telephone || "",
        dateNaissance: data.dateNaissance ? String(data.dateNaissance).slice(0, 10) : "",
        bio: data.bio || "",
      });
    } catch {
      setStatusMsg("Impossible de charger le profil.");
    } finally {
      setLoading(false);
    }
  };

  const saveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile?.isOwnProfile) return;
    setSaving(true);
    setStatusMsg("");
    try {
      const res = await fetch("/api/auth/profil", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message || "Enregistrement impossible");
      setProfile((p) => (p ? { ...p, ...data } : data));
      setEditing(false);
      setStatusMsg("Profil mis à jour.");
      await updateSession?.({
        name: `${data.prenom} ${data.nom}`,
        image: data.photo,
      });
    } catch (err: any) {
      setStatusMsg(err?.message || "Erreur");
    } finally {
      setSaving(false);
    }
  };

  const uploadImage = async (file: File, kind: "avatar" | "cover") => {
    if (!profile?.isOwnProfile) return;
    setStatusMsg(kind === "avatar" ? "Envoi de la photo…" : "Envoi de la couverture…");
    try {
      const uploaded = await uploadMediaFile(file, "post");
      const body =
        kind === "avatar"
          ? { photo: uploaded.url, kind: "avatar" }
          : { coverPhoto: uploaded.url, kind: "cover" };
      const res = await fetch("/api/profile/photo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message || "Upload échoué");
      setProfile((p) =>
        p
          ? {
              ...p,
              photo: data.photo ?? p.photo,
              coverPhoto: data.coverPhoto ?? p.coverPhoto,
            }
          : p
      );
      if (kind === "avatar") {
        await updateSession?.({ image: data.photo });
      }
      setStatusMsg(kind === "avatar" ? "Photo de profil mise à jour." : "Photo de couverture mise à jour.");
    } catch (err: any) {
      setStatusMsg(err?.message || "Upload impossible");
    }
  };

  if (status === "loading" || loading) {
    return <div style={{ padding: 50, textAlign: "center" }}>Chargement du profil…</div>;
  }

  if (!profile) {
    return (
      <div style={{ padding: 50, textAlign: "center" }}>
        <p>{statusMsg || "Profil introuvable."}</p>
        <button type="button" onClick={() => router.push("/journal")} style={primaryBtn}>
          Retour au journal
        </button>
      </div>
    );
  }

  const fullName = `${profile.prenom} ${profile.nom}`.trim();
  const initial = (profile.prenom || "U").charAt(0).toUpperCase();

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg-soft)" }}>
      <AppNavbar
        userName={session?.user?.name}
        userPhoto={profile.isOwnProfile ? profile.photo || session?.user?.image : session?.user?.image}
        isAdmin={(session?.user as any)?.role === "ADMIN"}
        unreadNotifications={unreadCount.notifications}
        unreadMessages={unreadCount.messages}
        active="profil"
      />

      <input
        ref={avatarInputRef}
        type="file"
        accept="image/*"
        hidden
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) uploadImage(f, "avatar");
          e.target.value = "";
        }}
      />
      <input
        ref={coverInputRef}
        type="file"
        accept="image/*"
        hidden
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) uploadImage(f, "cover");
          e.target.value = "";
        }}
      />

      <main style={{ maxWidth: 940, margin: "0 auto", padding: "0 0 40px" }}>
        {/* Couverture + avatar */}
        <section
          style={{
            background: "var(--bg-elevated)",
            borderRadius: "0 0 12px 12px",
            boxShadow: "0 1px 2px rgba(0,0,0,0.08)",
            overflow: "hidden",
          }}
        >
          <div style={{ position: "relative", height: 220, background: "linear-gradient(135deg,#1e3a5f,#3b82f6)" }}>
            {profile.coverPhoto ? (
              <button
                type="button"
                onClick={() => openPhoto(profile.coverPhoto, `Couverture de ${fullName}`)}
                title="Agrandir la couverture"
                aria-label="Agrandir la photo de couverture"
                style={{
                  display: "block",
                  width: "100%",
                  height: "100%",
                  padding: 0,
                  border: "none",
                  cursor: "zoom-in",
                  background: "transparent",
                }}
              >
                <img
                  src={profile.coverPhoto}
                  alt={`Couverture de ${fullName}`}
                  style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
                />
              </button>
            ) : null}
            {profile.isOwnProfile && (
              <button
                type="button"
                onClick={() => coverInputRef.current?.click()}
                style={{
                  position: "absolute",
                  right: 16,
                  bottom: 16,
                  border: "none",
                  background: "rgba(255,255,255,0.95)",
                  borderRadius: 8,
                  padding: "8px 12px",
                  fontWeight: 700,
                  cursor: "pointer",
                  fontSize: 13,
                  zIndex: 2,
                }}
              >
                Modifier la couverture
              </button>
            )}
          </div>

          <div
            style={{
              display: "flex",
              gap: 16,
              alignItems: "flex-end",
              padding: "0 20px 18px",
              marginTop: -72,
              flexWrap: "wrap",
            }}
          >
            <div style={{ position: "relative" }}>
              {profile.photo ? (
                <button
                  type="button"
                  onClick={() => openPhoto(profile.photo, `Photo de ${fullName}`)}
                  title="Agrandir la photo de profil"
                  aria-label="Agrandir la photo de profil"
                  style={{
                    width: 148,
                    height: 148,
                    borderRadius: "50%",
                    border: "4px solid var(--bg-elevated)",
                    overflow: "hidden",
                    background: "var(--link)",
                    boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
                    padding: 0,
                    cursor: "zoom-in",
                    display: "block",
                  }}
                >
                  <img
                    src={profile.photo}
                    alt={`Photo de ${fullName}`}
                    style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
                  />
                </button>
              ) : (
                <div
                  style={{
                    width: 148,
                    height: 148,
                    borderRadius: "50%",
                    border: "4px solid var(--bg-elevated)",
                    overflow: "hidden",
                    background: "var(--link)",
                    boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
                    display: "grid",
                    placeItems: "center",
                    color: "#fff",
                    fontSize: 56,
                    fontWeight: 800,
                  }}
                >
                  {initial}
                </div>
              )}
              {profile.isOwnProfile && (
                <button
                  type="button"
                  onClick={() => avatarInputRef.current?.click()}
                  title="Changer la photo"
                  style={{
                    position: "absolute",
                    right: 6,
                    bottom: 6,
                    zIndex: 2,
                    width: 36,
                    height: 36,
                    borderRadius: "50%",
                    border: "none",
                    background: "var(--line-2)",
                    cursor: "pointer",
                    fontSize: 16,
                    boxShadow: "0 1px 3px rgba(0,0,0,0.2)",
                  }}
                >
                  📷
                </button>
              )}
            </div>

            <div style={{ flex: 1, minWidth: 200, paddingBottom: 4 }}>
              <h1 style={{ margin: "8px 0 4px", fontSize: 28, fontFamily: "var(--font-display)" }}>{fullName}</h1>
              <div style={{ color: (profile as any).online ? "var(--success)" : "var(--muted-2)", fontSize: 14, fontWeight: 700, marginBottom: 4 }}>
                ● {(profile as any).presenceLabel || ((profile as any).online ? "En ligne" : "Hors ligne")}
              </div>
              <div style={{ color: "var(--muted-2)", fontSize: 15 }}>
                {profile.postsCount || 0} publication{(profile.postsCount || 0) > 1 ? "s" : ""}
                {profile.role === "ADMIN" ? " · Administrateur" : " · Lecteur"}
              </div>
              {profile.bio && !editing && (
                <p style={{ margin: "8px 0 0", color: "var(--ink-strong)", lineHeight: 1.45 }}>{profile.bio}</p>
              )}
            </div>

            {profile.isOwnProfile && (
              <div style={{ display: "flex", gap: 8, paddingBottom: 8 }}>
                <button
                  type="button"
                  onClick={() => {
                    setEditing((v) => !v);
                    setStatusMsg("");
                  }}
                  style={primaryBtn}
                >
                  {editing ? "Fermer" : "Modifier le profil"}
                </button>
              </div>
            )}
          </div>
        </section>

        {statusMsg && (
          <div
            style={{
              margin: "12px 16px 0",
              padding: "10px 14px",
              borderRadius: 10,
              background: "var(--link-soft)",
              color: "var(--link)",
              fontWeight: 600,
              fontSize: 14,
            }}
          >
            {statusMsg}
          </div>
        )}

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "minmax(260px, 360px) 1fr",
            gap: 14,
            padding: "14px 16px 0",
          }}
          className="profil-grid"
        >
          {/* Infos */}
          <aside>
            <div style={card}>
              <h2 style={{ margin: "0 0 12px", fontSize: 18 }}>À propos</h2>
              {editing && profile.isOwnProfile ? (
                <form onSubmit={saveProfile} style={{ display: "grid", gap: 10 }}>
                  <Field label="Prénom">
                    <input
                      value={form.prenom}
                      onChange={(e) => setForm({ ...form, prenom: e.target.value })}
                      required
                      style={inputStyle}
                    />
                  </Field>
                  <Field label="Nom">
                    <input
                      value={form.nom}
                      onChange={(e) => setForm({ ...form, nom: e.target.value })}
                      required
                      style={inputStyle}
                    />
                  </Field>
                  <Field label="Téléphone">
                    <input
                      value={form.telephone}
                      onChange={(e) => setForm({ ...form, telephone: e.target.value })}
                      style={inputStyle}
                    />
                  </Field>
                  <Field label="Date de naissance">
                    <input
                      type="date"
                      value={form.dateNaissance}
                      onChange={(e) => setForm({ ...form, dateNaissance: e.target.value })}
                      style={inputStyle}
                    />
                  </Field>
                  <Field label="Bio">
                    <textarea
                      value={form.bio}
                      onChange={(e) => setForm({ ...form, bio: e.target.value })}
                      rows={3}
                      maxLength={300}
                      placeholder="Présentez-vous en quelques mots…"
                      style={{ ...inputStyle, resize: "vertical" }}
                    />
                  </Field>
                  <div style={{ fontSize: 12, color: "var(--muted-2)" }}>Email : {profile.email}</div>
                  <button type="submit" disabled={saving} style={primaryBtn}>
                    {saving ? "Enregistrement…" : "Enregistrer"}
                  </button>
                </form>
              ) : (
                <div style={{ display: "grid", gap: 10, color: "var(--ink-strong)", fontSize: 14 }}>
                  <InfoRow icon="👤" label={`${profile.prenom} ${profile.nom}`} />
                  {profile.bio && <InfoRow icon="✍️" label={profile.bio} />}
                  {profile.telephone && <InfoRow icon="📞" label={profile.telephone} />}
                  {profile.dateNaissance && (
                    <InfoRow
                      icon="🎂"
                      label={new Date(profile.dateNaissance).toLocaleDateString("fr-FR", {
                        day: "numeric",
                        month: "long",
                        year: "numeric",
                      })}
                    />
                  )}
                  {profile.isOwnProfile && <InfoRow icon="✉️" label={profile.email} />}
                  {!profile.telephone && !profile.dateNaissance && !profile.bio && (
                    <p style={{ margin: 0, color: "var(--muted-2)" }}>Aucune information supplémentaire.</p>
                  )}
                </div>
              )}
            </div>
          </aside>

          {/* Publications */}
          <section>
            <div style={{ ...card, marginBottom: 12 }}>
              <h2 style={{ margin: 0, fontSize: 18 }}>Publications</h2>
            </div>
            {(profile.posts || []).length === 0 ? (
              <div style={{ ...card, color: "var(--muted-2)", textAlign: "center" }}>Aucune publication pour le moment.</div>
            ) : (
              (profile.posts || []).map((post) => {
                const mediaUrl = post.mediaUrl || post.image;
                return (
                  <article key={post.id} style={{ ...card, marginBottom: 12, padding: 0, overflow: "hidden" }}>
                    <div style={{ padding: "12px 16px", display: "flex", gap: 10, alignItems: "center" }}>
                      <Avatar src={profile.photo} name={fullName} size={40} />
                      <div>
                        <div style={{ fontWeight: 700 }}>{fullName}</div>
                        <div style={{ fontSize: 12, color: "var(--muted-2)" }}>
                          {new Date(post.createdAt).toLocaleString("fr-FR", { timeZone: "Africa/Kinshasa" })}
                        </div>
                      </div>
                    </div>
                    {post.content && (
                      <div style={{ padding: "0 16px 12px", whiteSpace: "pre-wrap", lineHeight: 1.45 }}>{post.content}</div>
                    )}
                    {mediaUrl && (post.mediaType === "IMAGE" || post.image) && (
                      <img src={mediaUrl} alt="" style={{ width: "100%", maxHeight: 480, objectFit: "cover", display: "block" }} />
                    )}
                    {mediaUrl && post.mediaType === "VIDEO" && (
                      <video src={mediaUrl} controls style={{ width: "100%", display: "block", background: "#000" }} />
                    )}
                    <div style={{ padding: "10px 16px", color: "var(--muted-2)", fontSize: 13, borderTop: "1px solid var(--line-2)" }}>
                      👍 {post.likes?.length || 0} · 💬 {post.comments?.length || 0}
                    </div>
                  </article>
                );
              })
            )}
          </section>
        </div>
      </main>

      {lightbox && (
        <PhotoLightbox
          images={lightbox.images}
          index={lightbox.index}
          alt={lightbox.alt}
          onClose={() => setLightbox(null)}
        />
      )}

      <style jsx global>{`
        @media (max-width: 800px) {
          .profil-grid {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label style={{ display: "grid", gap: 4 }}>
      <span style={{ fontSize: 12, fontWeight: 700, color: "var(--muted-2)" }}>{label}</span>
      {children}
    </label>
  );
}

function InfoRow({ icon, label }: { icon: string; label: string }) {
  return (
    <div style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
      <span aria-hidden>{icon}</span>
      <span style={{ lineHeight: 1.4 }}>{label}</span>
    </div>
  );
}

function Avatar({ src, name, size }: { src?: string | null; name: string; size: number }) {
  if (src) {
    return <img src={src} alt="" style={{ width: size, height: size, borderRadius: "50%", objectFit: "cover" }} />;
  }
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: "50%",
        background: "var(--link)",
        color: "#fff",
        display: "grid",
        placeItems: "center",
        fontWeight: 800,
      }}
    >
      {(name || "U").charAt(0).toUpperCase()}
    </div>
  );
}

const card: React.CSSProperties = {
  background: "var(--bg-elevated)",
  borderRadius: 12,
  padding: 16,
  boxShadow: "0 1px 2px rgba(0,0,0,0.08)",
};

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "10px 12px",
  borderRadius: 8,
  border: "1px solid var(--line-3)",
  background: "var(--bg-elevated)",
  color: "var(--ink)",
  fontSize: 14,
  fontFamily: "inherit",
  boxSizing: "border-box",
};

const primaryBtn: React.CSSProperties = {
  border: "none",
  background: "var(--link)",
  color: "#fff",
  fontWeight: 700,
  padding: "10px 14px",
  borderRadius: 8,
  cursor: "pointer",
  fontSize: 14,
};
