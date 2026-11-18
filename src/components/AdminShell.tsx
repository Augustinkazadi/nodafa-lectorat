"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useSession, signOut } from "next-auth/react";

const menuItems = [
  { label: "Vue d'ensemble", href: "/dashboard", icon: "📊" },
  { label: "Annonces & PDF", href: "/dashboard/publications", icon: "📢" },
  { label: "Membres", href: "/dashboard/membres", icon: "👥" },
  { label: "Événements live", href: "/dashboard/lives", icon: "🔴" },
  { label: "Lectures", href: "/dashboard/lectures", icon: "📖" },
  { label: "Agenda liturgique", href: "/dashboard/agenda", icon: "📅" },
];

const quickLinks = [
  { label: "Événements en direct", href: "/live", icon: "📡" },
  { label: "Journal", href: "/journal", icon: "📰" },
  { label: "Calendrier", href: "/calendrier", icon: "🗓️" },
];

export default function AdminShell({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession();
  const router = useRouter();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (status === "unauthenticated") router.push("/login");
    if (status === "authenticated" && (session?.user as any)?.role !== "ADMIN") {
      router.push("/journal");
    }
  }, [status, session, router]);

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  if (status === "loading") {
    return <div style={{ padding: 50, textAlign: "center" }}>Chargement admin...</div>;
  }

  if ((session?.user as any)?.role !== "ADMIN") return null;

  return (
    <div className="admin-shell">
      <aside className={`admin-sidebar ${open ? "is-open" : ""}`}>
        <div className="admin-sidebar__brand">
          <img src="/logo-lectorat.jpg" alt="LECTORAT" />
          <div>
            <strong>LECTORAT</strong>
            <span>Espace admin</span>
          </div>
        </div>

        <nav className="admin-sidebar__nav">
          {menuItems.map((item) => {
            const active = item.href === "/dashboard" ? pathname === "/dashboard" : pathname.startsWith(item.href);
            return (
              <Link key={item.href} href={item.href} className={active ? "is-active" : ""}>
                <span>{item.icon}</span>
                {item.label}
              </Link>
            );
          })}
          <div style={{ padding: "14px 12px 6px", color: "#94a3b8", fontSize: 11, fontWeight: 800, letterSpacing: "0.06em" }}>
            ACCÈS RAPIDE
          </div>
          {quickLinks.map((item) => (
            <Link key={item.href} href={item.href}>
              <span>{item.icon}</span>
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="admin-sidebar__footer">
          <Link href="/journal">← Retour au journal</Link>
          <button type="button" onClick={() => signOut({ callbackUrl: "/login" })}>
            Déconnexion
          </button>
        </div>
      </aside>

      {open && <div className="admin-overlay" onClick={() => setOpen(false)} />}

      <div className="admin-main">
        <header className="admin-topbar">
          <button type="button" className="admin-burger" onClick={() => setOpen(true)} aria-label="Menu admin">
            ☰
          </button>
          <div>
            <strong>Espace admin</strong>
            <div className="admin-topbar__user">{session?.user?.name}</div>
          </div>
          <Link href="/journal" className="admin-topbar__link">
            Journal
          </Link>
        </header>
        <div className="admin-content">{children}</div>
      </div>
    </div>
  );
}
