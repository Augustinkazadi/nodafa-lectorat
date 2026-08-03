"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function RegisterPage() {
  const router = useRouter();
  const [form, setForm] = useState({ nom: "", prenom: "", email: "", password: "", telephone: "", dateNaissance: "" });
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
        // On essaie de lire l'erreur proprement
        try {
          const data = await res.json();
          setError(data.message || "Erreur lors de l'inscription");
        } catch(err) {
          setError("Erreur 404 : L'API d'inscription est introuvable.");
        }
        setLoading(false); // On arrête le bouton de tourner !
        return;
      }
      
      router.push("/login?registered=true");
    } catch (err) {
      setError("Impossible de contacter le serveur.");
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#f0f2f5", padding: "20px" }}>
      <div style={{ width: "100%", maxWidth: "600px", background: "white", borderRadius: "12px", boxShadow: "0 4px 12px rgba(0,0,0,0.08)", padding: "30px 40px" }}>
        
        <div style={{ textAlign: "center", borderBottom: "1px solid #e4e6eb", paddingBottom: "20px", marginBottom: "20px" }}>
          <h1 style={{ fontSize: "32px", color: "#1c1e21", margin: "0 0 5px", fontWeight: "bold" }}>S'inscrire</h1>
          <p style={{ color: "#606770", margin: 0, fontSize: "15px" }}>C'est rapide et facile. Rejoignez NODAFA.</p>
        </div>

        {error && <div style={{ background: "#ffebe8", color: "#b94a48", padding: "10px", borderRadius: "5px", marginBottom: "15px", fontSize: "14px", border: "1px solid #dd3c10", fontWeight: "bold" }}>🚨 {error}</div>}

        <form onSubmit={handleSubmit}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginBottom: "12px" }}>
            <input type="text" placeholder="Prénom" required onChange={e => setForm({...form, prenom: e.target.value})} style={inputStyle} />
            <input type="text" placeholder="Nom de famille" required onChange={e => setForm({...form, nom: e.target.value})} style={inputStyle} />
          </div>
          
          <div style={{ marginBottom: "12px" }}>
            <input type="email" placeholder="E-mail" required onChange={e => setForm({...form, email: e.target.value})} style={inputStyle} />
          </div>

          <div style={{ marginBottom: "12px" }}>
            <input type="password" placeholder="Nouveau mot de passe" required onChange={e => setForm({...form, password: e.target.value})} style={inputStyle} />
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginBottom: "25px" }}>
            <div>
              <label style={labelStyle}>Date de naissance *</label>
              <input type="date" required onChange={e => setForm({...form, dateNaissance: e.target.value})} style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>Numéro de téléphone</label>
              <input type="tel" placeholder="Optionnel" onChange={e => setForm({...form, telephone: e.target.value})} style={inputStyle} />
            </div>
          </div>

          <div style={{ textAlign: "center" }}>
            <button type="submit" disabled={loading} style={{ width: "200px", padding: "10px", background: "#00a400", color: "white", border: "none", borderRadius: "6px", fontSize: "18px", fontWeight: "bold", cursor: "pointer", opacity: loading ? 0.7 : 1 }}>
              {loading ? "Chargement..." : "S'inscrire"}
            </button>
          </div>
        </form>

        <div style={{ textAlign: "center", marginTop: "20px" }}>
          <Link href="/login" style={{ color: "#1877f2", fontSize: "15px", textDecoration: "none", fontWeight: "500" }}>
            Vous avez déjà un compte ?
          </Link>
        </div>

      </div>
    </div>
  );
}

const inputStyle = { width: "100%", padding: "12px", border: "1px solid #ccd0d5", borderRadius: "5px", fontSize: "15px", outline: "none", boxSizing: "border-box" as const, background: "#f5f6f7" };
const labelStyle = { display: "block", fontSize: "12px", color: "#606770", marginBottom: "5px", fontWeight: "600" };