"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

const menuItems = [
  { label: "Dashboard", href: "/dashboard", icon: "📊" },
  { label: "Lectures du jour", href: "/dashboard/lectures", icon: "📖" },
  { label: "Événements", href: "/dashboard/evenements", icon: "📅" },
  { label: "Lives", href: "/dashboard/lives", icon: "🎥" },
  { label: "Galerie", href: "/dashboard/galerie", icon: "🖼️" },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside style={{ width: "260px", minHeight: "100vh", background: "linear-gradient(180deg, #0f172a, #1e293b)", color: "white", padding: "20px 0", display: "flex", flexDirection: "column", position: "fixed", left: 0, top: 0, zIndex: 1000 }}>
      
      <div style={{ padding: "0 20px 30px", borderBottom: "1px solid rgba(255,255,255,0.1)", display: "flex", alignItems: "center", gap: "10px" }}>
        <div style={{ width: "40px", height: "40px", borderRadius: "10px", background: "linear-gradient(135deg, #667eea, #764ba2)", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: "bold", fontSize: "18px" }}>N</div>
        <div>
          <h3 style={{ margin: 0, fontSize: "16px" }}>NODAFA</h3>
          <p style={{ margin: 0, fontSize: "11px", color: "#94a3b8" }}>Administration</p>
        </div>
      </div>

      <nav style={{ flex: 1, padding: "20px 0" }}>
        {menuItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link key={item.href} href={item.href} style={{ display: "flex", alignItems: "center", gap: "12px", padding: "12px 20px", color: isActive ? "white" : "#94a3b8", background: isActive ? "rgba(102,126,234,0.2)" : "transparent", borderRight: isActive ? "3px solid #667eea" : "3px solid transparent", textDecoration: "none", fontSize: "14px", transition: "all 0.2s", margin: "2px 0" }}>
              <span style={{ fontSize: "18px" }}>{item.icon}</span>
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <div style={{ padding: "20px", borderTop: "1px solid rgba(255,255,255,0.1)" }}>
        <Link href="/journal" style={{ color: "#94a3b8", textDecoration: "none", fontSize: "13px", display: "flex", alignItems: "center", gap: "8px" }}>
          ← Retour au Journal
        </Link>
      </div>
    </aside>
  );
}