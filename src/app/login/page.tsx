"use client";
import { signIn } from "next-auth/react";
import { useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import BrandLogo from "@/components/BrandLogo";
import ThemeToggle from "@/components/ThemeToggle";

function LoginForm() {
  const searchParams = useSearchParams();
  const registered = searchParams.get("registered");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    const result = await signIn("credentials", {
      email,
      password,
      callbackUrl: "/journal",
      redirect: false,
    });
    if (result?.error) {
      setError("Email ou mot de passe incorrect");
      setLoading(false);
    } else {
      window.location.href = "/journal";
    }
  };

  return (
    <div style={{ minHeight: "100vh", display: "grid", placeItems: "center", padding: 20, position: "relative" }}>
      <div style={{ position: "absolute", top: 16, right: 16 }}>
        <ThemeToggle variant="pill" />
      </div>
      <div className="nodafa-card nodafa-rise" style={{ width: "min(440px, 100%)", padding: 28 }}>
        <div style={{ display: "grid", justifyItems: "center", marginBottom: 22, gap: 10 }}>
          <BrandLogo href="/" size={84} showText={false} />
          <div style={{ textAlign: "center" }}>
            <div style={{ fontFamily: "var(--font-display)", fontSize: 30, marginBottom: 4, color: "var(--ink)" }}>LECTORAT</div>
            <p style={{ margin: 0, color: "var(--muted)", fontSize: 14 }}>Paroisse Notre-Dame de Fatima – Gombe</p>
          </div>
        </div>

        {registered === "true" && (
          <div style={{ background: "#ecfdf5", color: "#047857", padding: 12, borderRadius: 12, marginBottom: 14, fontSize: 14 }}>
            Compte créé. Vous pouvez vous connecter.
          </div>
        )}
        {error && (
          <div style={{ background: "#fef2f2", color: "#b91c1c", padding: 12, borderRadius: 12, marginBottom: 14, fontSize: 14 }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: "grid", gap: 12 }}>
          <input
            type="email"
            placeholder="E-mail"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            style={fieldStyle}
          />
          <input
            type="password"
            placeholder="Mot de passe"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            style={fieldStyle}
          />
          <button type="submit" className="nodafa-btn nodafa-btn-primary" disabled={loading} style={{ width: "100%" }}>
            {loading ? "Connexion..." : "Se connecter"}
          </button>
        </form>

        <p style={{ textAlign: "center", marginTop: 18, color: "var(--muted)" }}>
          Pas encore de compte ?{" "}
          <Link href="/register" style={{ color: "var(--brand)", fontWeight: 700, textDecoration: "none" }}>
            S&apos;inscrire
          </Link>
        </p>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div style={{ padding: 40, textAlign: "center" }}>Chargement...</div>}>
      <LoginForm />
    </Suspense>
  );
}

const fieldStyle: React.CSSProperties = {
  width: "100%",
  padding: "14px 16px",
  border: "1px solid var(--line)",
  borderRadius: 14,
  background: "color-mix(in srgb, var(--bg) 85%, var(--bg-elevated))",
  color: "var(--ink)",
  outline: "none",
};
