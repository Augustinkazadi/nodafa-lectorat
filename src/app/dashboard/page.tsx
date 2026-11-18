"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import AdminShell from "@/components/AdminShell";

type Stats = {
  users: number;
  posts: number;
  comments: number;
  lives: number;
  readings: number;
  events: number;
  activeLives: number;
  recentUsers: any[];
  recentPosts: any[];
};

export default function DashboardPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [syncStatus, setSyncStatus] = useState("");

  useEffect(() => {
    fetch("/api/admin/stats")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => d && setStats(d))
      .catch(() => null)
      .finally(() => setLoading(false));
  }, []);

  const syncLectures = async () => {
    setSyncStatus("Synchronisation AELF…");
    try {
      const res = await fetch("/api/lectures/sync", { method: "POST" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message || "Échec");
      setSyncStatus("✅ Lectures du jour synchronisées");
    } catch (e: any) {
      setSyncStatus("❌ " + (e.message || "Erreur"));
    }
  };

  return (
    <AdminShell>
      <h1 style={{ margin: "0 0 6px", fontFamily: "var(--font-display)", fontSize: 30 }}>Espace admin</h1>
      <p style={{ margin: "0 0 18px", color: "#64748b" }}>
        Annonces & PDF → Journal · Live → page Live · Calendrier liturgique → Calendrier seulement · Lectures auto AELF
      </p>

      {loading ? (
        <p>Chargement des statistiques…</p>
      ) : (
        <div className="admin-stats-grid">
          <StatCard label="Membres" value={stats?.users ?? 0} href="/dashboard/membres" />
          <OnlineStatCard />
          <StatCard label="Publications" value={stats?.posts ?? 0} href="/dashboard/publications" />
          <StatCard label="Commentaires" value={stats?.comments ?? 0} />
          <StatCard label="Lectures" value={stats?.readings ?? 0} href="/dashboard/lectures" />
          <StatCard label="Événements liturgiques" value={stats?.events ?? 0} href="/dashboard/agenda" />
          <StatCard
            label="Lives"
            value={stats?.lives ?? 0}
            hint={stats?.activeLives ? `${stats.activeLives} en cours` : "Aucun en cours"}
            href="/dashboard/lives"
            accent={!!stats?.activeLives}
          />
        </div>
      )}

      <h2 style={{ margin: "22px 0 12px", fontSize: 18 }}>Actions rapides</h2>
      <div className="admin-actions-grid">
        <ActionCard
          href="/dashboard/publications"
          icon="📢"
          title="Annonces & PDF"
          text="Publier un fichier ou une annonce dans le journal"
        />
        <ActionCard href="/dashboard/lives" icon="🔴" title="Lives" text="Lancer ou arrêter une diffusion Lectorat" />
        <ActionCard href="/dashboard/lectures" icon="📖" title="Lectures" text="1ʳᵉ lecture, 2ᵉ lecture et Évangile" />
        <ActionCard href="/dashboard/agenda" icon="📅" title="Agenda liturgique" text="Fêtes et couleurs (page Calendrier)" />
        <ActionCard href="/dashboard/membres" icon="👥" title="Membres" text="Rôles admin / lecteur et accès" />
        <ActionCard href="/live" icon="📡" title="Page Live" text="Ouvrir la diffusion pour le lectorat" />
      </div>

      <div className="admin-panel" style={{ marginTop: 16 }}>
        <h2 style={{ marginTop: 0 }}>Synchroniser les lectures du jour</h2>
        <p style={{ color: "#64748b", marginTop: 0 }}>Récupère automatiquement 1ʳᵉ lecture, 2ᵉ lecture et Évangile (AELF).</p>
        <button type="button" className="nodafa-btn nodafa-btn-primary" onClick={syncLectures}>
          Sync AELF maintenant
        </button>
        {syncStatus && <p style={{ fontWeight: 700, marginTop: 10 }}>{syncStatus}</p>}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginTop: 16 }} className="admin-two-col">
        <div className="admin-panel">
          <h2 style={{ marginTop: 0 }}>Derniers membres</h2>
          {(stats?.recentUsers || []).length === 0 ? (
            <p style={{ color: "#64748b" }}>Aucun membre</p>
          ) : (
            <ul style={{ margin: 0, paddingLeft: 18 }}>
              {(stats?.recentUsers || []).map((u) => (
                <li key={u.id} style={{ marginBottom: 8 }}>
                  <strong>
                    {u.prenom} {u.nom}
                  </strong>{" "}
                  <span style={{ color: "#64748b", fontSize: 13 }}>
                    · {u.role} · {new Date(u.createdAt).toLocaleDateString("fr-FR")}
                  </span>
                </li>
              ))}
            </ul>
          )}
          <Link href="/dashboard/membres" style={{ fontWeight: 700, color: "var(--brand)", fontSize: 13 }}>
            Gérer les membres →
          </Link>
        </div>
        <div className="admin-panel">
          <h2 style={{ marginTop: 0 }}>Dernières publications</h2>
          {(stats?.recentPosts || []).length === 0 ? (
            <p style={{ color: "#64748b" }}>Aucune publication</p>
          ) : (
            <ul style={{ margin: 0, paddingLeft: 18 }}>
              {(stats?.recentPosts || []).map((p) => (
                <li key={p.id} style={{ marginBottom: 8 }}>
                  <strong>
                    {p.author?.prenom} {p.author?.nom}
                  </strong>
                  <div style={{ color: "#64748b", fontSize: 13 }}>
                    {(p.content || "").slice(0, 80)}
                    {(p.content || "").length > 80 ? "…" : ""}
                  </div>
                </li>
              ))}
            </ul>
          )}
          <Link href="/journal" style={{ fontWeight: 700, color: "var(--brand)", fontSize: 13 }}>
            Voir le journal →
          </Link>
        </div>
      </div>

      <style jsx global>{`
        .admin-stats-grid {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 12px;
        }
        .admin-actions-grid {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 12px;
        }
        @media (max-width: 900px) {
          .admin-stats-grid,
          .admin-actions-grid,
          .admin-two-col {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </AdminShell>
  );
}

function OnlineStatCard() {
  const [count, setCount] = useState(0);
  useEffect(() => {
    const load = () => {
      fetch("/api/presence")
        .then((r) => (r.ok ? r.json() : null))
        .then((d) => d && setCount(d.onlineCount || 0))
        .catch(() => null);
    };
    load();
    const t = window.setInterval(load, 30000);
    return () => window.clearInterval(t);
  }, []);
  return <StatCard label="En ligne maintenant" value={count} href="/dashboard/membres" accent={count > 0} />;
}

function StatCard({
  label,
  value,
  href,
  hint,
  accent,
}: {
  label: string;
  value: number;
  href?: string;
  hint?: string;
  accent?: boolean;
}) {
  const inner = (
    <div
      className="admin-panel"
      style={{
        margin: 0,
        borderColor: accent ? "#fecaca" : undefined,
        background: accent ? "#fff7f7" : undefined,
      }}
    >
      <div style={{ fontSize: 12, color: "#64748b", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.04em" }}>{label}</div>
      <div style={{ fontSize: 28, fontWeight: 800, marginTop: 6 }}>{value}</div>
      {hint && <div style={{ fontSize: 12, color: accent ? "#dc2626" : "#94a3b8", marginTop: 4 }}>{hint}</div>}
    </div>
  );
  return href ? (
    <Link href={href} style={{ textDecoration: "none", color: "inherit" }}>
      {inner}
    </Link>
  ) : (
    inner
  );
}

function ActionCard({ href, icon, title, text }: { href: string; icon: string; title: string; text: string }) {
  return (
    <Link
      href={href}
      className="admin-panel"
      style={{ margin: 0, textDecoration: "none", color: "inherit", display: "block" }}
    >
      <div style={{ fontSize: 22, marginBottom: 6 }}>{icon}</div>
      <strong style={{ display: "block", marginBottom: 4 }}>{title}</strong>
      <span style={{ color: "#64748b", fontSize: 13, lineHeight: 1.4 }}>{text}</span>
    </Link>
  );
}
