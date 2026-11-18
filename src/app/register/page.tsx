"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import BrandLogo from "@/components/BrandLogo";

export default function RegisterPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    nom: "",
    prenom: "",
    email: "",
    password: "",
    telephone: "",
    dateNaissance: "",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.message || "Erreur lors de l'inscription");
        setLoading(false);
        return;
      }
      router.push("/login?registered=true");
    } catch {
      setError("Impossible de contacter le serveur.");
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: "100vh", display: "grid", placeItems: "center", padding: 20 }}>
      <div className="nodafa-card nodafa-rise" style={{ width: "min(560px, 100%)", padding: 28 }}>
        <div style={{ display: "grid", justifyItems: "center", marginBottom: 20, gap: 10 }}>
          <BrandLogo href="/" size={78} showText={false} />
          <div style={{ textAlign: "center" }}>
            <div style={{ fontFamily: "var(--font-display)", fontSize: 28 }}>Rejoindre le Lectorat</div>
            <p style={{ margin: "6px 0 0", color: "var(--muted)" }}>Paroisse Notre-Dame de Fatima – Gombe</p>
          </div>
        </div>

        {error && (
          <div style={{ background: "#fef2f2", color: "#b91c1c", padding: 12, borderRadius: 12, marginBottom: 14 }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: "grid", gap: 12 }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <input placeholder="Prénom" required style={fieldStyle} onChange={(e) => setForm({ ...form, prenom: e.target.value })} />
            <input placeholder="Nom" required style={fieldStyle} onChange={(e) => setForm({ ...form, nom: e.target.value })} />
          </div>
          <input type="email" placeholder="E-mail" required style={fieldStyle} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          <input type="password" placeholder="Mot de passe" required style={fieldStyle} onChange={(e) => setForm({ ...form, password: e.target.value })} />
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div>
              <label style={labelStyle}>Date de naissance *</label>
              <input type="date" required style={fieldStyle} onChange={(e) => setForm({ ...form, dateNaissance: e.target.value })} />
            </div>
            <div>
              <label style={labelStyle}>Téléphone</label>
              <input type="tel" placeholder="Optionnel" style={fieldStyle} onChange={(e) => setForm({ ...form, telephone: e.target.value })} />
            </div>
          </div>
          <button type="submit" className="nodafa-btn nodafa-btn-primary" disabled={loading} style={{ width: "100%", marginTop: 6 }}>
            {loading ? "Création..." : "Créer mon compte"}
          </button>
        </form>

        <p style={{ textAlign: "center", marginTop: 18, color: "var(--muted)" }}>
          Déjà inscrit ?{" "}
          <Link href="/login" style={{ color: "var(--brand)", fontWeight: 700, textDecoration: "none" }}>
            Se connecter
          </Link>
        </p>
      </div>
    </div>
  );
}

const fieldStyle: React.CSSProperties = {
  width: "100%",
  padding: "12px 14px",
  border: "1px solid var(--line)",
  borderRadius: 14,
  background: "#f8fafc",
  outline: "none",
};

const labelStyle: React.CSSProperties = {
  display: "block",
  fontSize: 12,
  color: "var(--muted)",
  marginBottom: 6,
  fontWeight: 700,
};
