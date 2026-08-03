"use client";
import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function CalendrierPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Formulaire d'ajout (admin)
  const [title, setTitle] = useState("");
  const [date, setDate] = useState("");
  const [color, setColor] = useState("Vert");
  const [note, setNote] = useState("");
  const [addStatus, setAddStatus] = useState("");

  useEffect(() => {
    if (status === "unauthenticated") router.push("/login");
    if (status === "authenticated") fetchEvents();
  }, [status, router]);

  const fetchEvents = async () => {
    const res = await fetch("/api/liturgical");
    if (res.ok) setEvents(await res.json());
    setLoading(false);
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    setAddStatus("Ajout...");
    const res = await fetch("/api/liturgical", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, date, color, note }),
    });
    if (res.ok) {
      setAddStatus("✅ Ajouté !");
      setTitle(""); setDate(""); setColor("Vert"); setNote("");
      fetchEvents();
    } else {
      const data = await res.json();
      setAddStatus("❌ " + (data.message || "Erreur"));
    }
  };

  const getColorCode = (couleur: string) => {
    const map: Record<string, string> = {
      "Vert": "#22c55e",
      "Rouge": "#dc2626",
      "Blanc": "#f8fafc",
      "Violet": "#8b5cf6",
      "Rose": "#f472b6",
    };
    return map[couleur] || "#ccc";
  };

  if (loading) return <div style={{ padding: "50px", textAlign: "center", fontFamily: "Arial" }}>Chargement...</div>;

  return (
    <div style={{ padding: "40px", maxWidth: "1000px", margin: "0 auto", fontFamily: "Segoe UI", background: "#f8fafc", minHeight: "100vh" }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "30px" }}>
        <h1>📅 Calendrier liturgique</h1>
        <div style={{ display: "flex", gap: "10px" }}>
          <Link href="/journal" style={{ padding: "10px 20px", background: "#1877f2", color: "white", borderRadius: "8px", textDecoration: "none", fontWeight: "bold" }}>Journal</Link>
          <Link href="/dashboard" style={{ padding: "10px 20px", background: "#64748b", color: "white", borderRadius: "8px", textDecoration: "none", fontWeight: "bold" }}>Dashboard</Link>
        </div>
      </div>

      {/* Formulaire d'ajout (admin) */}
      {(session?.user as any)?.role === "ADMIN" && (
        <div style={{ background: "white", padding: "20px", borderRadius: "12px", marginBottom: "30px", boxShadow: "0 1px 2px rgba(0,0,0,0.1)" }}>
          <h2>➕ Ajouter un événement liturgique</h2>
          <form onSubmit={handleAdd}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "15px", marginBottom: "15px" }}>
              <input type="text" placeholder="Titre (ex: Pentecôte)" value={title} onChange={e => setTitle(e.target.value)} required style={inputStyle} />
              <select value={color} onChange={e => setColor(e.target.value)} style={inputStyle}>
                <option value="Vert">Vert</option>
                <option value="Rouge">Rouge</option>
                <option value="Blanc">Blanc</option>
                <option value="Violet">Violet</option>
                <option value="Rose">Rose</option>
              </select>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "15px", marginBottom: "15px" }}>
              <input type="date" value={date} onChange={e => setDate(e.target.value)} required style={inputStyle} />
              <input type="text" placeholder="Note (optionnel)" value={note} onChange={e => setNote(e.target.value)} style={inputStyle} />
            </div>
            <button type="submit" style={{ width: "100%", padding: "12px", background: "#f59e0b", color: "white", border: "none", borderRadius: "8px", fontWeight: "bold", cursor: "pointer" }}>Ajouter</button>
          </form>
          {addStatus && <p style={{ marginTop: "10px", fontWeight: "bold", color: addStatus.includes("✅") ? "green" : "red" }}>{addStatus}</p>}
        </div>
      )}

      {/* Liste des événements */}
      <div style={{ display: "flex", flexDirection: "column", gap: "15px" }}>
        {events.map((event: any) => (
          <div key={event.id} style={{
            display: "flex",
            background: getColorCode(event.color),
            color: event.color === "Blanc" ? "#1e293b" : "white",
            padding: "15px 20px",
            borderRadius: "12px",
            alignItems: "center",
            gap: "20px",
            boxShadow: "0 2px 5px rgba(0,0,0,0.1)",
          }}>
            <div style={{ fontSize: "14px", fontWeight: "bold", background: "rgba(0,0,0,0.2)", padding: "6px 12px", borderRadius: "8px" }}>
              {new Date(event.date).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: "bold", fontSize: "16px" }}>{event.title}</div>
              {event.note && <div style={{ fontSize: "14px", opacity: 0.9 }}>{event.note}</div>}
            </div>
            <div style={{
              width: "30px",
              height: "30px",
              borderRadius: "50%",
              background: "white",
              border: `3px solid ${getColorCode(event.color)}`,
            }} />
          </div>
        ))}
        {events.length === 0 && <p style={{ color: "#64748b", textAlign: "center" }}>Aucun événement liturgique.</p>}
      </div>
    </div>
  );
}

const inputStyle = { width: "100%", padding: "12px", border: "1px solid #ccc", borderRadius: "8px", fontSize: "15px", boxSizing: "border-box" as const };