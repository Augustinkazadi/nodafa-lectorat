"use client";

import { useEffect, useRef, useState } from "react";

/** Lecteur vocal style WhatsApp */
export function WaAudioPlayer({ src, mine = false }: { src: string; mine?: boolean }) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);

  useEffect(() => {
    const a = audioRef.current;
    if (!a) return;
    const onTime = () => setProgress(a.duration ? a.currentTime / a.duration : 0);
    const onMeta = () => setDuration(a.duration || 0);
    const onEnd = () => {
      setPlaying(false);
      setProgress(0);
    };
    a.addEventListener("timeupdate", onTime);
    a.addEventListener("loadedmetadata", onMeta);
    a.addEventListener("ended", onEnd);
    return () => {
      a.removeEventListener("timeupdate", onTime);
      a.removeEventListener("loadedmetadata", onMeta);
      a.removeEventListener("ended", onEnd);
    };
  }, [src]);

  const toggle = async () => {
    const a = audioRef.current;
    if (!a) return;
    if (playing) {
      a.pause();
      setPlaying(false);
    } else {
      await a.play();
      setPlaying(true);
    }
  };

  const seek = (e: React.MouseEvent<HTMLDivElement> | React.TouchEvent<HTMLDivElement>) => {
    const a = audioRef.current;
    if (!a || !duration) return;
    const rect = (e.currentTarget as HTMLDivElement).getBoundingClientRect();
    const clientX = "touches" in e ? e.touches[0].clientX : e.clientX;
    const ratio = Math.min(1, Math.max(0, (clientX - rect.left) / rect.width));
    a.currentTime = ratio * duration;
    setProgress(ratio);
  };

  const fmt = (s: number) => {
    if (!s || !Number.isFinite(s)) return "0:00";
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${m}:${String(sec).padStart(2, "0")}`;
  };

  const accent = mine ? "#ffffff" : "#00a884";
  const track = mine ? "rgba(255,255,255,0.28)" : "rgba(0,168,132,0.25)";

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 220, maxWidth: 280, padding: "4px 2px" }}>
      <audio ref={audioRef} src={src} preload="metadata" />
      <button
        type="button"
        onClick={toggle}
        aria-label={playing ? "Pause" : "Lecture"}
        style={{
          width: 40,
          height: 40,
          borderRadius: "50%",
          border: "none",
          background: accent,
          color: mine ? "#005c4b" : "#fff",
          fontSize: 16,
          fontWeight: 800,
          cursor: "pointer",
          flexShrink: 0,
        }}
      >
        {playing ? "❚❚" : "▶"}
      </button>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          onClick={seek}
          onTouchStart={seek}
          style={{ height: 18, display: "flex", alignItems: "center", cursor: "pointer" }}
        >
          <div style={{ width: "100%", height: 4, borderRadius: 999, background: track, position: "relative" }}>
            <div style={{ width: `${progress * 100}%`, height: "100%", borderRadius: 999, background: accent }} />
            <span
              style={{
                position: "absolute",
                left: `calc(${progress * 100}% - 6px)`,
                top: -4,
                width: 12,
                height: 12,
                borderRadius: "50%",
                background: accent,
              }}
            />
          </div>
        </div>
        <div style={{ fontSize: 11, opacity: 0.75, marginTop: 2 }}>{fmt(duration * progress || 0)} / {fmt(duration)}</div>
      </div>
      <span style={{ fontSize: 18, opacity: 0.85 }} aria-hidden>
        🎤
      </span>
    </div>
  );
}

/** Lecteur vidéo compact style WhatsApp */
export function WaVideoPlayer({ src }: { src: string }) {
  return (
    <div
      style={{
        borderRadius: 10,
        overflow: "hidden",
        background: "#000",
        maxWidth: "100%",
        border: "1px solid rgba(255,255,255,0.08)",
      }}
    >
      <video
        src={src}
        controls
        playsInline
        preload="metadata"
        style={{
          display: "block",
          width: "100%",
          maxHeight: 320,
          background: "#000",
        }}
      />
    </div>
  );
}
