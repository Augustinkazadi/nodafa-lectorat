"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

const menuItems = [
  { label: "Vue d'ensemble", href: "/dashboard", icon: "📊" },
  { label: "Membres", href: "/dashboard/membres", icon: "👥" },
  { label: "Lives", href: "/dashboard/lives", icon: "🔴" },
  { label: "Lectures", href: "/dashboard/lectures", icon: "📖" },
  { label: "Agenda", href: "/dashboard/agenda", icon: "📅" },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside style={{ width: "260px", minHeight: "100vh", background: "linear-gradient(180deg, #0f172a, #1e293b)", color: "white", padding: "20px 0", display: "flex", flexDirection: "column", position: "fixed", left: 0, top: 0, zIndex: 1000 }}>
      <div style={{ padding: "0 20px 30px", borderBottom: "1px solid rgba(255,255,255,0.1)", display: "flex", alignItems: "center", gap: "12px" }}>
        <img src="/logo-lectorat.jpg" alt="Logo Lectorat" style={{ width: 42, height: 42, borderRadius: "50%", objectFit: "cover", background: "#fff" }} />
        <div>
          <h3 style={{ margin: 0, fontSize: "16px" }}>LECTORAT</h3>
          <p style={{ margin: 0, fontSize: "11px", color: "#94a3b8" }}>Administration</p>
        </div>
      </div>

      <nav style={{ flex: 1, padding: "20px 0" }}>
        {menuItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link key={item.href} href={item.href} style={{ display: "flex", alignItems: "center", gap: "12px", padding: "12px 20px", color: isActive ? "white" : "#94a3b8", background: isActive ? "rgba(255,255,255,0.08)" : "transparent", borderRight: isActive ? "3px solid #c9a227" : "3px solid transparent", textDecoration: "none", fontSize: "14px", margin: "2px 0" }}>
              <span style={{ fontSize: "18px" }}>{item.icon}</span>
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <div style={{ padding: "20px", borderTop: "1px solid rgba(255,255,255,0.1)" }}>
        <Link href="/journal" style={{ color: "#94a3b8", textDecoration: "none", fontSize: "13px" }}>
          ← Retour au Journal
        </Link>
      </div>
    </aside>
  );
}
