import Link from "next/link";

type BrandLogoProps = {
  href?: string;
  size?: number;
  showText?: boolean;
  textColor?: string;
  subtitle?: string | null;
  compact?: boolean;
};

export default function BrandLogo({
  href = "/",
  size = 48,
  showText = true,
  textColor = "inherit",
  subtitle = "Paroisse Notre-Dame de Fatima – Gombe",
  compact = false,
}: BrandLogoProps) {
  const content = (
    <div style={{ display: "flex", alignItems: "center", gap: compact ? 10 : 14 }}>
      <img
        src="/logo-lectorat.jpg"
        alt="Logo Lectorat Notre-Dame de Fatima – Gombe"
        width={size}
        height={size}
        style={{
          width: size,
          height: size,
          borderRadius: "50%",
          objectFit: "cover",
          background: "var(--bg-elevated)",
          boxShadow: "0 4px 14px rgba(15, 23, 42, 0.12)",
          flexShrink: 0,
        }}
      />
      {showText && (
        <div style={{ minWidth: 0, color: textColor }}>
          <div
            style={{
              fontFamily: "var(--font-display)",
              fontSize: compact ? 18 : 24,
              lineHeight: 1.05,
              fontWeight: 700,
            }}
          >
            LECTORAT
          </div>
          {subtitle !== null && (
            <div
              style={{
                opacity: 0.82,
                fontSize: compact ? 11 : 12,
                marginTop: 2,
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
                maxWidth: compact ? 180 : 260,
              }}
            >
              {subtitle}
            </div>
          )}
        </div>
      )}
    </div>
  );

  if (!href) return content;
  return (
    <Link href={href} style={{ textDecoration: "none", color: "inherit" }}>
      {content}
    </Link>
  );
}
