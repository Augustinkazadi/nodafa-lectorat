"use client";

import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef, useState } from "react";
import { uploadMediaFile } from "@/lib/clientUpload";

export type PlatformLiveRoomHandle = {
  finalizeRecording: () => Promise<string | null>;
};

type Props = {
  roomName: string;
  displayName: string;
  isPublisher?: boolean;
  height?: number | string;
  record?: boolean;
};

type PeerInstance = {
  id: string;
  destroy: () => void;
  on: (event: string, cb: (...args: any[]) => void) => void;
  call: (id: string, stream: MediaStream, opts?: object) => any;
};

declare global {
  interface Window {
    Peer?: new (id?: string, opts?: object) => PeerInstance;
  }
}

function loadPeerScript(): Promise<void> {
  if (typeof window === "undefined") return Promise.resolve();
  if (window.Peer) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const existing = document.querySelector('script[data-peerjs="1"]') as HTMLScriptElement | null;
    if (existing) {
      existing.addEventListener("load", () => resolve());
      existing.addEventListener("error", () => reject(new Error("PeerJS indisponible")));
      return;
    }
    const script = document.createElement("script");
    script.src = "https://unpkg.com/peerjs@1.5.4/dist/peerjs.min.js";
    script.async = true;
    script.dataset.peerjs = "1";
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Impossible de charger la diffusion"));
    document.body.appendChild(script);
  });
}

async function getBroadcastStream(facingMode: "environment" | "user") {
  try {
    return await navigator.mediaDevices.getUserMedia({
      audio: true,
      video: {
        facingMode: { ideal: facingMode },
        width: { ideal: 1280 },
        height: { ideal: 720 },
      },
    });
  } catch {
    return navigator.mediaDevices.getUserMedia({ audio: true, video: true });
  }
}

function pickRecorderMime() {
  const candidates = ["video/webm;codecs=vp9,opus", "video/webm;codecs=vp8,opus", "video/webm", "video/mp4"];
  for (const c of candidates) {
    if (typeof MediaRecorder !== "undefined" && MediaRecorder.isTypeSupported(c)) return c;
  }
  return "";
}

const PlatformLiveRoom = forwardRef<PlatformLiveRoomHandle, Props>(function PlatformLiveRoom(
  { roomName, displayName, isPublisher = false, height = 480, record = true },
  ref
) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const peerRef = useRef<PeerInstance | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const callsRef = useRef<any[]>([]);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const [error, setError] = useState("");
  const [ready, setReady] = useState(false);
  const [facing, setFacing] = useState<"environment" | "user">("environment");
  const [micOn, setMicOn] = useState(true);
  const [camOn, setCamOn] = useState(true);
  const [viewers, setViewers] = useState(0);
  const [recStatus, setRecStatus] = useState("");
  const [status, setStatus] = useState(isPublisher ? "Préparation de la caméra…" : "Connexion à la diffusion…");

  const stopStream = () => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  };

  const startRecording = (stream: MediaStream) => {
    if (!record || !isPublisher || typeof MediaRecorder === "undefined") return;
    try {
      chunksRef.current = [];
      const mime = pickRecorderMime();
      const recorder = mime ? new MediaRecorder(stream, { mimeType: mime }) : new MediaRecorder(stream);
      recorderRef.current = recorder;
      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) chunksRef.current.push(e.data);
      };
      recorder.start(4000);
      setRecStatus("⏺ Enregistrement");
    } catch {
      setRecStatus("");
    }
  };

  const attachLocal = useCallback((stream: MediaStream) => {
    streamRef.current = stream;
    if (videoRef.current) {
      videoRef.current.srcObject = stream;
      videoRef.current.muted = true;
      videoRef.current.playsInline = true;
      videoRef.current.play().catch(() => null);
    }
  }, []);

  const replaceOutgoingTracks = (stream: MediaStream) => {
    const videoTrack = stream.getVideoTracks()[0];
    const audioTrack = stream.getAudioTracks()[0];
    callsRef.current.forEach((call) => {
      try {
        const senders = call.peerConnection?.getSenders?.() || [];
        senders.forEach((sender: RTCRtpSender) => {
          if (sender.track?.kind === "video" && videoTrack) sender.replaceTrack(videoTrack);
          if (sender.track?.kind === "audio" && audioTrack) sender.replaceTrack(audioTrack);
        });
      } catch {
        /* ignore */
      }
    });
  };

  useImperativeHandle(ref, () => ({
    async finalizeRecording() {
      const recorder = recorderRef.current;
      if (!recorder || recorder.state === "inactive") {
        if (!chunksRef.current.length) return null;
      } else {
        await new Promise<void>((resolve) => {
          recorder.onstop = () => resolve();
          try {
            recorder.stop();
          } catch {
            resolve();
          }
        });
      }
      recorderRef.current = null;
      setRecStatus("⬆ Envoi de la rediffusion…");

      const mime = chunksRef.current[0]?.type || "video/webm";
      const blob = new Blob(chunksRef.current, { type: mime });
      chunksRef.current = [];
      if (blob.size < 1000) {
        setRecStatus("");
        return null;
      }

      const ext = mime.includes("mp4") ? "mp4" : "webm";
      const file = new File([blob], `rediffusion-lectorat-${Date.now()}.${ext}`, { type: mime });
      try {
        const uploaded = await uploadMediaFile(file, "post");
        setRecStatus("✅ Rediffusion sauvegardée");
        return uploaded.url;
      } catch (e: any) {
        setRecStatus("");
        console.error(e);
        return null;
      }
    },
  }));

  useEffect(() => {
    let cancelled = false;
    let reconnectTimer: number | undefined;

    (async () => {
      try {
        setError("");
        setReady(false);
        await loadPeerScript();
        if (cancelled || !window.Peer) return;

        if (isPublisher) {
          setStatus("Ouverture de la caméra arrière…");
          const stream = await getBroadcastStream("environment");
          if (cancelled) {
            stream.getTracks().forEach((t) => t.stop());
            return;
          }
          attachLocal(stream);
          startRecording(stream);
          setFacing("environment");
          setStatus("Diffusion en cours");

          const peer = new window.Peer(roomName, {
            debug: 0,
            config: {
              iceServers: [
                { urls: "stun:stun.l.google.com:19302" },
                { urls: "stun:global.stun.twilio.com:3478" },
              ],
            },
          });
          peerRef.current = peer;

          peer.on("open", () => {
            if (!cancelled) setReady(true);
          });

          peer.on("error", (err: any) => {
            const msg = String(err?.type || err?.message || err);
            if (msg.includes("unavailable-id") || msg.includes("ID is taken")) {
              setReady(true);
              return;
            }
            if (!cancelled) setError(`Diffusion : ${msg}`);
          });

          peer.on("call", (call: any) => {
            const current = streamRef.current;
            if (!current) return;
            call.answer(current);
            callsRef.current.push(call);
            setViewers((v) => v + 1);
            call.on("close", () => {
              callsRef.current = callsRef.current.filter((c) => c !== call);
              setViewers((v) => Math.max(0, v - 1));
            });
            call.on("error", () => {
              callsRef.current = callsRef.current.filter((c) => c !== call);
            });
          });
        } else {
          setStatus("Connexion à l’événement…");
          const peer = new window.Peer(undefined, {
            debug: 0,
            config: {
              iceServers: [
                { urls: "stun:stun.l.google.com:19302" },
                { urls: "stun:global.stun.twilio.com:3478" },
              ],
            },
          });
          peerRef.current = peer;

          const tryWatch = () => {
            if (cancelled) return;
            const empty = new MediaStream();
            const call = peer.call(roomName, empty);
            if (!call) {
              setError("Impossible de rejoindre la diffusion. Réessayez.");
              return;
            }
            call.on("stream", (remote: MediaStream) => {
              if (cancelled) return;
              if (videoRef.current) {
                videoRef.current.srcObject = remote;
                videoRef.current.muted = false;
                videoRef.current.playsInline = true;
                videoRef.current.play().catch(() => null);
              }
              setReady(true);
              setStatus("Vous regardez l’événement");
            });
            call.on("error", () => {
              if (!cancelled) {
                setStatus("En attente du diffuseur…");
                reconnectTimer = window.setTimeout(tryWatch, 2500);
              }
            });
            call.on("close", () => {
              if (!cancelled) {
                setReady(false);
                setStatus("Diffusion interrompue — reconnexion…");
                reconnectTimer = window.setTimeout(tryWatch, 2000);
              }
            });
          };

          peer.on("open", () => tryWatch());
          peer.on("error", (err: any) => {
            if (!cancelled) setError(String(err?.type || err?.message || "Erreur spectateur"));
          });
        }
      } catch (e: any) {
        if (!cancelled) {
          setError(
            e?.name === "NotAllowedError"
              ? "Autorisez la caméra et le micro dans les paramètres du téléphone."
              : e?.message || "Caméra indisponible"
          );
        }
      }
    })();

    return () => {
      cancelled = true;
      if (reconnectTimer) window.clearTimeout(reconnectTimer);
      try {
        if (recorderRef.current && recorderRef.current.state !== "inactive") recorderRef.current.stop();
      } catch {
        /* ignore */
      }
      callsRef.current.forEach((c) => {
        try {
          c.close();
        } catch {
          /* ignore */
        }
      });
      callsRef.current = [];
      peerRef.current?.destroy();
      peerRef.current = null;
      stopStream();
    };
  }, [roomName, isPublisher, attachLocal, record]);

  const switchCamera = async () => {
    if (!isPublisher || !streamRef.current) return;
    const next = facing === "environment" ? "user" : "environment";
    try {
      setStatus(next === "environment" ? "Passage caméra arrière…" : "Passage caméra avant…");
      const fresh = await getBroadcastStream(next);
      const stream = streamRef.current;
      const oldVideo = stream.getVideoTracks()[0];
      const newVideo = fresh.getVideoTracks()[0];
      if (oldVideo && newVideo) {
        stream.removeTrack(oldVideo);
        stream.addTrack(newVideo);
        oldVideo.stop();
        fresh.getAudioTracks().forEach((t) => t.stop());
      } else {
        attachLocal(fresh);
        startRecording(fresh);
      }
      replaceOutgoingTracks(streamRef.current!);
      if (videoRef.current) {
        videoRef.current.srcObject = streamRef.current;
        videoRef.current.play().catch(() => null);
      }
      setFacing(next);
      setCamOn(true);
      setStatus("Diffusion en cours");
    } catch {
      setError("Impossible de changer de caméra sur cet appareil.");
    }
  };

  const toggleMic = () => {
    const track = streamRef.current?.getAudioTracks()[0];
    if (!track) return;
    track.enabled = !track.enabled;
    setMicOn(track.enabled);
  };

  const toggleCam = () => {
    const track = streamRef.current?.getVideoTracks()[0];
    if (!track) return;
    track.enabled = !track.enabled;
    setCamOn(track.enabled);
  };

  const minH = typeof height === "number" ? height : 320;

  return (
    <div style={{ position: "relative", background: "#000", borderRadius: 12, overflow: "hidden", minHeight: minH }}>
      <video
        ref={videoRef}
        autoPlay
        playsInline
        controls={!isPublisher}
        style={{
          width: "100%",
          height: typeof height === "number" ? height : height,
          minHeight: minH,
          objectFit: "contain",
          background: "#000",
          display: "block",
        }}
      />

      {!ready && !error && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "grid",
            placeItems: "center",
            color: "#94a3b8",
            background: "rgba(0,0,0,0.55)",
            padding: 20,
            textAlign: "center",
          }}
        >
          {status}
        </div>
      )}

      {error && (
        <div style={{ position: "absolute", inset: 0, display: "grid", placeItems: "center", padding: 24, background: "rgba(0,0,0,0.8)" }}>
          <div style={{ color: "#fecaca", textAlign: "center", maxWidth: 320 }}>
            {error}
            <div style={{ marginTop: 10, fontSize: 13, color: "#94a3b8" }}>
              {isPublisher
                ? "Sur téléphone : autorisez Caméra + Micro, puis utilisez « Caméra arrière »."
                : "Attendez que le diffuseur démarre, puis rafraîchissez."}
            </div>
          </div>
        </div>
      )}

      {isPublisher && ready && (
        <div
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            bottom: 0,
            padding: "12px 10px",
            background: "linear-gradient(transparent, rgba(0,0,0,0.75))",
            display: "flex",
            gap: 8,
            justifyContent: "center",
            flexWrap: "wrap",
          }}
        >
          <button type="button" onClick={switchCamera} style={ctrlBtn}>
            {facing === "environment" ? "📷 Caméra avant" : "📷 Caméra arrière"}
          </button>
          <button type="button" onClick={toggleMic} style={ctrlBtn}>
            {micOn ? "🎤 Micro ON" : "🎤 Micro OFF"}
          </button>
          <button type="button" onClick={toggleCam} style={ctrlBtn}>
            {camOn ? "📹 Vidéo ON" : "📹 Vidéo OFF"}
          </button>
          <span style={{ ...ctrlBtn, cursor: "default", opacity: 0.85 }}>
            👁 {viewers} spectateur{viewers > 1 ? "s" : ""}
          </span>
          {recStatus && (
            <span style={{ ...ctrlBtn, cursor: "default", background: "#fee2e2", color: "#b91c1c" }}>{recStatus}</span>
          )}
        </div>
      )}

      {!isPublisher && ready && (
        <div
          style={{
            position: "absolute",
            top: 10,
            left: 10,
            background: "rgba(0,0,0,0.55)",
            color: "#fff",
            fontSize: 12,
            fontWeight: 700,
            padding: "4px 8px",
            borderRadius: 8,
          }}
        >
          Mode spectateur · {displayName}
        </div>
      )}
    </div>
  );
});

export default PlatformLiveRoom;

const ctrlBtn: React.CSSProperties = {
  border: "none",
  background: "rgba(255,255,255,0.92)",
  color: "#0f172a",
  fontWeight: 800,
  fontSize: 13,
  padding: "10px 12px",
  borderRadius: 10,
  cursor: "pointer",
};
