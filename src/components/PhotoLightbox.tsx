"use client";

import { useEffect, useRef, useState } from "react";

type Props = {
  src: string;
  alt?: string;
  onClose: () => void;
};

/**
 * Visionneuse style Facebook : plein écran + pinch / double-tap / molette pour zoomer.
 */
export default function PhotoLightbox({ src, alt = "Photo", onClose }: Props) {
  const [scale, setScale] = useState(1);
  const [tx, setTx] = useState(0);
  const [ty, setTy] = useState(0);
  const [interacting, setInteracting] = useState(false);
  const scaleRef = useRef(1);
  const txRef = useRef(0);
  const tyRef = useRef(0);
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const pinchStart = useRef<{ dist: number; scale: number } | null>(null);
  const panStart = useRef<{ x: number; y: number; tx: number; ty: number } | null>(null);
  const lastTap = useRef(0);

  useEffect(() => {
    scaleRef.current = scale;
  }, [scale]);
  useEffect(() => {
    txRef.current = tx;
  }, [tx]);
  useEffect(() => {
    tyRef.current = ty;
  }, [ty]);

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [onClose]);

  const clampScale = (s: number) => Math.min(5, Math.max(1, s));

  const resetIfNeeded = (nextScale: number) => {
    if (nextScale <= 1.01) {
      setScale(1);
      setTx(0);
      setTy(0);
    }
  };

  const distance = (a: { x: number; y: number }, b: { x: number; y: number }) => {
    const dx = a.x - b.x;
    const dy = a.y - b.y;
    return Math.hypot(dx, dy);
  };

  const onPointerDown = (e: React.PointerEvent) => {
    (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    setInteracting(true);

    if (pointers.current.size === 2) {
      const [p1, p2] = Array.from(pointers.current.values());
      pinchStart.current = { dist: distance(p1, p2), scale: scaleRef.current };
      panStart.current = null;
    } else if (pointers.current.size === 1 && scaleRef.current > 1) {
      panStart.current = {
        x: e.clientX,
        y: e.clientY,
        tx: txRef.current,
        ty: tyRef.current,
      };
    }
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (!pointers.current.has(e.pointerId)) return;
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });

    if (pointers.current.size === 2 && pinchStart.current) {
      const [p1, p2] = Array.from(pointers.current.values());
      const dist = distance(p1, p2);
      if (pinchStart.current.dist > 0) {
        const next = clampScale(pinchStart.current.scale * (dist / pinchStart.current.dist));
        setScale(next);
        if (next <= 1.01) {
          setTx(0);
          setTy(0);
        }
      }
      return;
    }

    if (pointers.current.size === 1 && panStart.current && scaleRef.current > 1) {
      const dx = e.clientX - panStart.current.x;
      const dy = e.clientY - panStart.current.y;
      setTx(panStart.current.tx + dx);
      setTy(panStart.current.ty + dy);
    }
  };

  const onPointerUp = (e: React.PointerEvent) => {
    pointers.current.delete(e.pointerId);
    if (pointers.current.size < 2) pinchStart.current = null;
    if (pointers.current.size === 0) {
      panStart.current = null;
      setInteracting(false);
      resetIfNeeded(scaleRef.current);
    } else if (pointers.current.size === 1 && scaleRef.current > 1) {
      const only = Array.from(pointers.current.values())[0];
      panStart.current = {
        x: only.x,
        y: only.y,
        tx: txRef.current,
        ty: tyRef.current,
      };
    }
  };

  const onDoubleTap = () => {
    const now = Date.now();
    if (now - lastTap.current < 280) {
      if (scaleRef.current > 1.2) {
        setScale(1);
        setTx(0);
        setTy(0);
      } else {
        setScale(2.5);
      }
      lastTap.current = 0;
    } else {
      lastTap.current = now;
    }
  };

  const onWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? -0.15 : 0.15;
    const next = clampScale(scaleRef.current + delta);
    setScale(next);
    resetIfNeeded(next);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Agrandir la photo"
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 120,
        background: "rgba(0,0,0,0.94)",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          padding: "12px 14px",
          color: "#fff",
          flexShrink: 0,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <span style={{ fontSize: 13, opacity: 0.85 }}>Pincez pour zoomer · double-tap</span>
        <button
          type="button"
          onClick={onClose}
          style={{
            border: "none",
            background: "rgba(255,255,255,0.15)",
            color: "#fff",
            fontWeight: 800,
            borderRadius: 999,
            padding: "10px 16px",
            cursor: "pointer",
          }}
        >
          Fermer
        </button>
      </div>

      <div
        onClick={(e) => e.stopPropagation()}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onClickCapture={onDoubleTap}
        onWheel={onWheel}
        style={{
          flex: 1,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          overflow: "hidden",
          touchAction: "none",
          cursor: scale > 1 ? "grab" : "zoom-in",
          userSelect: "none",
        }}
      >
        <img
          src={src}
          alt={alt}
          draggable={false}
          style={{
            maxWidth: "100%",
            maxHeight: "100%",
            objectFit: "contain",
            transform: `translate3d(${tx}px, ${ty}px, 0) scale(${scale})`,
            transformOrigin: "center center",
            transition: interacting ? "none" : "transform 0.15s ease-out",
            willChange: "transform",
            pointerEvents: "none",
          }}
        />
      </div>
    </div>
  );
}
