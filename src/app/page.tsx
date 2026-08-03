import Link from "next/link";

export default function HomePage() {
  return (
    <main style={{ minHeight: "100vh", background: "linear-gradient(135deg, #0f172a 0%, #1e293b 100%)", color: "white", fontFamily: "Arial, sans-serif" }}>
      <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "20px 60px", borderBottom: "1px solid rgba(255,255,255,0.1)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <div style={{ width: "45px", height: "45px", borderRadius: "50%", background: "linear-gradient(135deg, #667eea, #764ba2)", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: "bold", fontSize: "20px" }}>N</div>
          <div>
            <h2 style={{ margin: 0 }}>NODAFA</h2>
            <p style={{ margin: 0, fontSize: "12px", color: "#cbd5e1" }}>Lectorat Notre Dame de Fatima</p>
          </div>
        </div>
        <nav style={{ display: "flex", gap: "20px" }}>
          <Link href="/login" style={{ color: "white", textDecoration: "none", padding: "10px 18px" }}>Connexion</Link>
          <Link href="/register" style={{ background: "linear-gradient(135deg, #667eea, #764ba2)", padding: "10px 18px", borderRadius: "10px", color: "white", textDecoration: "none" }}>Inscription</Link>
        </nav>
      </header>

      <section style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "80px 60px", flexWrap: "wrap", gap: "40px" }}>
        <div style={{ maxWidth: "600px" }}>
          <h1 style={{ fontSize: "60px", lineHeight: "1.1", marginBottom: "20px" }}>
            Plateforme sociale du <span style={{ color: "#a5b4fc" }}>lectorat NODAFA</span>
          </h1>
          <p style={{ fontSize: "18px", color: "#cbd5e1", lineHeight: "1.7", marginBottom: "35px" }}>
            Partagez vos moments, suivez les lectures du jour et interagissez avec la communauté de la paroisse.
          </p>
          <div style={{ display: "flex", gap: "15px" }}>
            {/* LE BOUTON COMMENCER MÈNE MAINTENANT AU JOURNAL */}
            <Link href="/journal" style={{ background: "#1877f2", padding: "14px 24px", borderRadius: "8px", color: "white", textDecoration: "none", fontWeight: "bold", fontSize: "18px" }}>Commencer</Link>
            <Link href="/dashboard" style={{ border: "1px solid rgba(255,255,255,0.2)", padding: "14px 24px", borderRadius: "8px", color: "white", textDecoration: "none", fontSize: "18px" }}>Dashboard (Admins)</Link>
          </div>
        </div>

        <div style={{ width: "380px", background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "16px", padding: "30px" }}>
          <h3 style={{ marginBottom: "25px" }}>Au programme</h3>
          <div style={{ padding: "14px", background: "rgba(255,255,255,0.05)", borderRadius: "8px", marginBottom: "12px" }}>📰 Journal Communautaire</div>
          <div style={{ padding: "14px", background: "rgba(255,255,255,0.05)", borderRadius: "8px", marginBottom: "12px" }}>👍 Likes & Commentaires</div>
          <div style={{ padding: "14px", background: "rgba(255,255,255,0.05)", borderRadius: "8px", marginBottom: "12px" }}>📖 Lectures du dimanche</div>
          <div style={{ padding: "14px", background: "rgba(255,255,255,0.05)", borderRadius: "8px", marginBottom: "12px" }}>🎥 Live des célébrations</div>
        </div>
      </section>
    </main>
  );
}