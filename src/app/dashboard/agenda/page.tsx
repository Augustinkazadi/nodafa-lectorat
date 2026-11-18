"use client";

import { useEffect, useState } from "react";
import AdminShell from "@/components/AdminShell";

export default function AdminAgendaPage() {
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState("");
  const [form, setForm] = useState({ title: "", date: "", color: "Vert", note: "" });
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editForm, setEditForm] = useState({ title: "", date: "", color: "Vert", note: "" });

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

  const startEdit = (event: any) => {
    setEditingId(event.id);
    setEditForm({
      title: event.title || "",
      date: new Date(event.date).toISOString().slice(0, 10),
      color: event.color || "Vert",
      note: event.note || "",
    });
    setStatus("");
  };

  const saveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingId) return;
    setStatus("Enregistrement...");
    const res = await fetch("/api/liturgical", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: editingId, ...editForm }),
    });
    if (res.ok) {
      setStatus("✅ Événement modifié");
      setEditingId(null);
      load();
    } else {
      const data = await res.json().catch(() => ({}));
      setStatus("❌ " + (data.message || "Erreur"));
    }
  };

  const remove = async (id: number) => {
    if (!confirm("Supprimer cet événement ?")) return;
    await fetch(`/api/liturgical?id=${id}`, { method: "DELETE" });
    if (editingId === id) setEditingId(null);
    load();
  };

  return (
    <AdminShell>
      <h1 style={{ margin: "0 0 8px", fontFamily: "var(--font-display)", fontSize: 30 }}>Agenda liturgique</h1>
      <p style={{ margin: "0 0 16px", color: "#64748b" }}>Ajoutez, modifiez ou supprimez les fêtes et couleurs du calendrier.</p>

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

      {editingId && (
        <div className="admin-panel">
          <h2>Modifier l’événement</h2>
          <form className="admin-form-grid" onSubmit={saveEdit}>
            <input placeholder="Titre" value={editForm.title} onChange={(e) => setEditForm({ ...editForm, title: e.target.value })} required />
            <input type="date" value={editForm.date} onChange={(e) => setEditForm({ ...editForm, date: e.target.value })} required />
            <select value={editForm.color} onChange={(e) => setEditForm({ ...editForm, color: e.target.value })}>
              <option>Vert</option>
              <option>Rouge</option>
              <option>Blanc</option>
              <option>Violet</option>
              <option>Rose</option>
            </select>
            <input placeholder="Note" value={editForm.note} onChange={(e) => setEditForm({ ...editForm, note: e.target.value })} />
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <button type="submit" className="nodafa-btn nodafa-btn-primary">
                Enregistrer
              </button>
              <button type="button" className="nodafa-btn nodafa-btn-ghost" onClick={() => setEditingId(null)}>
                Annuler
              </button>
            </div>
          </form>
        </div>
      )}

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
                  <tr key={event.id} style={{ background: editingId === event.id ? "#eff6ff" : undefined }}>
                    <td>{new Date(event.date).toLocaleDateString("fr-FR")}</td>
                    <td>{event.title}</td>
                    <td>{event.color}</td>
                    <td>{event.note || "—"}</td>
                    <td>
                      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                        <button type="button" className="nodafa-btn nodafa-btn-ghost" style={{ padding: "8px 12px" }} onClick={() => startEdit(event)}>
                          Modifier
                        </button>
                        <button type="button" className="nodafa-btn nodafa-btn-ghost" style={{ padding: "8px 12px", color: "#dc2626" }} onClick={() => remove(event.id)}>
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
        {!loading && events.length === 0 && <p>Aucun événement.</p>}
      </div>
    </AdminShell>
  );
}
