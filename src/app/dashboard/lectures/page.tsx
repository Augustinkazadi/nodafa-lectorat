"use client";

import { useEffect, useRef, useState } from "react";
import AdminShell from "@/components/AdminShell";
import { uploadMediaFile } from "@/lib/clientUpload";

export default function AdminLecturesPage() {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState("");
  const [syncing, setSyncing] = useState(false);
  const [syncingSundays, setSyncingSundays] = useState(false);
  const [syncingWeek, setSyncingWeek] = useState(false);
  const photoRefs = useRef<Record<number, HTMLInputElement | null>>({});
  const [form, setForm] = useState({
    title: "",
    date: "",
    gospel: "",
    firstReading: "",
    psalm: "",
    secondReading: "",
    liturgicalColor: "Vert",
    liturgicalYear: "A",
    liturgicalSeason: "Temps Ordinaire",
    commentary: "",
  });

  const load = async () => {
    const res = await fetch("/api/lectures");
    if (res.ok) setItems(await res.json());
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const syncAelf = async () => {
    setSyncing(true);
    setStatus("Synchronisation AELF...");
    try {
      const res = await fetch("/api/lectures/sync", { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message || "Erreur sync");
      setStatus("✅ Lecture du jour prête — visible dans le Journal aujourd’hui");
      load();
    } catch (e: any) {
      setStatus("❌ " + (e.message || "Sync impossible"));
    } finally {
      setSyncing(false);
    }
  };

  const syncSundays = async () => {
    setSyncingSundays(true);
    setStatus("Publication des dimanches à préparer...");
    try {
      const res = await fetch("/api/lectures/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: "sundays", count: 6 }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message || "Erreur sync");
      setStatus(`✅ ${data.message || "Dimanches prêts"} — visibles dans Lecture pour préparer la messe`);
      load();
    } catch (e: any) {
      setStatus("❌ " + (e.message || "Sync impossible"));
    } finally {
      setSyncingSundays(false);
    }
  };

  const syncWeek = async () => {
    setSyncingWeek(true);
    setStatus("Préparation des textes (le journal restera jour par jour)...");
    try {
      const res = await fetch("/api/lectures/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: "week" }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message || "Erreur sync");
      setStatus(`✅ ${data.message || "Textes préparés"}`);
      load();
    } catch (e: any) {
      setStatus("❌ " + (e.message || "Sync impossible"));
    } finally {
      setSyncingWeek(false);
    }
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus("Ajout...");
    const res = await fetch("/api/lectures", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    if (res.ok) {
      setStatus("✅ Lecture publiée");
      setForm({
        title: "",
        date: "",
        gospel: "",
        firstReading: "",
        psalm: "",
        secondReading: "",
        liturgicalColor: "Vert",
        liturgicalYear: "A",
        liturgicalSeason: "Temps Ordinaire",
        commentary: "",
      });
      load();
    } else {
      const data = await res.json().catch(() => ({}));
      setStatus("❌ " + (data.message || "Erreur"));
    }
  };

  const attachPhoto = async (id: number, file: File) => {
    setStatus("Upload photo...");
    try {
      const uploaded = await uploadMediaFile(file, "post");
      const res = await fetch("/api/lectures", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, image: uploaded.url }),
      });
      if (!res.ok) throw new Error("Erreur photo");
      setStatus("✅ Photo de lecture ajoutée");
      load();
    } catch (e: any) {
      setStatus("❌ " + (e.message || "Erreur"));
    }
  };

  const remove = async (id: number) => {
    if (!confirm("Supprimer cette lecture ?")) return;
    await fetch(`/api/lectures?id=${id}`, { method: "DELETE" });
    load();
  };

  const sorted = [...items].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  return (
    <AdminShell>
      <h1 style={{ margin: "0 0 8px", fontFamily: "var(--font-display)", fontSize: 30 }}>Lectures</h1>
      <p style={{ margin: "0 0 16px", color: "var(--muted)" }}>
        Le <strong>Journal</strong> n’affiche que la lecture du jour (à partir de 00h00, Kinshasa). Les{" "}
        <strong>dimanches à venir</strong> restent dans la liste Lecture pour préparer la messe.
      </p>

      <div className="admin-panel">
        <h2>Récupération automatique (AELF)</h2>
        <p style={{ marginTop: 0, color: "var(--muted)" }}>
          « Lecture du jour » → une seule carte dans le Journal dès 00h00. Les jours passés sont archivés (page Lectures).
          Les dimanches à venir → préparation uniquement.
        </p>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button
            type="button"
            className="nodafa-btn nodafa-btn-primary"
            onClick={syncAelf}
            disabled={syncing || syncingSundays || syncingWeek}
          >
            {syncing ? "Synchronisation..." : "📥 Lecture du jour → Journal"}
          </button>
          <button
            type="button"
            className="nodafa-btn nodafa-btn-primary"
            style={{ background: "#0f766e" }}
            onClick={syncSundays}
            disabled={syncing || syncingSundays || syncingWeek}
          >
            {syncingSundays ? "Publication..." : "📅 Dimanches à venir (préparation)"}
          </button>
          <button
            type="button"
            className="nodafa-btn nodafa-btn-ghost"
            onClick={syncWeek}
            disabled={syncing || syncingSundays || syncingWeek}
          >
            {syncingWeek ? "Préparation..." : "Préparer les textes de la semaine (sans tout afficher)"}
          </button>
        </div>
      </div>

      <div className="admin-panel">
        <h2>Nouvelle lecture manuelle</h2>
        <p style={{ marginTop: 0, color: "var(--muted)", fontSize: 14 }}>
          Titre conseillé : « Dimanche du Christ Roi de l&apos;univers » ou « 1er dimanche du Temps Ordinaire — année liturgique A ».
        </p>
        <form className="admin-form-grid" onSubmit={submit}>
          <input
            placeholder="Titre (ex: 33ème dimanche du Temps Ordinaire — année liturgique A)"
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            required
          />
          <input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} required />
          <select value={form.liturgicalSeason} onChange={(e) => setForm({ ...form, liturgicalSeason: e.target.value })}>
            <option>Temps Ordinaire</option>
            <option>Temps de l'Avent</option>
            <option>Temps de Noël</option>
            <option>Temps du Carême</option>
            <option>Temps pascal</option>
          </select>
          <select value={form.liturgicalYear} onChange={(e) => setForm({ ...form, liturgicalYear: e.target.value })}>
            <option value="A">Année liturgique A</option>
            <option value="B">Année liturgique B</option>
            <option value="C">Année liturgique C</option>
          </select>
          <select value={form.liturgicalColor} onChange={(e) => setForm({ ...form, liturgicalColor: e.target.value })}>
            <option>Vert</option>
            <option>Rouge</option>
            <option>Blanc</option>
            <option>Violet</option>
            <option>Rose</option>
          </select>
          <textarea placeholder="1ʳᵉ lecture *" value={form.firstReading} onChange={(e) => setForm({ ...form, firstReading: e.target.value })} rows={4} required />
          <textarea placeholder="2ᵉ lecture" value={form.secondReading} onChange={(e) => setForm({ ...form, secondReading: e.target.value })} rows={4} />
          <textarea placeholder="Évangile *" value={form.gospel} onChange={(e) => setForm({ ...form, gospel: e.target.value })} rows={5} required />
          <textarea placeholder="Psaume (optionnel)" value={form.psalm} onChange={(e) => setForm({ ...form, psalm: e.target.value })} rows={2} />
          <textarea placeholder="Commentaire (optionnel)" value={form.commentary} onChange={(e) => setForm({ ...form, commentary: e.target.value })} rows={2} />
          <button type="submit" className="nodafa-btn nodafa-btn-primary" style={{ background: "#f59e0b" }}>
            Publier la lecture
          </button>
        </form>
        {status && <p style={{ marginTop: 12, fontWeight: 700 }}>{status}</p>}
      </div>

      <div className="admin-panel">
        <h2>Lectures publiées</h2>
        {loading ? (
          <p>Chargement...</p>
        ) : (
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Titre</th>
                  <th>Temps / Année</th>
                  <th>Source</th>
                  <th>Photo</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {sorted.map((item) => (
                  <tr key={item.id}>
                    <td>{new Date(item.date).toLocaleDateString("fr-FR")}</td>
                    <td>
                      <strong>{item.title}</strong>
                      {item.isSunday && <div style={{ fontSize: 12, color: "var(--muted)" }}>Dimanche</div>}
                    </td>
                    <td>
                      <div>{item.liturgicalSeason || "—"}</div>
                      <div style={{ fontSize: 12, color: "var(--muted)" }}>
                        {item.liturgicalYear ? `Année ${item.liturgicalYear}` : ""}
                      </div>
                    </td>
                    <td>{item.source || "manuel"}</td>
                    <td>
                      {item.image ? (
                        <img src={item.image} alt="" style={{ width: 48, height: 48, objectFit: "cover", borderRadius: 8 }} />
                      ) : (
                        "—"
                      )}
                      <div style={{ marginTop: 6 }}>
                        <input
                          type="file"
                          accept="image/*"
                          ref={(el) => {
                            photoRefs.current[item.id] = el;
                          }}
                          onChange={(e) => {
                            const f = e.target.files?.[0];
                            if (f) attachPhoto(item.id, f);
                          }}
                        />
                      </div>
                    </td>
                    <td>
                      <button type="button" className="nodafa-btn nodafa-btn-ghost" style={{ padding: "8px 12px", color: "var(--danger)" }} onClick={() => remove(item.id)}>
                        Supprimer
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {!loading && items.length === 0 && <p>Aucune lecture.</p>}
      </div>
    </AdminShell>
  );
}
