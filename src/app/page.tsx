import Link from "next/link";
import BrandLogo from "@/components/BrandLogo";

export default function HomePage() {
  return (
    <main style={{ minHeight: "100vh", position: "relative", overflow: "hidden" }}>
      <div
        style={{
          position: "absolute",
          inset: 0,
          background:
            "linear-gradient(145deg, rgba(15,23,42,0.88), rgba(15,60,120,0.55)), url('https://images.unsplash.com/photo-1438232032760-f1d1f54b8b2b?auto=format&fit=crop&w=1800&q=80') center/cover",
        }}
      />

      <div style={{ position: "relative", zIndex: 1, color: "white", minHeight: "100vh", display: "flex", flexDirection: "column" }}>
        <header
          className="nodafa-rise"
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            padding: "20px clamp(16px, 5vw, 56px)",
            gap: 12,
            flexWrap: "wrap",
          }}
        >
          <BrandLogo size={48} textColor="white" compact subtitle="Kinshasa" />
          <nav className="home-header-actions">
            <Link
              href="/login"
              className="nodafa-btn nodafa-btn-ghost"
              style={{ color: "white", background: "rgba(255,255,255,0.08)", borderColor: "rgba(255,255,255,0.2)", textDecoration: "none" }}
            >
              Connexion
            </Link>
            <Link href="/register" className="nodafa-btn nodafa-btn-primary" style={{ textDecoration: "none" }}>
              Rejoindre
            </Link>
          </nav>
        </header>

        <section
          style={{
            flex: 1,
            display: "grid",
            placeItems: "center",
            padding: "28px clamp(16px, 5vw, 56px) 64px",
            textAlign: "center",
          }}
        >
          <div style={{ maxWidth: 820 }}>
            <img
              src="/logo-lectorat.jpg"
              alt="Logo Lectorat"
              className="nodafa-rise"
              style={{
                width: "min(220px, 46vw)",
                height: "min(220px, 46vw)",
                borderRadius: "50%",
                objectFit: "cover",
                margin: "0 auto 22px",
                display: "block",
                boxShadow: "0 18px 50px rgba(0,0,0,0.35)",
                border: "3px solid rgba(255,255,255,0.35)",
                background: "var(--bg-elevated)",
              }}
            />
            <p className="nodafa-rise" style={{ letterSpacing: "0.18em", textTransform: "uppercase", fontSize: 12, opacity: 0.85, marginBottom: 14 }}>
              Archidiocèse de Kinshasa
            </p>
            <h1
              className="nodafa-rise"
              style={{
                fontFamily: "var(--font-display)",
                fontSize: "clamp(40px, 7vw, 72px)",
                lineHeight: 1.02,
                margin: "0 0 12px",
                fontWeight: 700,
              }}
            >
              LECTORAT
            </h1>
            <p className="nodafa-rise-delay" style={{ fontSize: "clamp(15px, 2.2vw, 19px)", lineHeight: 1.6, opacity: 0.92, margin: "0 auto 30px", maxWidth: 620 }}>
              Paroisse Notre-Dame de Fatima – Gombe. Journal communautaire, messagerie et vie du lectorat, réunis sur une même plateforme.
            </p>
            <div className="nodafa-rise-delay" style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
              <Link href="/journal" className="nodafa-btn nodafa-btn-primary" style={{ textDecoration: "none", minWidth: 160 }}>
                Ouvrir le journal
              </Link>
              <Link
                href="/messages"
                className="nodafa-btn nodafa-btn-ghost"
                style={{ textDecoration: "none", color: "white", background: "rgba(255,255,255,0.1)", borderColor: "rgba(255,255,255,0.22)", minWidth: 160 }}
              >
                Messagerie
              </Link>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
