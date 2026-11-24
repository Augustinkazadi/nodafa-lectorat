"use client";
import { useState, useEffect, useRef, useMemo } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { uploadMediaFile } from "@/lib/clientUpload";
import AppNavbar from "@/components/AppNavbar";
import { resolveMessageMediaType } from "@/lib/media";
import { WaAudioPlayer, WaVideoPlayer } from "@/components/WaMediaPlayers";
import ThemeToggle from "@/components/ThemeToggle";
import PresenceToastStack from "@/components/PresenceToast";
import PhotoLightbox from "@/components/PhotoLightbox";

const EMOJIS = ["😀", "😂", "🙏", "❤️", "👍", "🎉", "🔥", "😊", "🙌", "✝️", "😇", "👏"];
const profileUrl = (id: number) => `/profil?id=${id}`;

export default function MessagesPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const userId = parseInt((session?.user as any)?.id || "0");

  const [conversations, setConversations] = useState<any[]>([]);
  const [activeConvId, setActiveConvId] = useState<number | null>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [receiverId, setReceiverId] = useState<number | null>(null);
  const [users, setUsers] = useState<any[]>([]);
  const [file, setFile] = useState<File | null>(null);
  const [filePreview, setFilePreview] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [showEmoji, setShowEmoji] = useState(false);
  const [replyTo, setReplyTo] = useState<any | null>(null);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editText, setEditText] = useState("");
  const [sending, setSending] = useState(false);
  const [recording, setRecording] = useState(false);
  const [mobileShowChat, setMobileShowChat] = useState(false);
  const [unreadCount, setUnreadCount] = useState({ notifications: 0, messages: 0 });
  const [kbOffset, setKbOffset] = useState(0);
  const [openingBroadcast, setOpeningBroadcast] = useState(false);
  const [onlineUsers, setOnlineUsers] = useState<any[]>([]);
  const [presenceToasts, setPresenceToasts] = useState<{ id: number; name: string; photo?: string | null }[]>([]);
  const [photoView, setPhotoView] = useState<{ src: string; alt: string } | null>(null);
  const knownOnlineRef = useRef<Set<number>>(new Set());
  const presenceReadyRef = useRef(false);

  const openProfilePhoto = (photo?: string | null, name?: string, e?: React.SyntheticEvent) => {
    e?.preventDefault();
    e?.stopPropagation();
    const src = typeof photo === "string" ? photo.trim() : "";
    if (!src) return;
    // Différer pour éviter qu’un clic tactile ferme tout de suite la visionneuse
    window.setTimeout(() => {
      setPhotoView({ src, alt: name ? `Photo de ${name}` : "Photo de profil" });
    }, 0);
  };

  const backToDiscussionList = () => {
    setMobileShowChat(false);
    setActiveConvId(null);
    setReceiverId(null);
    setMessages([]);
    setReplyTo(null);
    setEditingId(null);
    setShowEmoji(false);
  };

  const fileInputRef = useRef<HTMLInputElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const isAdmin = (session?.user as any)?.role === "ADMIN";
  const inChat = !!(activeConvId || receiverId) && mobileShowChat;

  useEffect(() => {
    if (status === "unauthenticated") router.push("/login");
    if (status === "authenticated") {
      fetchConversations();
      fetchUsers();
      fetch("/api/unread-count")
        .then((r) => (r.ok ? r.json() : null))
        .then((d) => d && setUnreadCount(d))
        .catch(() => null);
    }
  }, [status, router]);

  useEffect(() => {
    if (!activeConvId) return;
    const timer = setInterval(() => fetchMessages(activeConvId, true), 4000);
    return () => clearInterval(timer);
  }, [activeConvId]);

  useEffect(() => {
    if (status !== "authenticated" || !userId) return;

    const pollOnline = async () => {
      try {
        const res = await fetch("/api/presence");
        if (!res.ok) return;
        const data = await res.json();
        const list = (data.users || []).filter((u: any) => u.id !== userId);
        setOnlineUsers(list);

        const nextIds = new Set<number>(list.map((u: any) => u.id));
        if (presenceReadyRef.current) {
          for (const u of list) {
            if (!knownOnlineRef.current.has(u.id)) {
              const toastId = Date.now() + u.id;
              const name = `${u.prenom || ""} ${u.nom || ""}`.trim() || "Un lecteur";
              setPresenceToasts((prev) => [...prev.slice(-2), { id: toastId, name, photo: u.photo }]);
              window.setTimeout(() => {
                setPresenceToasts((prev) => prev.filter((t) => t.id !== toastId));
              }, 4200);
            }
          }
        }
        knownOnlineRef.current = nextIds;
        presenceReadyRef.current = true;
      } catch {
        /* ignore */
      }
    };

    pollOnline();
    const timer = window.setInterval(pollOnline, 15000);
    return () => window.clearInterval(timer);
  }, [status, userId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, activeConvId]);

  useEffect(() => {
    if (!inChat) {
      setKbOffset(0);
      return;
    }
    const vv = window.visualViewport;
    if (!vv) return;
    const sync = () => {
      const offset = Math.max(0, window.innerHeight - vv.height - vv.offsetTop);
      setKbOffset(offset);
    };
    vv.addEventListener("resize", sync);
    vv.addEventListener("scroll", sync);
    sync();
    return () => {
      vv.removeEventListener("resize", sync);
      vv.removeEventListener("scroll", sync);
    };
  }, [inChat]);

  const fetchConversations = async () => {
    try {
      const res = await fetch("/api/messages");
      if (res.ok) setConversations(await res.json());
    } catch (e) {
      console.error(e);
    }
  };

  const fetchUsers = async () => {
    try {
      const res = await fetch("/api/users");
      if (res.ok) setUsers(await res.json());
    } catch (e) {
      console.error(e);
    }
  };

  const fetchMessages = async (convId: number, silent = false) => {
    if (!silent) {
      setActiveConvId(convId);
      setReceiverId(null);
      setMobileShowChat(true);
    }
    try {
      const res = await fetch(`/api/messages/${convId}`);
      if (res.ok) {
        setMessages(await res.json());
        fetchConversations();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleNewConversation = (uid: number) => {
    setReceiverId(uid);
    setActiveConvId(null);
    setMessages([]);
    setMobileShowChat(true);
  };

  const openBroadcast = async () => {
    setOpeningBroadcast(true);
    try {
      const formData = new FormData();
      formData.append("broadcast", "1");
      formData.append("content", "👋 Bienvenue dans les annonces du lectorat.");
      const existing = conversations.find((c) => c.isBroadcast);
      if (existing) {
        await fetchMessages(existing.id);
        return;
      }
      const res = await fetch("/api/messages", { method: "POST", body: formData });
      if (res.ok) {
        const data = await res.json();
        await fetchConversations();
        if (data.conversationId) await fetchMessages(data.conversationId);
      } else {
        const err = await res.json().catch(() => ({}));
        alert(err.message || "Impossible d’ouvrir l’annonce à tous");
      }
    } finally {
      setOpeningBroadcast(false);
    }
  };

  const clearFile = () => {
    if (filePreview) URL.revokeObjectURL(filePreview);
    setFile(null);
    setFilePreview(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const onPickFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0] || null;
    if (!f) return;
    setFile(f);
    if (f.type.startsWith("image/") || f.type.startsWith("video/") || f.type.startsWith("audio/") || /^vocal/i.test(f.name)) {
      setFilePreview(URL.createObjectURL(f));
    } else {
      setFilePreview(null);
    }
  };

  const handleSend = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if ((!newMessage.trim() && !file) || sending) return;
    setSending(true);
    try {
      let mediaUrl = "";
      let mediaType = "";
      let mediaName = "";
      if (file) {
        const uploaded = await uploadMediaFile(file, "message");
        mediaUrl = uploaded.url;
        mediaName = uploaded.name;
        const isVoice =
          file.type.startsWith("audio/") ||
          /^vocal[-_]/i.test(file.name) ||
          uploaded.mediaType === "AUDIO";
        mediaType = isVoice ? "AUDIO" : uploaded.mediaType;
      }

      const formData = new FormData();
      formData.append("content", newMessage);
      if (receiverId) formData.append("receiverId", receiverId.toString());
      if (activeConvId) formData.append("conversationId", activeConvId.toString());
      if (replyTo) formData.append("replyToId", replyTo.id.toString());
      if (mediaUrl) {
        formData.append("mediaUrl", mediaUrl);
        formData.append("mediaType", mediaType);
        formData.append("mediaName", mediaName);
      }

      const res = await fetch("/api/messages", { method: "POST", body: formData });
      if (res.ok) {
        const data = await res.json();
        setNewMessage("");
        setReplyTo(null);
        clearFile();
        setShowEmoji(false);
        const convId = data.conversationId || activeConvId;
        if (convId) {
          setActiveConvId(convId);
          await fetchMessages(convId);
        }
        fetchConversations();
      } else {
        const err = await res.json().catch(() => ({}));
        alert(err.message || "Envoi impossible");
      }
    } catch (err: any) {
      alert(err?.message || "Envoi impossible");
    } finally {
      setSending(false);
    }
  };

  const handleDeleteMessage = async (msgId: number) => {
    if (!confirm("Supprimer ce message pour tout le monde ?")) return;
    const res = await fetch(`/api/messages/${msgId}/delete`, { method: "DELETE" });
    if (res.ok) setMessages((prev) => prev.filter((m) => m.id !== msgId));
  };

  const handleEditMessage = async (msgId: number) => {
    if (!editText.trim()) return;
    const res = await fetch(`/api/messages/${msgId}/edit`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: editText }),
    });
    if (res.ok) {
      const updated = await res.json();
      setMessages((prev) => prev.map((m) => (m.id === msgId ? { ...m, ...updated } : m)));
      setEditingId(null);
      setEditText("");
    }
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const preferred = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
        ? "audio/webm;codecs=opus"
        : MediaRecorder.isTypeSupported("audio/webm")
          ? "audio/webm"
          : MediaRecorder.isTypeSupported("audio/mp4")
            ? "audio/mp4"
            : "";
      const recorder = preferred ? new MediaRecorder(stream, { mimeType: preferred }) : new MediaRecorder(stream);
      chunksRef.current = [];
      recorder.ondataavailable = (ev) => {
        if (ev.data.size > 0) chunksRef.current.push(ev.data);
      };
      recorder.onstop = () => {
        const mime = (recorder.mimeType || "audio/webm").split(";")[0];
        const ext = mime.includes("mp4") ? "m4a" : "webm";
        const blob = new Blob(chunksRef.current, { type: mime });
        const audioFile = new File([blob], `vocal-${Date.now()}.${ext}`, { type: mime.startsWith("audio/") ? mime : "audio/webm" });
        setFile(audioFile);
        setFilePreview(URL.createObjectURL(audioFile));
        stream.getTracks().forEach((t) => t.stop());
      };
      mediaRecorderRef.current = recorder;
      recorder.start();
      setRecording(true);
    } catch {
      alert("Micro inaccessible. Autorisez le microphone ou envoyez un fichier audio.");
    }
  };

  const stopRecording = () => {
    mediaRecorderRef.current?.stop();
    setRecording(false);
  };

  const activeConv = useMemo(
    () => conversations.find((c) => c.id === activeConvId) || null,
    [conversations, activeConvId]
  );

  const usersById = useMemo(() => {
    const map = new Map<number, any>();
    for (const u of users) map.set(u.id, u);
    return map;
  }, [users]);

  const withPhoto = (user: any | null | undefined) => {
    if (!user) return null;
    if (user.photo) return user;
    const fromList = usersById.get(user.id);
    return fromList?.photo ? { ...user, photo: fromList.photo } : user;
  };

  const activePeer = useMemo(() => {
    if (receiverId) return withPhoto(users.find((u) => u.id === receiverId));
    if (!activeConvId) return null;
    if (activeConv?.isBroadcast) return null;
    const peer = activeConv?.participants?.map((p: any) => p.user).find((u: any) => u.id !== userId) || null;
    return withPhoto(peer);
  }, [receiverId, activeConvId, activeConv, users, usersById, userId]);

  // Si la photo manque encore dans la conversation, la récupérer
  useEffect(() => {
    if (!activePeer?.id || activePeer.photo) return;
    let cancelled = false;
    fetch(`/api/presence?ids=${activePeer.id}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((list) => {
        if (cancelled || !Array.isArray(list) || !list[0]?.photo) return;
        setUsers((prev) => {
          const exists = prev.some((u) => u.id === list[0].id);
          if (exists) {
            return prev.map((u) => (u.id === list[0].id ? { ...u, photo: list[0].photo, lastSeenAt: list[0].lastSeenAt } : u));
          }
          return [...prev, list[0]];
        });
      })
      .catch(() => null);
    return () => {
      cancelled = true;
    };
  }, [activePeer?.id, activePeer?.photo]);

  const filteredConversations = conversations.filter((conv) => {
    if (!search.trim()) return true;
    const peer = conv.participants.map((p: any) => p.user).find((u: any) => u.id !== userId);
    const name = `${peer?.prenom || ""} ${peer?.nom || ""}`.toLowerCase();
    const last = conv.messages?.[0]?.content?.toLowerCase() || "";
    return name.includes(search.toLowerCase()) || last.includes(search.toLowerCase());
  });

  const filteredUsers = users.filter((u) => {
    if (u.id === userId) return false;
    if (!search.trim()) return true;
    return `${u.prenom} ${u.nom}`.toLowerCase().includes(search.toLowerCase());
  });

  if (status === "loading") {
    return <div style={{ padding: 50, textAlign: "center", fontFamily: "Segoe UI, sans-serif" }}>Chargement...</div>;
  }

  return (
    <div
      className={`messages-page${inChat ? " messages-page--chat" : ""}`}
      style={{ minHeight: "100vh", background: "var(--wa-shell)", color: "var(--wa-ink)" }}
    >
      <PresenceToastStack
        toasts={presenceToasts}
        onDismiss={(id) => setPresenceToasts((prev) => prev.filter((t) => t.id !== id))}
      />
      {photoView && (
        <PhotoLightbox
          images={[photoView.src]}
          index={0}
          alt={photoView.alt}
          onClose={() => setPhotoView(null)}
        />
      )}
      <AppNavbar
        userName={session?.user?.name}
        userPhoto={(session?.user as any)?.image}
        isAdmin={isAdmin}
        unreadNotifications={unreadCount.notifications}
        unreadMessages={unreadCount.messages}
        active="messages"
        hideChrome={inChat}
      />
      <div
        className="messages-shell"
        style={{
          display: "flex",
          height: inChat ? "100dvh" : "calc(100dvh - 58px)",
          fontFamily: "Segoe UI, Helvetica Neue, Arial, sans-serif",
          background: "var(--wa-shell)",
          color: "var(--wa-ink)",
          overflow: "hidden",
        }}
      >
      {/* Liste conversations */}
      <aside
        style={{
          width: mobileShowChat ? 0 : 360,
          minWidth: mobileShowChat ? 0 : 280,
          maxWidth: 420,
          background: "var(--wa-shell)",
          borderRight: "1px solid var(--wa-line)",
          display: mobileShowChat ? "none" : "flex",
          flexDirection: "column",
          flex: mobileShowChat ? undefined : "0 0 34%",
        }}
        className="wa-sidebar"
      >
        <div style={{ padding: "12px 14px", background: "var(--wa-panel)", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10 }}>
          <strong style={{ fontSize: 16 }}>Discussions</strong>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <ThemeToggle variant="icon" />
            <Link href="/journal" style={{ color: "var(--wa-accent)", textDecoration: "none", fontWeight: 700, fontSize: 13 }}>
              Journal
            </Link>
          </div>
        </div>

        {onlineUsers.length > 0 && (
          <div style={{ padding: "10px 12px 6px", background: "var(--wa-shell)", borderBottom: "1px solid var(--wa-line)" }}>
            <div style={{ fontSize: 12, fontWeight: 800, color: "var(--wa-muted)", marginBottom: 8 }}>
              EN LIGNE · {onlineUsers.length}
            </div>
            <div style={{ display: "flex", gap: 12, overflowX: "auto", paddingBottom: 6 }}>
              {onlineUsers.map((u) => (
                <div key={`online-${u.id}`} style={{ minWidth: 64, textAlign: "center" }}>
                  <button
                    type="button"
                    onClick={(e) => (u.photo ? openProfilePhoto(u.photo, `${u.prenom} ${u.nom}`, e) : handleNewConversation(u.id))}
                    title={u.photo ? "Voir la photo" : `Écrire à ${u.prenom}`}
                    style={{ display: "block", border: "none", background: "transparent", padding: 0, margin: "0 auto", cursor: u.photo ? "zoom-in" : "pointer" }}
                  >
                    <div style={{ position: "relative", width: 52, height: 52, margin: "0 auto 6px" }}>
                      {u.photo ? (
                        <img
                          src={u.photo}
                          alt=""
                          style={{ width: 52, height: 52, borderRadius: "50%", objectFit: "cover", border: "2px solid var(--wa-accent)" }}
                        />
                      ) : (
                        <div
                          style={{
                            width: 52,
                            height: 52,
                            borderRadius: "50%",
                            background: "var(--wa-accent)",
                            color: "var(--wa-on-accent)",
                            display: "grid",
                            placeItems: "center",
                            fontWeight: 800,
                            border: "2px solid var(--wa-accent)",
                          }}
                        >
                          {(u.prenom || "U").charAt(0).toUpperCase()}
                        </div>
                      )}
                      <span
                        style={{
                          position: "absolute",
                          right: 1,
                          bottom: 1,
                          width: 12,
                          height: 12,
                          borderRadius: "50%",
                          background: "var(--online)",
                          border: "2px solid var(--wa-shell)",
                        }}
                      />
                    </div>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleNewConversation(u.id)}
                    style={{
                      border: "none",
                      background: "transparent",
                      color: "var(--wa-ink)",
                      cursor: "pointer",
                      padding: 0,
                      fontSize: 11,
                      fontWeight: 700,
                      maxWidth: 64,
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                    }}
                    title={`Écrire à ${u.prenom}`}
                  >
                    {u.prenom}
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        <div style={{ padding: 10, background: "var(--wa-shell)", display: "grid", gap: 8 }}>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher ou démarrer une discussion"
            style={{
              width: "100%",
              boxSizing: "border-box",
              background: "var(--wa-panel)",
              border: "none",
              borderRadius: 8,
              padding: "10px 14px",
              color: "var(--wa-ink)",
              outline: "none",
            }}
          />
          <button
            type="button"
            onClick={openBroadcast}
            disabled={openingBroadcast}
            style={{
              border: "none",
              borderRadius: 10,
              padding: "12px 14px",
              background: "linear-gradient(135deg,#005c4b,var(--wa-accent))",
              color: "#fff",
              fontWeight: 800,
              cursor: "pointer",
              textAlign: "left",
            }}
          >
            {openingBroadcast ? "Ouverture…" : "📢 Annonce à tout le lectorat"}
          </button>
        </div>

        <div style={{ flex: 1, overflowY: "auto" }}>
          {search.trim() && (
            <div style={{ padding: "8px 16px", color: "var(--wa-muted)", fontSize: 12, fontWeight: 700 }}>CONTACTS</div>
          )}
          {search.trim() &&
            filteredUsers.map((u) => (
              <div
                key={`u-${u.id}`}
                className="wa-list-item"
                style={{ ...listItemStyle, cursor: "default" }}
              >
                <button
                  type="button"
                  onClick={(e) => (u.photo ? openProfilePhoto(u.photo, `${u.prenom} ${u.nom}`, e) : handleNewConversation(u.id))}
                  title={u.photo ? "Voir la photo" : "Ouvrir la discussion"}
                  style={{ border: "none", background: "transparent", padding: 0, cursor: u.photo ? "zoom-in" : "pointer" }}
                >
                  <Avatar src={u.photo} name={u.prenom} size={48} online={!!u.online} />
                </button>
                <button
                  type="button"
                  onClick={() => handleNewConversation(u.id)}
                  style={{ flex: 1, textAlign: "left", overflow: "hidden", border: "none", background: "transparent", color: "inherit", cursor: "pointer", padding: 0 }}
                >
                  <div style={{ fontWeight: 600 }}>
                    {u.prenom} {u.nom}
                  </div>
                  <div style={{ color: u.online ? "var(--wa-accent)" : "var(--wa-muted)", fontSize: 13 }}>
                    {u.online ? "En ligne" : u.presenceLabel || "Hors ligne"}
                  </div>
                </button>
              </div>
            ))}

          <div style={{ padding: "8px 16px", color: "var(--wa-muted)", fontSize: 12, fontWeight: 700 }}>DISCUSSIONS</div>
          {filteredConversations.length === 0 && (
            <p style={{ color: "var(--wa-muted)", padding: 16, fontSize: 14 }}>Aucune conversation.</p>
          )}
          {filteredConversations.map((conv) => {
            const peer = withPhoto(conv.participants.map((p: any) => p.user).find((u: any) => u.id !== userId));
            const last = conv.messages?.[0];
            const preview = last
              ? resolveMessageMediaType(last)
                ? mediaLabel(resolveMessageMediaType(last) || "", last.mediaName)
                : last.content || ""
              : "Aucun message";
            const title = conv.isBroadcast ? conv.title || "Annonce Lectorat" : peer ? `${peer.prenom} ${peer.nom}` : "Discussion";
            return (
              <div
                key={conv.id}
                className="wa-list-item"
                style={{
                  ...listItemStyle,
                  background: activeConvId === conv.id ? "var(--wa-panel-2)" : "transparent",
                  cursor: "default",
                }}
              >
                {conv.isBroadcast ? (
                  <button
                    type="button"
                    onClick={() => fetchMessages(conv.id)}
                    style={{
                      width: 48,
                      height: 48,
                      borderRadius: "50%",
                      background: "var(--wa-accent)",
                      color: "var(--wa-on-accent)",
                      display: "grid",
                      placeItems: "center",
                      fontSize: 22,
                      flexShrink: 0,
                      border: "none",
                      cursor: "pointer",
                    }}
                  >
                    📢
                  </button>
                ) : peer ? (
                  <button
                    type="button"
                    onClick={(e) => (peer.photo ? openProfilePhoto(peer.photo, title, e) : fetchMessages(conv.id))}
                    title={peer.photo ? "Voir la photo" : "Ouvrir la discussion"}
                    style={{ border: "none", background: "transparent", padding: 0, cursor: peer.photo ? "zoom-in" : "pointer" }}
                  >
                    <Avatar src={peer.photo} name={peer.prenom || "U"} size={48} online={isOnline(peer.lastSeenAt)} />
                  </button>
                ) : (
                  <Avatar src={null} name="U" size={48} />
                )}
                <button
                  type="button"
                  onClick={() => fetchMessages(conv.id)}
                  style={{ flex: 1, textAlign: "left", overflow: "hidden", border: "none", background: "transparent", color: "inherit", cursor: "pointer", padding: 0, minWidth: 0 }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
                    <span style={{ fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                      {title}
                    </span>
                    <span style={{ color: conv.unread ? "var(--wa-accent)" : "var(--wa-muted)", fontSize: 12, flexShrink: 0 }}>
                      {last ? shortTime(last.createdAt) : ""}
                    </span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 8, marginTop: 2 }}>
                    <span
                      style={{
                        color: "var(--wa-muted)",
                        fontSize: 13,
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                      }}
                    >
                      {preview}
                    </span>
                    {conv.unread > 0 && (
                      <span
                        style={{
                          background: "var(--wa-accent)",
                          color: "var(--wa-on-accent)",
                          borderRadius: 10,
                          minWidth: 20,
                          height: 20,
                          fontSize: 11,
                          fontWeight: 800,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          padding: "0 6px",
                        }}
                      >
                        {conv.unread}
                      </span>
                    )}
                  </div>
                </button>
              </div>
            );
          })}
        </div>
      </aside>

      {/* Zone chat */}
      <section
        style={{
          flex: 1,
          display: !mobileShowChat && !activeConvId && !receiverId ? "none" : "flex",
          flexDirection: "column",
          minWidth: 0,
          background: "var(--wa-bg)",
        }}
        className="wa-chat"
      >
        {activeConvId || receiverId ? (
          <>
            <div
              className="wa-chat-header"
              style={{
                padding: "10px 16px",
                background: "var(--wa-panel)",
                display: "flex",
                alignItems: "center",
                gap: 12,
                borderBottom: "1px solid var(--wa-line)",
              }}
            >
              <button
                type="button"
                onClick={backToDiscussionList}
                style={{ ...ghostBtn, display: "inline-flex", fontSize: 20, fontWeight: 700, minWidth: 36 }}
                className="wa-back"
                title="Retour à la liste des discussions"
                aria-label="Retour à la liste des discussions"
              >
                ←
              </button>
              {activeConv?.isBroadcast ? (
                <div
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: "50%",
                    background: "var(--wa-accent)",
                    color: "var(--wa-on-accent)",
                    display: "grid",
                    placeItems: "center",
                    fontSize: 18,
                    flexShrink: 0,
                  }}
                >
                  📢
                </div>
              ) : activePeer ? (
                <button
                  type="button"
                  onClick={(e) => openProfilePhoto(activePeer.photo, `${activePeer.prenom} ${activePeer.nom}`, e)}
                  title={activePeer.photo ? "Agrandir la photo" : "Pas de photo"}
                  aria-label="Agrandir la photo de profil"
                  style={{
                    border: "none",
                    background: "transparent",
                    padding: 0,
                    cursor: activePeer.photo ? "zoom-in" : "default",
                    flexShrink: 0,
                    borderRadius: "50%",
                    position: "relative",
                    zIndex: 2,
                  }}
                >
                  <Avatar src={activePeer.photo} name={activePeer.prenom || "U"} size={44} online={isOnline(activePeer.lastSeenAt)} />
                </button>
              ) : (
                <Avatar src={null} name="U" size={44} />
              )}
              {activeConv?.isBroadcast ? (
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 700 }}>{activeConv.title || "Annonce Lectorat"}</div>
                  <div style={{ color: "var(--wa-muted)", fontSize: 12 }}>Message visible par tous les lecteurs</div>
                </div>
              ) : activePeer ? (
                <Link
                  href={profileUrl(activePeer.id)}
                  style={{ flex: 1, minWidth: 0, textDecoration: "none", color: "inherit" }}
                  title="Voir le profil et ses publications"
                >
                  <div style={{ fontWeight: 700 }}>
                    {activePeer.prenom} {activePeer.nom}
                  </div>
                  <div style={{ color: isOnline(activePeer.lastSeenAt) ? "var(--wa-accent)" : "var(--wa-muted)", fontSize: 12 }}>
                    {presenceText(activePeer.lastSeenAt)} · Voir le profil
                  </div>
                </Link>
              ) : (
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 700 }}>Discussion</div>
                  <div style={{ color: "var(--wa-muted)", fontSize: 12 }}>
                    {activeConvId ? "Discussion privée" : "Nouvelle discussion"}
                  </div>
                </div>
              )}
            </div>

            <div
              style={{
                flex: 1,
                overflowY: "auto",
                padding: "18px 5% 12px",
                background: "var(--wa-bg)",
              }}
            >
              {messages.length === 0 && (
                <div style={{ textAlign: "center", color: "var(--wa-muted)", marginTop: 40 }}>
                  {receiverId ? "Dites bonjour 👋" : "Aucun message"}
                </div>
              )}

              {groupByDate(messages).map((group) => (
                <div key={group.label}>
                  <div style={{ textAlign: "center", margin: "16px 0" }}>
                    <span
                      style={{
                        background: "var(--wa-date)",
                        color: "var(--wa-muted)",
                        fontSize: 12,
                        padding: "6px 12px",
                        borderRadius: 8,
                      }}
                    >
                      {group.label}
                    </span>
                  </div>
                  {group.items.map((msg) => {
                    const isMine = msg.senderId === userId;
                    const sender = withPhoto(msg.sender);
                    const showSenderAvatar = !isMine && !!sender;
                    return (
                      <div
                        key={msg.id}
                        style={{
                          display: "flex",
                          justifyContent: isMine ? "flex-end" : "flex-start",
                          alignItems: "flex-end",
                          gap: 6,
                          marginBottom: 6,
                        }}
                      >
                        {showSenderAvatar && (
                          <button
                            type="button"
                            onClick={(e) => openProfilePhoto(sender.photo, `${sender.prenom || ""} ${sender.nom || ""}`, e)}
                            title={sender.photo ? "Voir la photo" : undefined}
                            style={{
                              border: "none",
                              background: "transparent",
                              padding: 0,
                              flexShrink: 0,
                              cursor: sender.photo ? "zoom-in" : "default",
                              position: "relative",
                              zIndex: 2,
                            }}
                          >
                            <Avatar src={sender.photo} name={sender.prenom || "U"} size={28} online={isOnline(sender.lastSeenAt)} />
                          </button>
                        )}
                        <div
                          style={{
                            maxWidth: "min(75%, 520px)",
                            background: isMine ? "var(--wa-bubble-out)" : "var(--wa-bubble-in)",
                            color: "var(--wa-ink)",
                            borderRadius: isMine ? "10px 10px 0 10px" : "10px 10px 10px 0",
                            padding: "6px 9px 4px",
                            boxShadow: "0 1px 0.5px rgba(11,20,26,0.13)",
                            position: "relative",
                            border: isMine ? "none" : "1px solid var(--wa-line)",
                          }}
                          className="wa-bubble"
                        >
                          {showSenderAvatar && activeConv?.isBroadcast && (
                            <Link
                              href={profileUrl(sender.id)}
                              style={{
                                display: "block",
                                fontSize: 12,
                                fontWeight: 800,
                                color: "var(--wa-accent)",
                                textDecoration: "none",
                                marginBottom: 4,
                              }}
                            >
                              {sender.prenom} {sender.nom}
                            </Link>
                          )}
                          {msg.replyTo && (
                            <div
                              style={{
                                background: "rgba(0,0,0,0.2)",
                                borderLeft: "3px solid var(--wa-accent)",
                                borderRadius: 6,
                                padding: "6px 8px",
                                marginBottom: 6,
                                fontSize: 12,
                                color: "var(--wa-muted)",
                              }}
                            >
                              <strong style={{ color: "var(--wa-accent)" }}>
                                {msg.replyTo.sender?.prenom} {msg.replyTo.sender?.nom}
                              </strong>
                              <div>
                                {msg.replyTo.mediaType
                                  ? mediaLabel(msg.replyTo.mediaType, msg.replyTo.mediaName)
                                  : msg.replyTo.content}
                              </div>
                            </div>
                          )}

                          {editingId === msg.id ? (
                            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                              <textarea
                                value={editText}
                                onChange={(e) => setEditText(e.target.value)}
                                style={{
                                  width: "100%",
                                  minHeight: 60,
                                  borderRadius: 8,
                                  border: "none",
                                  padding: 8,
                                  background: "var(--wa-on-accent)",
                                  color: "var(--wa-ink)",
                                }}
                              />
                              <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
                                <button type="button" onClick={() => setEditingId(null)} style={ghostBtn}>
                                  Annuler
                                </button>
                                <button type="button" onClick={() => handleEditMessage(msg.id)} style={primaryBtn}>
                                  Enregistrer
                                </button>
                              </div>
                            </div>
                          ) : (
                            <>
                              <MessageBody
                                msg={msg}
                                mine={isMine}
                                onOpenImage={(src, e) => openProfilePhoto(src, "Photo", e)}
                              />
                              <div
                                style={{
                                  display: "flex",
                                  justifyContent: "flex-end",
                                  alignItems: "center",
                                  gap: 6,
                                  marginTop: 2,
                                  color: "rgba(233,237,239,0.65)",
                                  fontSize: 11,
                                }}
                              >
                                {msg.isEdited && <span>modifié</span>}
                                <span>
                                  {new Date(msg.createdAt).toLocaleTimeString("fr-FR", {
                                    timeZone: "Africa/Kinshasa",
                                    hour: "2-digit",
                                    minute: "2-digit",
                                  })}
                                </span>
                                {isMine && <Receipt status={msg.receipt} />}
                              </div>
                            </>
                          )}

                          <div style={{ display: "flex", gap: 8, marginTop: 4, justifyContent: isMine ? "flex-end" : "flex-start" }}>
                            <button type="button" onClick={() => setReplyTo(msg)} style={tinyAction}>
                              Répondre
                            </button>
                            {isMine && (
                              <>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setEditingId(msg.id);
                                    setEditText(msg.content || "");
                                  }}
                                  style={tinyAction}
                                >
                                  Modifier
                                </button>
                                <button type="button" onClick={() => handleDeleteMessage(msg.id)} style={{ ...tinyAction, color: "var(--wa-danger)" }}>
                                  Supprimer
                                </button>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ))}
              <div ref={bottomRef} />
            </div>

            {replyTo && (
              <div
                style={{
                  background: "var(--wa-panel)",
                  borderTop: "1px solid var(--wa-line)",
                  padding: "8px 16px",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  gap: 10,
                }}
              >
                <div style={{ borderLeft: "3px solid var(--wa-accent)", paddingLeft: 10, minWidth: 0 }}>
                  <div style={{ color: "var(--wa-accent)", fontWeight: 700, fontSize: 13 }}>
                    Réponse à {replyTo.sender?.prenom || "message"}
                  </div>
                  <div style={{ color: "var(--wa-muted)", fontSize: 13, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                    {replyTo.mediaType ? mediaLabel(replyTo.mediaType, replyTo.mediaName) : replyTo.content}
                  </div>
                </div>
                <button type="button" onClick={() => setReplyTo(null)} style={ghostBtn}>
                  ✕
                </button>
              </div>
            )}

            {file && (
              <div
                style={{
                  background: "var(--wa-panel)",
                  padding: "8px 16px",
                  borderTop: "1px solid var(--wa-line)",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  gap: 12,
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0, flex: 1 }}>
                  {filePreview && file.type.startsWith("image/") && (
                    <img src={filePreview} alt="" style={{ width: 48, height: 48, objectFit: "cover", borderRadius: 8 }} />
                  )}
                  {filePreview && file.type.startsWith("video/") && !file.type.startsWith("audio/") && !/^vocal/i.test(file.name) && (
                    <video src={filePreview} style={{ width: 72, height: 48, objectFit: "cover", borderRadius: 8 }} />
                  )}
                  {(file.type.startsWith("audio/") || /^vocal/i.test(file.name)) && filePreview && (
                    <div style={{ display: "flex", alignItems: "center", gap: 8, flex: 1 }}>
                      <span>🎤</span>
                      <audio src={filePreview} controls style={{ width: "100%", maxWidth: 220 }} />
                    </div>
                  )}
                  <div style={{ overflow: "hidden" }}>
                    <div style={{ fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                      {/^vocal/i.test(file.name) || file.type.startsWith("audio/") ? "Note vocale prête" : file.name}
                    </div>
                    <div style={{ color: "var(--wa-muted)", fontSize: 12 }}>{(file.size / 1024 / 1024).toFixed(2)} Mo</div>
                  </div>
                </div>
                <button type="button" onClick={clearFile} style={ghostBtn}>
                  ✕
                </button>
              </div>
            )}

            {showEmoji && (
              <div
                style={{
                  background: "var(--wa-panel)",
                  padding: "8px 12px",
                  display: "flex",
                  flexWrap: "wrap",
                  gap: 6,
                  borderTop: "1px solid var(--wa-line)",
                }}
              >
                {EMOJIS.map((emo) => (
                  <button
                    key={emo}
                    type="button"
                    onClick={() => setNewMessage((v) => v + emo)}
                    style={{ border: "none", background: "transparent", fontSize: 22, cursor: "pointer" }}
                  >
                    {emo}
                  </button>
                ))}
              </div>
            )}

            <form
              className="wa-composer"
              onSubmit={handleSend}
              style={{
                display: "flex",
                alignItems: "flex-end",
                gap: 8,
                padding: `10px 12px calc(10px + env(safe-area-inset-bottom) + ${kbOffset}px)`,
                background: "var(--wa-panel)",
                borderTop: "1px solid var(--wa-line)",
                flexShrink: 0,
              }}
            >
              <button type="button" onClick={() => setShowEmoji((v) => !v)} style={roundIcon} title="Emojis">
                🙂
              </button>
              <button
                type="button"
                onClick={() => {
                  if (fileInputRef.current) {
                    fileInputRef.current.accept = "image/*,video/*,application/pdf,audio/*";
                    fileInputRef.current.click();
                  }
                }}
                style={roundIcon}
                title="Joindre photo, vidéo, PDF, audio"
              >
                📎
              </button>
              <input type="file" ref={fileInputRef} onChange={onPickFile} style={{ display: "none" }} />

              <div style={{ flex: 1, background: "var(--wa-input)", borderRadius: 8, padding: "4px 10px", border: "1px solid var(--wa-line)" }}>
                <textarea
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder="Tapez un message"
                  rows={1}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      handleSend();
                    }
                  }}
                  style={{
                    width: "100%",
                    border: "none",
                    outline: "none",
                    resize: "none",
                    background: "transparent",
                    color: "var(--wa-ink)",
                    fontSize: 15,
                    fontFamily: "inherit",
                    maxHeight: 120,
                    padding: "8px 0",
                  }}
                />
              </div>

              {recording ? (
                <button type="button" onClick={stopRecording} style={{ ...roundIcon, background: "var(--wa-danger)" }} title="Stop">
                  ⏹
                </button>
              ) : (
                <button type="button" onClick={startRecording} style={roundIcon} title="Note vocale">
                  🎤
                </button>
              )}

              <button
                type="submit"
                disabled={sending || (!newMessage.trim() && !file)}
                style={{
                  ...roundIcon,
                  background: "var(--wa-accent)",
                  opacity: sending || (!newMessage.trim() && !file) ? 0.5 : 1,
                }}
                title="Envoyer"
              >
                ➤
              </button>
            </form>
          </>
        ) : (
          <div
            className="wa-empty"
            style={{
              flex: 1,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexDirection: "column",
              color: "var(--wa-muted)",
              padding: 24,
              textAlign: "center",
              borderBottom: "6px solid var(--wa-accent)",
            }}
          >
            <img
              src="/logo-lectorat.jpg"
              alt="Logo Lectorat"
              style={{ width: 88, height: 88, borderRadius: "50%", objectFit: "cover", marginBottom: 14, border: "2px solid rgba(255,255,255,0.12)" }}
            />
            <h2 style={{ margin: "0 0 8px", color: "var(--wa-ink)" }}>Messagerie Lectorat</h2>
            <p style={{ maxWidth: 420, lineHeight: 1.5 }}>
              Sélectionnez une discussion ou recherchez un lecteur : textes, photos, vidéos, PDF et notes vocales.
            </p>
          </div>
        )}
      </section>

      <style>{`
        .messages-page--chat { padding-bottom: 0 !important; }
        body:has(.messages-page--chat) { padding-bottom: 0 !important; }
        .messages-shell { height: calc(100dvh - 58px); }
        @media (max-width: 859px) {
          .messages-page .app-navbar__search-row { display: none !important; }
          .messages-shell { height: calc(100dvh - 58px - 72px) !important; }
          .messages-page--chat .messages-shell { height: 100dvh !important; }
          .wa-sidebar { width: 100% !important; min-width: 100% !important; max-width: none !important; flex: 1 !important; border-right: none !important; }
          .wa-chat { width: 100% !important; }
          .wa-composer { gap: 6px !important; }
          .wa-composer textarea { font-size: 16px !important; }
          .wa-bubble { max-width: 88% !important; }
          .wa-list-item { padding: 14px 14px !important; min-height: 72px; }
          .wa-empty { padding: 28px 18px !important; }
          .wa-empty img { width: 72px !important; height: 72px !important; }
          .wa-empty h2 { font-size: 20px !important; }
          .wa-chat-header { padding: 10px 12px !important; padding-top: calc(10px + env(safe-area-inset-top)) !important; }
        }
        @media (min-width: 860px) {
          .wa-sidebar { display: flex !important; width: 34% !important; min-width: 300px !important; }
          .wa-chat { display: flex !important; }
          /* Toujours afficher ← pour revenir à la liste et choisir une autre discussion */
          .wa-back { display: inline-flex !important; }
          .messages-page--chat .messages-shell { height: 100dvh !important; }
        }
      `}</style>
      </div>
    </div>
  );
}

function isImageMedia(msg: any, mediaType: string | null) {
  if (mediaType === "IMAGE" && msg.mediaUrl) return true;
  if (!msg.mediaUrl) return false;
  if (mediaType && mediaType !== "IMAGE") return false;
  return /\.(jpe?g|png|gif|webp|bmp|heic)(\?|#|$)/i.test(String(msg.mediaUrl));
}

function MessageBody({
  msg,
  mine = false,
  onOpenImage,
}: {
  msg: any;
  mine?: boolean;
  onOpenImage?: (src: string, e?: React.SyntheticEvent) => void;
}) {
  const mediaType = resolveMessageMediaType(msg);

  if (isImageMedia(msg, mediaType)) {
    return (
      <div>
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onOpenImage?.(msg.mediaUrl, e);
          }}
          title="Agrandir la photo"
          style={{
            display: "block",
            width: "100%",
            padding: 0,
            border: "none",
            background: "transparent",
            cursor: "zoom-in",
            marginBottom: msg.content ? 6 : 0,
            position: "relative",
            zIndex: 2,
          }}
        >
          <img
            src={msg.mediaUrl}
            alt=""
            draggable={false}
            style={{
              maxWidth: "100%",
              maxHeight: 320,
              width: "100%",
              borderRadius: 8,
              display: "block",
              objectFit: "cover",
              pointerEvents: "none",
            }}
          />
        </button>
        {msg.content && <div style={{ whiteSpace: "pre-wrap", wordBreak: "break-word" }}>{msg.content}</div>}
      </div>
    );
  }
  if (mediaType === "AUDIO" && msg.mediaUrl) {
    return (
      <div style={{ minWidth: 220 }}>
        <WaAudioPlayer src={msg.mediaUrl} mine={mine} />
        {msg.content && <div style={{ whiteSpace: "pre-wrap", wordBreak: "break-word", marginTop: 6 }}>{msg.content}</div>}
      </div>
    );
  }
  if (mediaType === "VIDEO" && msg.mediaUrl) {
    return (
      <div>
        <div style={{ marginBottom: msg.content ? 6 : 0 }}>
          <WaVideoPlayer src={msg.mediaUrl} />
        </div>
        {msg.content && <div style={{ whiteSpace: "pre-wrap", wordBreak: "break-word" }}>{msg.content}</div>}
      </div>
    );
  }
  if (mediaType === "PDF" && msg.mediaUrl) {
    return (
      <div>
        <a
          href={msg.mediaUrl}
          target="_blank"
          rel="noreferrer"
          style={{
            display: "flex",
            gap: 10,
            alignItems: "center",
            background: "rgba(0,0,0,0.2)",
            padding: 10,
            borderRadius: 8,
            color: "var(--wa-ink)",
            textDecoration: "none",
            marginBottom: msg.content ? 6 : 0,
          }}
        >
          <span style={{ fontSize: 24 }}>📄</span>
          <span style={{ fontWeight: 600 }}>{msg.mediaName || "Document PDF"}</span>
        </a>
        {msg.content && <div style={{ whiteSpace: "pre-wrap", wordBreak: "break-word" }}>{msg.content}</div>}
      </div>
    );
  }
  // Compat anciennes images stockées en HTML
  if (typeof msg.content === "string" && msg.content.includes("<img")) {
    const src = msg.content.match(/src="([^"]+)"/)?.[1];
    const text = msg.content.replace(/<img[\s\S]*?\/>/g, "").trim();
    return (
      <div>
        {src && (
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onOpenImage?.(src, e);
            }}
            style={{ display: "block", padding: 0, border: "none", background: "transparent", cursor: "zoom-in" }}
          >
            <img src={src} alt="" draggable={false} style={{ maxWidth: 240, borderRadius: 8, display: "block", pointerEvents: "none" }} />
          </button>
        )}
        {text && <div style={{ whiteSpace: "pre-wrap", wordBreak: "break-word" }}>{text}</div>}
      </div>
    );
  }

  return <div style={{ whiteSpace: "pre-wrap", wordBreak: "break-word" }}>{msg.content}</div>;
}

function Receipt({ status }: { status?: string }) {
  if (status === "READ") return <span style={{ color: "#53bdeb" }}>✓✓</span>;
  if (status === "DELIVERED") return <span>✓✓</span>;
  return <span>✓</span>;
}

function isOnline(lastSeenAt?: string | Date | null) {
  if (!lastSeenAt) return false;
  return Date.now() - new Date(lastSeenAt).getTime() <= 2 * 60 * 1000;
}

function presenceText(lastSeenAt?: string | Date | null) {
  if (isOnline(lastSeenAt)) return "En ligne";
  if (!lastSeenAt) return "Hors ligne";
  const mins = Math.floor((Date.now() - new Date(lastSeenAt).getTime()) / 60000);
  if (mins < 60) return `Vu il y a ${Math.max(1, mins)} min`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `Vu il y a ${hours} h`;
  return `Vu il y a ${Math.floor(hours / 24)} j`;
}

function Avatar({
  src,
  name,
  size,
  online,
}: {
  src?: string | null;
  name: string;
  size: number;
  online?: boolean;
}) {
  return (
    <div style={{ position: "relative", width: size, height: size, flexShrink: 0 }}>
      {src ? (
        <img
          src={src}
          alt=""
          style={{
            width: size,
            height: size,
            borderRadius: "50%",
            objectFit: "cover",
            display: "block",
            background: "var(--wa-panel-2)",
            border: "1px solid var(--wa-line)",
          }}
        />
      ) : (
        <div
          style={{
            width: size,
            height: size,
            borderRadius: "50%",
            background: "var(--wa-accent)",
            color: "var(--wa-on-accent)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontWeight: 800,
            fontSize: size * 0.38,
          }}
        >
          {(name || "U").charAt(0).toUpperCase()}
        </div>
      )}
      <span
        title={online ? "En ligne" : "Hors ligne"}
        style={{
          position: "absolute",
          right: 0,
          bottom: 0,
          width: Math.max(10, size * 0.28),
          height: Math.max(10, size * 0.28),
          borderRadius: "50%",
          background: online ? "var(--online)" : "var(--muted)",
          border: "2px solid var(--wa-panel)",
          boxSizing: "border-box",
          pointerEvents: "none",
        }}
      />
    </div>
  );
}

function mediaLabel(type: string, name?: string) {
  if (type === "IMAGE") return "📷 Photo";
  if (type === "VIDEO") return "🎬 Vidéo";
  if (type === "PDF") return `📄 ${name || "PDF"}`;
  if (type === "AUDIO") return "🎤 Audio";
  return name || "Fichier";
}

function shortTime(value: string) {
  const d = new Date(value);
  const kinshasaDay = (x: Date) =>
    new Intl.DateTimeFormat("en-CA", { timeZone: "Africa/Kinshasa", year: "numeric", month: "2-digit", day: "2-digit" }).format(x);
  if (kinshasaDay(d) === kinshasaDay(new Date())) {
    return d.toLocaleTimeString("fr-FR", { timeZone: "Africa/Kinshasa", hour: "2-digit", minute: "2-digit" });
  }
  return d.toLocaleDateString("fr-FR", { timeZone: "Africa/Kinshasa", day: "2-digit", month: "2-digit" });
}

function groupByDate(messages: any[]) {
  const groups: { label: string; items: any[] }[] = [];
  for (const msg of messages) {
    const label = dayLabel(msg.createdAt);
    const last = groups[groups.length - 1];
    if (!last || last.label !== label) groups.push({ label, items: [msg] });
    else last.items.push(msg);
  }
  return groups;
}

function dayLabel(value: string) {
  const d = new Date(value);
  const kinshasaDay = (x: Date) =>
    new Intl.DateTimeFormat("en-CA", { timeZone: "Africa/Kinshasa", year: "numeric", month: "2-digit", day: "2-digit" }).format(x);
  const today = new Date();
  const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);
  if (kinshasaDay(d) === kinshasaDay(today)) return "Aujourd'hui";
  if (kinshasaDay(d) === kinshasaDay(yesterday)) return "Hier";
  return d.toLocaleDateString("fr-FR", { timeZone: "Africa/Kinshasa", weekday: "long", day: "numeric", month: "long" });
}

const listItemStyle: React.CSSProperties = {
  width: "100%",
  display: "flex",
  gap: 12,
  alignItems: "center",
  padding: "12px 16px",
  border: "none",
  borderBottom: "1px solid var(--wa-line)",
  background: "transparent",
  color: "inherit",
  cursor: "pointer",
};

const ghostBtn: React.CSSProperties = {
  border: "none",
  background: "transparent",
  color: "var(--wa-ink)",
  cursor: "pointer",
  fontSize: 16,
};

const primaryBtn: React.CSSProperties = {
  border: "none",
  background: "var(--wa-accent)",
  color: "var(--wa-on-accent)",
  borderRadius: 6,
  padding: "6px 10px",
  fontWeight: 700,
  cursor: "pointer",
};

const roundIcon: React.CSSProperties = {
  width: 42,
  height: 42,
  borderRadius: "50%",
  border: "none",
  background: "var(--wa-panel-2)",
  color: "var(--wa-ink)",
  cursor: "pointer",
  fontSize: 18,
  flexShrink: 0,
};

const tinyAction: React.CSSProperties = {
  border: "none",
  background: "transparent",
  color: "var(--wa-muted)",
  cursor: "pointer",
  fontSize: 11,
  padding: 0,
};
