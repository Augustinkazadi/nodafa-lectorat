"use client";

type Props = {
  src?: string | null;
  name: string;
  size?: number;
  online?: boolean;
  showStatus?: boolean;
};

export default function UserAvatar({ src, name, size = 40, online = false, showStatus = true }: Props) {
  return (
    <div style={{ position: "relative", width: size, height: size, flexShrink: 0 }}>
      {src ? (
        <img
          src={src}
          alt=""
          style={{ width: size, height: size, borderRadius: "50%", objectFit: "cover", display: "block" }}
        />
      ) : (
        <div
          style={{
            width: size,
            height: size,
            borderRadius: "50%",
            background: "var(--link)",
            color: "#fff",
            display: "grid",
            placeItems: "center",
            fontWeight: 800,
            fontSize: Math.max(12, size * 0.38),
          }}
        >
          {(name || "U").charAt(0).toUpperCase()}
        </div>
      )}
      {showStatus && (
        <span
          title={online ? "En ligne" : "Hors ligne"}
          style={{
            position: "absolute",
            right: Math.max(0, size * 0.02),
            bottom: Math.max(0, size * 0.02),
            width: Math.max(10, size * 0.28),
            height: Math.max(10, size * 0.28),
            borderRadius: "50%",
            background: online ? "var(--online)" : "var(--muted)",
            border: "2px solid var(--bg-elevated)",
            boxSizing: "border-box",
          }}
        />
      )}
    </div>
  );
}
