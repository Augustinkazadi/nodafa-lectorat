"use client";

type Props = {
  images: string[];
  onOpen: (index: number) => void;
};

/** Grille style Facebook pour 1–N photos. */
export default function PostPhotoGrid({ images, onOpen }: Props) {
  if (!images.length) return null;
  const n = images.length;

  if (n === 1) {
    return (
      <button type="button" onClick={() => onOpen(0)} aria-label="Agrandir la photo" style={btnFull}>
        <img src={images[0]} alt="" style={{ width: "100%", maxHeight: 560, objectFit: "contain", display: "block", pointerEvents: "none" }} />
      </button>
    );
  }

  if (n === 2) {
    return (
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 2, background: "#000" }}>
        {images.map((src, i) => (
          <Tile key={i} src={src} height={280} onClick={() => onOpen(i)} />
        ))}
      </div>
    );
  }

  if (n === 3) {
    return (
      <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr", gridTemplateRows: "140px 140px", gap: 2, background: "#000" }}>
        <div style={{ gridRow: "1 / span 2" }}>
          <Tile src={images[0]} height="100%" onClick={() => onOpen(0)} />
        </div>
        <Tile src={images[1]} height={140} onClick={() => onOpen(1)} />
        <Tile src={images[2]} height={140} onClick={() => onOpen(2)} />
      </div>
    );
  }

  const shown = images.slice(0, 4);
  const extra = n - 4;
  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 2, background: "#000" }}>
      {shown.map((src, i) => (
        <div key={i} style={{ position: "relative" }}>
          <Tile src={src} height={180} onClick={() => onOpen(i)} />
          {i === 3 && extra > 0 && (
            <div
              onClick={() => onOpen(i)}
              style={{
                position: "absolute",
                inset: 0,
                background: "rgba(0,0,0,0.55)",
                color: "#fff",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 28,
                fontWeight: 800,
                cursor: "pointer",
              }}
            >
              +{extra}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

function Tile({
  src,
  height,
  onClick,
}: {
  src: string;
  height: number | string;
  onClick: () => void;
}) {
  return (
    <button type="button" onClick={onClick} aria-label="Agrandir la photo" style={{ ...btnFull, height, overflow: "hidden" }}>
      <img src={src} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block", pointerEvents: "none" }} />
    </button>
  );
}

const btnFull: React.CSSProperties = {
  display: "block",
  width: "100%",
  padding: 0,
  border: "none",
  background: "#000",
  cursor: "zoom-in",
};
