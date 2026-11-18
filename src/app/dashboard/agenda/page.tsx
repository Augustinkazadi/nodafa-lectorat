"use client";

import { useEffect, useState } from "react";
import AdminShell from "@/components/AdminShell";

export default function AdminAgendaPage() {
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState("");
  const [form, setForm] = useState({ title: "", date: "", color: "Vert", note: "" });

  const load = async () => {
    const res = await fetch("/api/liturgical");
    if (res.ok) setEvents(await res.json());
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus("Ajout...");
    const res = await fetch("/api/liturgical", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    if (res.ok) {
      setStatus("✅ Événement ajouté");
      setForm({ title: "", date: "", color: "Vert", note: "" });
      load();
    } else {
      const data = await res.json().catch(() => ({}));
      setStatus("❌ " + (data.message || "Erreur"));
    }
  };

  const remove = async (id: number) => {
    if (!confirm("Supprimer cet événement ?")) return;
    await fetch(`/api/liturgical?id=${id}`, { method: "DELETE" });
    load();
  };

  return (
    <AdminShell>
      <h1 style={{ margin: "0 0 8px", fontFamily: "var(--font-display)", fontSize: 30 }}>Agenda liturgique</h1>
      <p style={{ margin: "0 0 16px", color: "#64748b" }}>Gérez les fêtes et couleurs du calendrier.</p>

      <div className="admin-panel">
        <h2>Nouvel événement</h2>
        <form className="admin-form-grid" onSubmit={submit}>
          <input placeholder="Titre" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required />
          <input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} required />
          <select value={form.color} onChange={(e) => setForm({ ...form, color: e.target.value })}>
            <option>Vert</option>
            <option>Rouge</option>
            <option>Blanc</option>
            <option>Violet</option>
            <option>Rose</option>
          </select>
          <input placeholder="Note" value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} />
          <button type="submit" className="nodafa-btn nodafa-btn-primary">
            Ajouter
          </button>
        </form>
        {status && <p style={{ marginTop: 12, fontWeight: 700 }}>{status}</p>}
      </div>

      <div className="admin-panel">
        <h2>Événements</h2>
        {loading ? (
          <p>Chargement...</p>
        ) : (
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Titre</th>
                  <th>Couleur</th>
                  <th>Note</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {events.map((event) => (
                  <tr key={event.id}>
                    <td>{new Date(event.date).toLocaleDateString("fr-FR")}</td>
                    <td>{event.title}</td>
                    <td>{event.color}</td>
                    <td>{event.note || "—"}</td>
                    <td>
                      <button type="button" className="nodafa-btn nodafa-btn-ghost" style={{ padding: "8px 12px", color: "#dc2626" }} onClick={() => remove(event.id)}>
                        Supprimer
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {!loading && events.length === 0 && <p>Aucun événement.</p>}
      </div>
    </AdminShell>
  );
}
