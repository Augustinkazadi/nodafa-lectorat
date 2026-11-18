"use client";

import { useEffect, useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import AppNavbar from "@/components/AppNavbar";

type Reading = {
  id: number;
  date: string;
  title: string;
  firstReading?: string | null;
  secondReading?: string | null;
  psalm?: string | null;
  gospel?: string | null;
  liturgicalColor?: string | null;
  commentary?: string | null;
  image?: string | null;
  source?: string | null;
  liturgicalYear?: string | null;
  liturgicalSeason?: string | null;
  isSunday?: boolean;
};

function isoDay(d: string | Date) {
  const x = new Date(d);
  return x.toISOString().slice(0, 10);
}

function todayIso() {
  const n = new Date();
  const y = n.getFullYear();
  const m = String(n.getMonth() + 1).padStart(2, "0");
  const day = String(n.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export default function LectureDuJourPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [readings, setReadings] = useState<Reading[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [unreadCount, setUnreadCount] = useState({ notifications: 0, messages: 0 });
  const [filter, setFilter] = useState<"all" | "sundays" | "upcoming">("sundays");

  useEffect(() => {
    if (status === "unauthenticated") router.push("/login");
    if (status !== "authenticated") return;

    fetch("/api/unread-count")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => d && setUnreadCount(d))
      .catch(() => null);

    fetch("/api/lectures")
      .then(async (r) => {
        if (!r.ok) throw new Error("Lecture indisponible");
        return r.json();
      })
      .then((list: Reading[]) => {
        setReadings(Array.isArray(list) ? list : []);
      })
      .catch(() => setError("Impossible de charger les lectures pour le moment."))
      .finally(() => setLoading(false));
  }, [status, router]);

  const selected = readings.find((r) => r.id === selectedId) || null;

  useEffect(() => {
    if (!selected) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [selected]);

  const today = todayIso();

  const visible = useMemo(() => {
    let list = [...readings];
    if (filter === "sundays") {
      list = list.filter((r) => r.isSunday || /dimanche/i.test(r.title));
    } else if (filter === "upcoming") {
      list = list.filter((r) => isoDay(r.date) >= today);
    }
    return list.sort((a, b) => isoDay(a.date).localeCompare(isoDay(b.date)));
  }, [readings, filter, today]);

  if (status === "loading" || loading) {
    return <div style={{ padding: 50, textAlign: "center" }}>Chargement des lectures...</div>;
  }

  return (
    <div style={{ minHeight: "100vh" }}>
      <AppNavbar
        userName={session?.user?.name}
        userPhoto={session?.user?.image}
        isAdmin={(session?.user as any)?.role === "ADMIN"}
        unreadNotifications={unreadCount.notifications}
        unreadMessages={unreadCount.messages}
        active="lecture"
      />

      <main style={{ maxWidth: 860, margin: "0 auto", padding: "20px 16px 36px" }}>
        <h1 style={{ margin: "0 0 8px", fontFamily: "var(--font-display)", fontSize: 30 }}>Lectures</h1>
        <p style={{ margin: "0 0 12px", color: "var(--muted)", lineHeight: 1.45 }}>
          Liste des dimanches pour préparer la messe à l’avance. Le Journal, lui, reçoit la lecture jour après jour
          (aujourd’hui, puis demain, etc.).
        </p>

        {(() => {
          const todayReading =
            readings.find((r) => isoDay(r.date) === today) ||
            readings.find((r) => r.isSunday && isoDay(r.date) >= today) ||
            null;
          const season = todayReading?.liturgicalSeason;
          const year = todayReading?.liturgicalYear;
          if (!season && !year) return null;
          return (
            <div
              className="nodafa-card"
              style={{
                padding: "14px 16px",
                marginBottom: 16,
                background: "linear-gradient(135deg, #eff6ff, #f0fdf4)",
                border: "1px solid #bfdbfe",
              }}
            >
              <div style={{ fontSize: 12, fontWeight: 700, color: "#1d4ed8", letterSpacing: 0.3, marginBottom: 4 }}>
                TEMPS DE L’ANNÉE LITURGIQUE
              </div>
              <div style={{ fontSize: 17, fontWeight: 800, color: "#0f172a", lineHeight: 1.35 }}>
                {season && year
                  ? `Nous sommes actuellement en ${season} — année liturgique ${year}`
                  : season
                    ? `Nous sommes actuellement en ${season}`
                    : `Année liturgique ${year}`}
              </div>
            </div>
          );
        })()}

        {error && (
          <div className="nodafa-card" style={{ padding: 20, color: "#b91c1c", marginBottom: 14 }}>
            {error}
          </div>
        )}

        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 14 }}>
          {(
            [
              ["sundays", "Dimanches"],
              ["upcoming", "À venir"],
              ["all", "Toutes"],
            ] as const
          ).map(([key, label]) => (
            <button
              key={key}
              type="button"
              onClick={() => setFilter(key)}
              className="nodafa-btn nodafa-btn-ghost"
              style={{
                padding: "8px 12px",
                background: filter === key ? "#1877f2" : undefined,
                color: filter === key ? "#fff" : undefined,
                borderColor: filter === key ? "#1877f2" : undefined,
              }}
            >
              {label}
            </button>
          ))}
        </div>

        <div style={{ display: "grid", gap: 10 }}>
          {visible.length === 0 && (
            <div className="nodafa-card" style={{ padding: 20, color: "#64748b" }}>
              Aucune lecture publiée pour ce filtre. Un admin peut publier les prochains dimanches depuis l’espace Lectures.
            </div>
          )}
          {visible.map((r) => {
            const day = isoDay(r.date);
            const isToday = day === today;
            const isFuture = day > today;
            return (
              <button
                key={r.id}
                type="button"
                onClick={() => setSelectedId(r.id)}
                className="nodafa-card"
                style={{
                  display: "block",
                  width: "100%",
                  textAlign: "left",
                  padding: 16,
                  border: "1px solid #e2e8f0",
                  background: "#fff",
                  cursor: "pointer",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap", alignItems: "flex-start" }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 12, color: "#64748b", fontWeight: 700 }}>
                      {new Date(r.date).toLocaleDateString("fr-FR", {
                        weekday: "long",
                        day: "numeric",
                        month: "long",
                        year: "numeric",
                      })}
                    </div>
                    <div style={{ marginTop: 4, fontWeight: 800, fontSize: 17, color: "#0f172a", lineHeight: 1.35 }}>
                      {r.title}
                    </div>
                    <div style={{ marginTop: 8, color: "#1877f2", fontWeight: 700, fontSize: 13 }}>Ouvrir les lectures →</div>
                  </div>
                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "flex-start" }}>
                    {isToday && <span className="admin-chip admin-chip--admin">Aujourd’hui</span>}
                    {isFuture && <span className="admin-chip admin-chip--ok">À préparer</span>}
                    {r.liturgicalSeason && (
                      <span className="admin-chip" style={{ background: "#ecfdf5", color: "#047857" }}>
                        {r.liturgicalSeason}
                      </span>
                    )}
                    {r.liturgicalYear && (
                      <span className="admin-chip" style={{ background: "#fef3c7", color: "#92400e" }}>
                        Année {r.liturgicalYear}
                      </span>
                    )}
                    {r.liturgicalColor && (
                      <span className="admin-chip admin-chip--admin" style={{ textTransform: "capitalize" }}>
                        {r.liturgicalColor}
                      </span>
                    )}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </main>

      {selected && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={selected.title}
          onClick={() => setSelectedId(null)}
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 90,
            background: "rgba(15, 23, 42, 0.55)",
            display: "flex",
            alignItems: "flex-end",
            justifyContent: "center",
            padding: "12px 12px 0",
          }}
        >
          <article
            onClick={(e) => e.stopPropagation()}
            className="nodafa-card"
            style={{
              width: "100%",
              maxWidth: 860,
              maxHeight: "92vh",
              overflow: "auto",
              padding: 20,
              borderRadius: "18px 18px 0 0",
              marginBottom: 0,
              boxShadow: "0 -8px 40px rgba(0,0,0,.25)",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "flex-start", marginBottom: 14 }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, color: "#64748b", fontWeight: 700 }}>
                  {new Date(selected.date).toLocaleDateString("fr-FR", {
                    weekday: "long",
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                  })}
                </div>
                <h2 style={{ margin: "6px 0 0", fontFamily: "var(--font-display)", fontSize: 24, lineHeight: 1.25 }}>
                  {selected.title}
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setSelectedId(null)}
                className="nodafa-btn nodafa-btn-ghost"
                style={{ padding: "10px 14px", flexShrink: 0, fontWeight: 800 }}
              >
                Fermer
              </button>
            </div>

            <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 14 }}>
              {selected.liturgicalSeason && (
                <span className="admin-chip" style={{ background: "#ecfdf5", color: "#047857" }}>
                  {selected.liturgicalSeason}
                </span>
              )}
              {selected.liturgicalYear && (
                <span className="admin-chip" style={{ background: "#fef3c7", color: "#92400e" }}>
                  Année liturgique {selected.liturgicalYear}
                </span>
              )}
              {selected.liturgicalColor && (
                <span className="admin-chip admin-chip--admin" style={{ textTransform: "capitalize" }}>
                  Couleur : {selected.liturgicalColor}
                </span>
              )}
            </div>

            {selected.image && (
              <img
                src={selected.image}
                alt="Illustration de la lecture"
                style={{ width: "100%", borderRadius: 14, maxHeight: 280, objectFit: "cover", marginBottom: 16 }}
              />
            )}

            {selected.commentary && (
              <p style={{ color: "#475569", fontStyle: "italic", marginBottom: 18 }}>{selected.commentary}</p>
            )}

            <ReadingBlock title="1ʳᵉ lecture" text={selected.firstReading} />
            <ReadingBlock
              title="2ᵉ lecture"
              text={selected.secondReading}
              emptyLabel="Pas de 2ᵉ lecture (messe de semaine)."
            />
            <ReadingBlock title="Évangile" text={selected.gospel} accent emptyLabel="Évangile non disponible" />

            <div style={{ marginTop: 16, fontSize: 12, color: "#94a3b8" }}>
              Source : {selected.source === "aelf" ? "AELF (synchronisation)" : "Publication manuelle"}
            </div>

            <button
              type="button"
              onClick={() => setSelectedId(null)}
              className="nodafa-btn nodafa-btn-primary"
              style={{ width: "100%", marginTop: 18, padding: "14px 16px" }}
            >
              Retour à la liste
            </button>
          </article>
        </div>
      )}
    </div>
  );
}

function ReadingBlock({
  title,
  text,
  accent,
  emptyLabel,
}: {
  title: string;
  text?: string | null;
  accent?: boolean;
  emptyLabel?: string;
}) {
  if (!text && !emptyLabel) return null;
  return (
    <section
      style={{
        marginBottom: 16,
        padding: 14,
        borderRadius: 14,
        background: accent ? "#eff6ff" : "#f8fafc",
        border: `1px solid ${accent ? "#bfdbfe" : "#e2e8f0"}`,
      }}
    >
      <h3 style={{ margin: "0 0 10px", color: accent ? "#1d4ed8" : "#0f172a", fontSize: 16 }}>{title}</h3>
      <div
        style={{
          whiteSpace: "pre-wrap",
          lineHeight: 1.6,
          color: text ? "#1e293b" : "#94a3b8",
          fontSize: 15,
          fontStyle: text ? "normal" : "italic",
        }}
      >
        {text || emptyLabel}
      </div>
    </section>
  );
}
