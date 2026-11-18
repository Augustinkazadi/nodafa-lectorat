"use client";

type Toast = {
  id: number;
  name: string;
  photo?: string | null;
};

export default function PresenceToastStack({
  toasts,
  onDismiss,
}: {
  toasts: Toast[];
  onDismiss: (id: number) => void;
}) {
  if (!toasts.length) return null;

  return (
    <div
      style={{
        position: "fixed",
        top: 16,
        left: "50%",
        transform: "translateX(-50%)",
        zIndex: 400,
        display: "grid",
        gap: 8,
        width: "min(360px, calc(100vw - 24px))",
        pointerEvents: "none",
      }}
    >
      {toasts.map((t) => (
        <div
          key={t.id}
          role="status"
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            padding: "10px 12px",
            borderRadius: 14,
            background: "rgba(15, 23, 42, 0.92)",
            color: "#fff",
            boxShadow: "0 12px 30px rgba(0,0,0,0.28)",
            pointerEvents: "auto",
            animation: "lectorat-toast-in 0.28s ease",
          }}
          onClick={() => onDismiss(t.id)}
        >
          {t.photo ? (
            <img src={t.photo} alt="" style={{ width: 36, height: 36, borderRadius: "50%", objectFit: "cover" }} />
          ) : (
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: "50%",
                background: "var(--wa-accent)",
                color: "var(--wa-on-accent)",
                display: "grid",
                placeItems: "center",
                fontWeight: 800,
              }}
            >
              {t.name.charAt(0).toUpperCase()}
            </div>
          )}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontWeight: 800, fontSize: 14, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
              {t.name}
            </div>
            <div style={{ fontSize: 12, color: "#86efac" }}>est en ligne</div>
          </div>
          <span
            style={{
              width: 10,
              height: 10,
              borderRadius: "50%",
              background: "var(--online)",
              boxShadow: "0 0 0 4px rgba(34,197,94,0.25)",
              flexShrink: 0,
            }}
          />
        </div>
      ))}
      <style>{`
        @keyframes lectorat-toast-in {
          from { opacity: 0; transform: translateY(-8px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
