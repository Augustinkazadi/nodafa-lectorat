"use client";

import { useTheme } from "@/components/ThemeProvider";

type Props = {
  variant?: "menu" | "icon" | "pill";
};

export default function ThemeToggle({ variant = "menu" }: Props) {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === "dark";
  const label = isDark ? "Mode clair" : "Mode sombre";
  const icon = isDark ? "☀️" : "🌙";

  if (variant === "icon") {
    return (
      <button
        type="button"
        onClick={toggleTheme}
        className="app-nav-icon"
        aria-label={label}
        title={label}
        style={{ border: "none", background: "transparent", cursor: "pointer" }}
      >
        <span aria-hidden>{icon}</span>
      </button>
    );
  }

  if (variant === "pill") {
    return (
      <button
        type="button"
        onClick={toggleTheme}
        style={{
          border: "1px solid var(--line)",
          background: "var(--bg-elevated)",
          color: "var(--ink)",
          borderRadius: 999,
          padding: "8px 12px",
          fontWeight: 700,
          cursor: "pointer",
          display: "inline-flex",
          alignItems: "center",
          gap: 6,
        }}
      >
        <span aria-hidden>{icon}</span>
        {label}
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={toggleTheme}
      style={{
        display: "block",
        width: "100%",
        textAlign: "left",
        border: "none",
        background: "transparent",
        color: "var(--ink)",
        fontWeight: 700,
        padding: "14px 12px",
        borderRadius: 12,
        fontSize: 15,
        cursor: "pointer",
      }}
    >
      {icon} {label}
    </button>
  );
}
