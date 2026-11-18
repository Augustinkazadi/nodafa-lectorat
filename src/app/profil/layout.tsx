import { Suspense } from "react";

export default function ProfilLayout({ children }: { children: React.ReactNode }) {
  return <Suspense fallback={<div style={{ padding: 50, textAlign: "center" }}>Chargement du profil…</div>}>{children}</Suspense>;
}
