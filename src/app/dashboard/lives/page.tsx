"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import AdminShell from "@/components/AdminShell";
import { LIVE_EVENT_TYPES, liveEventLabel } from "@/lib/liveEvents";

export default function AdminLivesPage() {
  const [lives, setLives] = useState<any[]>([]);
  const [title, setTitle] = useState("");
  const [eventType, setEventType] = useState("fete");
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(true);

  const load = async () => {
    const res = await fetch("/api/lives");
    if (res.ok) setLives(await res.json());
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const launch = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus("Lancement...");
    const res = await fetch("/api/lives", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, eventType, description }),
    });
    if (res.ok) {
      setStatus("✅ Diffusion lancée — ouvrez la page Live en mode diffuseur");
      setTitle("");
      setDescription("");
      setEventType("fete");
      load();
      window.location.href = "/live";
    } else {
      const data = await res.json().catch(() => ({}));
      setStatus("❌ " + (data.message || "Erreur"));
    }
  };

  const toggle = async (id: number, isActive: boolean) => {
    await fetch("/api/lives", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, isActive }),
    });
    load();
  };

  const remove = async (id: number) => {
    if (!confirm("Supprimer cette diffusion ?")) return;
    await fetch(`/api/lives?id=${id}`, { method: "DELETE" });
    load();
  };

  return (
    <AdminShell>
      <h1 style={{ margin: "0 0 8px", fontFamily: "var(--font-display)", fontSize: 30 }}>Diffusions d’événements</h1>
      <p style={{ margin: "0 0 16px", color: "var(--muted)" }}>
        Pour les <strong>fêtes</strong>, <strong>excursions</strong>, <strong>journées d’amitié</strong>, célébrations…
        Ce n’est pas une salle de réunion : l’admin diffuse, les membres regardent dans Lectorat.
      </p>

      <div className="admin-panel">
        <h2>Diffuser un événement</h2>
        <form className="admin-form-grid" onSubmit={launch}>
          <select value={eventType} onChange={(e) => setEventType(e.target.value)} required>
            {LIVE_EVENT_TYPES.map((t) => (
              <option key={t.value} value={t.value}>
                {t.emoji} {t.label}
              </option>
            ))}
          </select>
          <input placeholder="Titre (ex: Excursion à Kisantu)" value={title} onChange={(e) => setTitle(e.target.value)} required />
          <textarea
            placeholder="Description / lieu / horaires (optionnel)"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
          />
          <button type="submit" className="nodafa-btn nodafa-btn-primary" style={{ background: "var(--danger)" }}>
            Lancer la diffusion
          </button>
        </form>
        {status && <p style={{ marginTop: 12, fontWeight: 700 }}>{status}</p>}
        <Link href="/live" style={{ color: "var(--brand)", fontWeight: 700, fontSize: 13 }}>
          Ouvrir la page Live →
        </Link>
      </div>

      <div className="admin-panel">
        <h2>Historique</h2>
        {loading ? (
          <p>Chargement...</p>
        ) : (
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Événement</th>
                  <th>Type</th>
                  <th>Statut</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {lives.map((live) => (
                  <tr key={live.id}>
                    <td>
                      <strong>{live.title}</strong>
                      {live.description && (
                        <div style={{ color: "var(--muted)", fontSize: 12, marginTop: 4 }}>{live.description}</div>
                      )}
                    </td>
                    <td>{liveEventLabel(live.eventType)}</td>
                    <td>
                      <span className={`admin-chip ${live.isActive ? "admin-chip--ok" : "admin-chip--off"}`}>
                        {live.isActive ? "En direct" : "Terminé"}
                      </span>
                    </td>
                    <td>
                      <div className="admin-actions">
                        <button type="button" className="nodafa-btn nodafa-btn-ghost" style={{ padding: "8px 12px" }} onClick={() => toggle(live.id, !live.isActive)}>
                          {live.isActive ? "Arrêter" : "Relancer"}
                        </button>
                        <button type="button" className="nodafa-btn nodafa-btn-ghost" style={{ padding: "8px 12px", color: "var(--danger)" }} onClick={() => remove(live.id)}>
                          Supprimer
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {!loading && lives.length === 0 && <p>Aucune diffusion pour le moment.</p>}
      </div>
    </AdminShell>
  );
}
