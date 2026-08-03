"use client";
import { signIn } from "next-auth/react";
import { useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";

function LoginForm() {
  const searchParams = useSearchParams();
  const registered = searchParams.get("registered");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    const result = await signIn("credentials", {
      email,
      password,
      callbackUrl: "/journal",
      redirect: false,
    });
    if (result?.error) {
      setError("Email ou mot de passe incorrect");
    } else {
      window.location.href = "/journal";
    }
  };

  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#f0f2f5", padding: "20px" }}>
      <div style={{ display: "flex", flexWrap: "wrap", maxWidth: "1000px", width: "100%", alignItems: "center", justifyContent: "space-between" }}>

        {/* Partie gauche */}
        <div style={{ flex: "1 1 400px", paddingRight: "40px", marginBottom: "40px" }}>
          <h1 style={{ color: "#1877f2", fontSize: "50px", margin: "0 0 10px", fontWeight: "bold" }}>nodafa</h1>
          <h2 style={{ fontSize: "24px", fontWeight: "normal", lineHeight: "32px", color: "#1c1e21", margin: 0 }}>
            Connectez-vous avec le lectorat et partagez vos moments avec la communauté.
          </h2>
        </div>

        {/* Partie droite (Formulaire) */}
        <div style={{ flex: "1 1 350px", maxWidth: "400px", background: "white", borderRadius: "8px", boxShadow: "0 4px 12px rgba(0,0,0,0.1)", padding: "20px", textAlign: "center" }}>

          {registered === "true" && (
            <div style={{ background: "#d4edda", color: "#155724", padding: "10px", borderRadius: "5px", marginBottom: "15px", fontSize: "14px" }}>
              Compte créé ! Veuillez vous connecter.
            </div>
          )}
          {error && (
            <div style={{ background: "#ffebe8", color: "#b94a48", padding: "10px", borderRadius: "5px", marginBottom: "15px", fontSize: "14px" }}>
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <input
              type="email"
              placeholder="E-mail"
              required
              onChange={e => setEmail(e.target.value)}
              style={{ width: "100%", padding: "14px 16px", border: "1px solid #dddfe2", borderRadius: "6px", fontSize: "16px", outline: "none", boxSizing: "border-box" as const, marginBottom: "15px" }}
            />
            <input
              type="password"
              placeholder="Mot de passe"
              required
              onChange={e => setPassword(e.target.value)}
              style={{ width: "100%", padding: "14px 16px", border: "1px solid #dddfe2", borderRadius: "6px", fontSize: "16px", outline: "none", boxSizing: "border-box" as const, marginBottom: "15px" }}
            />
            <button
              type="submit"
              style={{ width: "100%", padding: "12px", background: "#1877f2", color: "white", border: "none", borderRadius: "6px", fontSize: "18px", fontWeight: "bold", cursor: "pointer", marginBottom: "15px" }}
            >
              Se connecter
            </button>
          </form>

          <div style={{ borderBottom: "1px solid #dadde1", margin: "20px 0" }}></div>

          <Link
            href="/register"
            style={{ display: "inline-block", padding: "12px 16px", background: "#42b72a", color: "white", borderRadius: "6px", fontSize: "16px", fontWeight: "bold", textDecoration: "none" }}
          >
            Créer un nouveau compte
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div style={{ textAlign: "center", padding: "50px" }}>Chargement...</div>}>
      <LoginForm />
    </Suspense>
  );
}