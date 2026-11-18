"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { signOut } from "next-auth/react";
import PresenceHeartbeat from "@/components/PresenceHeartbeat";

type AppNavbarProps = {
  userName?: string | null;
  userPhoto?: string | null;
  isAdmin?: boolean;
  unreadNotifications?: number;
  unreadMessages?: number;
  search?: string;
  onSearchChange?: (value: string) => void;
  onProfilePhotoClick?: () => void;
  active?: "journal" | "messages" | "notifications" | "calendrier" | "dashboard" | "lecture" | "profil" | "live";
  title?: string;
  /** Cache header + barre du bas (ex. conversation Messages ouverte) */
  hideChrome?: boolean;
};

export default function AppNavbar({
  userName,
  userPhoto,
  isAdmin,
  unreadNotifications = 0,
  unreadMessages = 0,
  search,
  onSearchChange,
  onProfilePhotoClick,
  active = "journal",
  title = "LECTORAT",
  hideChrome = false,
}: AppNavbarProps) {
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const onResize = () => {
      if (window.innerWidth >= 860) setMenuOpen(false);
    };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  useEffect(() => {
    document.body.style.overflow = menuOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [menuOpen]);

  if (hideChrome) {
    return <PresenceHeartbeat />;
  }

  return (
    <>
      <PresenceHeartbeat />
      <header className="app-navbar">
        <div className="app-navbar__top">
          <Link href="/journal" className="app-navbar__brand" aria-label="LECTORAT">
            <img src="/logo-lectorat.jpg" alt="" className="app-navbar__logo" />
            <strong className="app-navbar__title">{title}</strong>
          </Link>

          {typeof search === "string" && onSearchChange && (
            <input
              className="app-navbar__search app-navbar__search--desktop"
              type="search"
              placeholder="Rechercher..."
              value={search}
              onChange={(e) => onSearchChange(e.target.value)}
            />
          )}

          <div className="app-navbar__actions">
            <div className="app-navbar__desktop-only">
              <Link
                href="/lecture-du-jour"
                className={`app-nav-icon ${active === "lecture" ? "is-active" : ""}`}
                aria-label="Lecture du jour"
                title="Lecture du jour"
              >
                <span aria-hidden>📖</span>
              </Link>
              <Link
                href="/notifications"
                className={`app-nav-icon ${active === "notifications" ? "is-active" : ""}`}
                aria-label="Notifications"
              >
                <span aria-hidden>🔔</span>
                {unreadNotifications > 0 && <span className="app-nav-badge">{unreadNotifications}</span>}
              </Link>
              <Link
                href="/messages"
                className={`app-nav-icon ${active === "messages" ? "is-active" : ""}`}
                aria-label="Messages"
              >
                <span aria-hidden>💬</span>
                {unreadMessages > 0 && <span className="app-nav-badge app-nav-badge--blue">{unreadMessages}</span>}
              </Link>
            </div>

            <nav className="app-navbar__desktop-links">
              <Link href="/live" className={`app-nav-link ${active === "live" ? "is-active" : ""}`}>
                Événements
              </Link>
              <Link href="/lecture-du-jour" className={`app-nav-link ${active === "lecture" ? "is-active" : ""}`}>
                Lecture du jour
              </Link>
              <Link href="/calendrier" className={`app-nav-link ${active === "calendrier" ? "is-active" : ""}`}>
                Calendrier
              </Link>
              {isAdmin && (
                <Link href="/dashboard" className={`app-nav-link ${active === "dashboard" ? "is-active" : ""}`}>
                  Espace admin
                </Link>
              )}
              <Link href="/profil" className="app-nav-avatar" title="Mon profil" aria-label="Mon profil">
                {userPhoto ? <img src={userPhoto} alt="" /> : <span>{(userName || "U").charAt(0).toUpperCase()}</span>}
              </Link>
              <Link href="/profil" className={`app-nav-link ${active === "profil" ? "is-active" : ""}`} style={{ textDecoration: "none" }}>
                {userName}
              </Link>
              <button type="button" className="app-nav-logout" onClick={() => signOut({ callbackUrl: "/login" })}>
                Déconnexion
              </button>
            </nav>

            <button
              type="button"
              className="app-nav-burger"
              aria-label={menuOpen ? "Fermer le menu" : "Ouvrir le menu"}
              aria-expanded={menuOpen}
              onClick={() => setMenuOpen((v) => !v)}
            >
              {menuOpen ? "✕" : "☰"}
            </button>
          </div>
        </div>

        {typeof search === "string" && onSearchChange && (
          <div className="app-navbar__search-row">
            <input
              className="app-navbar__search"
              type="search"
              placeholder="Rechercher dans le journal"
              value={search}
              onChange={(e) => onSearchChange(e.target.value)}
            />
          </div>
        )}
      </header>

      <nav className="app-bottom-nav" aria-label="Navigation principale">
        <Link href="/journal" className={active === "journal" ? "is-active" : ""}>
          <span>📰</span>
          <small>Journal</small>
        </Link>
        <Link href="/lecture-du-jour" className={active === "lecture" ? "is-active" : ""}>
          <span>📖</span>
          <small>Lecture</small>
        </Link>
        <Link href="/messages" className={active === "messages" ? "is-active" : ""}>
          <span>💬</span>
          <small>Messages</small>
          {unreadMessages > 0 && <i>{unreadMessages}</i>}
        </Link>
        <Link href="/notifications" className={active === "notifications" ? "is-active" : ""}>
          <span>🔔</span>
          <small>Alertes</small>
          {unreadNotifications > 0 && <i>{unreadNotifications}</i>}
        </Link>
        <button type="button" onClick={() => setMenuOpen(true)}>
          <span>☰</span>
          <small>Menu</small>
        </button>
      </nav>

      {menuOpen && (
        <div className="app-menu-overlay" onClick={() => setMenuOpen(false)}>
          <aside className="app-menu-panel" onClick={(e) => e.stopPropagation()}>
            <div className="app-menu-panel__head">
              <Link href="/profil" className="app-nav-avatar" onClick={() => setMenuOpen(false)} title="Mon profil">
                {userPhoto ? <img src={userPhoto} alt="" /> : <span>{(userName || "U").charAt(0).toUpperCase()}</span>}
              </Link>
              <div>
                <Link href="/profil" onClick={() => setMenuOpen(false)} style={{ color: "inherit", textDecoration: "none" }}>
                  <strong>{userName || "Lecteur"}</strong>
                </Link>
                <div style={{ color: "#64748b", fontSize: 13 }}>Voir le profil</div>
              </div>
              <button type="button" className="app-menu-close" onClick={() => setMenuOpen(false)}>
                ✕
              </button>
            </div>

            <Link href="/profil" onClick={() => setMenuOpen(false)}>
              👤 Mon profil
            </Link>
            <Link href="/journal" onClick={() => setMenuOpen(false)}>
              📰 Journal
            </Link>
            <Link href="/lecture-du-jour" onClick={() => setMenuOpen(false)}>
              📖 Lecture du jour
            </Link>
            <Link href="/messages" onClick={() => setMenuOpen(false)}>
              💬 Messages {unreadMessages > 0 ? `(${unreadMessages})` : ""}
            </Link>
            <Link href="/notifications" onClick={() => setMenuOpen(false)}>
              🔔 Notifications {unreadNotifications > 0 ? `(${unreadNotifications})` : ""}
            </Link>
            <Link href="/live" onClick={() => setMenuOpen(false)}>
              🔴 Événements en direct
            </Link>
            <Link href="/calendrier" onClick={() => setMenuOpen(false)}>
              📅 Calendrier
            </Link>
            {isAdmin && (
              <>
                <div style={{ padding: "10px 12px 4px", color: "#94a3b8", fontSize: 11, fontWeight: 800, letterSpacing: "0.06em" }}>
                  ESPACE ADMIN
                </div>
                <Link href="/dashboard" onClick={() => setMenuOpen(false)}>
                  ⚙️ Vue d&apos;ensemble
                </Link>
                <Link href="/dashboard/publications" onClick={() => setMenuOpen(false)}>
                  📢 Annonces & PDF
                </Link>
                <Link href="/dashboard/lives" onClick={() => setMenuOpen(false)}>
                  🔴 Lives
                </Link>
                <Link href="/dashboard/lectures" onClick={() => setMenuOpen(false)}>
                  📖 Lectures (1ʳᵉ / 2ᵉ / Évangile)
                </Link>
                <Link href="/dashboard/agenda" onClick={() => setMenuOpen(false)}>
                  📅 Agenda liturgique
                </Link>
                <Link href="/dashboard/membres" onClick={() => setMenuOpen(false)}>
                  👥 Membres
                </Link>
              </>
            )}
            <button type="button" className="app-menu-logout" onClick={() => signOut({ callbackUrl: "/login" })}>
              Déconnexion
            </button>
          </aside>
        </div>
      )}
    </>
  );
}
