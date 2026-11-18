"use client";
import { useState, useEffect, useRef, useMemo } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { uploadMediaFile } from "@/lib/clientUpload";
import AppNavbar from "@/components/AppNavbar";
import { resolveMessageMediaType } from "@/lib/media";
import { WaAudioPlayer, WaVideoPlayer } from "@/components/WaMediaPlayers";

const EMOJIS = ["😀", "😂", "🙏", "❤️", "👍", "🎉", "🔥", "😊", "🙌", "✝️", "😇", "👏"];

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

  const activePeer = useMemo(() => {
    if (receiverId) return users.find((u) => u.id === receiverId);
    if (!activeConvId) return null;
    if (activeConv?.isBroadcast) return null;
    return activeConv?.participants?.map((p: any) => p.user).find((u: any) => u.id !== userId) || null;
  }, [receiverId, activeConvId, activeConv, users, userId]);

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
      style={{ minHeight: "100vh", background: "#111b21" }}
    >
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
          background: "#111b21",
          color: "#e9edef",
          overflow: "hidden",
        }}
      >
      {/* Liste conversations */}
      <aside
        style={{
          width: mobileShowChat ? 0 : 360,
          minWidth: mobileShowChat ? 0 : 280,
          maxWidth: 420,
          background: "#111b21",
          borderRight: "1px solid #222d34",
          display: mobileShowChat ? "none" : "flex",
          flexDirection: "column",
          flex: mobileShowChat ? undefined : "0 0 34%",
        }}
        className="wa-sidebar"
      >
        <div style={{ padding: "12px 14px", background: "#202c33", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10 }}>
          <strong style={{ fontSize: 16 }}>Discussions</strong>
          <Link href="/journal" style={{ color: "#00a884", textDecoration: "none", fontWeight: 700, fontSize: 13 }}>
            Journal
          </Link>
        </div>

        <div style={{ padding: 10, background: "#111b21", display: "grid", gap: 8 }}>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher ou démarrer une discussion"
            style={{
              width: "100%",
              boxSizing: "border-box",
              background: "#202c33",
              border: "none",
              borderRadius: 8,
              padding: "10px 14px",
              color: "#e9edef",
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
              background: "linear-gradient(135deg,#005c4b,#00a884)",
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
            <div style={{ padding: "8px 16px", color: "#8696a0", fontSize: 12, fontWeight: 700 }}>CONTACTS</div>
          )}
          {search.trim() &&
            filteredUsers.map((u) => (
              <button
                key={`u-${u.id}`}
                className="wa-list-item"
                onClick={() => handleNewConversation(u.id)}
                style={listItemStyle}
              >
                <Avatar src={u.photo} name={u.prenom} size={48} online={!!u.online} />
                <div style={{ flex: 1, textAlign: "left", overflow: "hidden" }}>
                  <div style={{ fontWeight: 600 }}>
                    {u.prenom} {u.nom}
                  </div>
                  <div style={{ color: u.online ? "#00a884" : "#8696a0", fontSize: 13 }}>
                    {u.online ? "En ligne" : u.presenceLabel || "Hors ligne"}
                  </div>
                </div>
              </button>
            ))}

          <div style={{ padding: "8px 16px", color: "#8696a0", fontSize: 12, fontWeight: 700 }}>DISCUSSIONS</div>
          {filteredConversations.length === 0 && (
            <p style={{ color: "#8696a0", padding: 16, fontSize: 14 }}>Aucune conversation.</p>
          )}
          {filteredConversations.map((conv) => {
            const peer = conv.participants.map((p: any) => p.user).find((u: any) => u.id !== userId);
            const last = conv.messages?.[0];
            const preview = last
              ? resolveMessageMediaType(last)
                ? mediaLabel(resolveMessageMediaType(last) || "", last.mediaName)
                : last.content || ""
              : "Aucun message";
            const title = conv.isBroadcast ? conv.title || "Annonce Lectorat" : peer ? `${peer.prenom} ${peer.nom}` : "Discussion";
            return (
              <button
                key={conv.id}
                className="wa-list-item"
                onClick={() => fetchMessages(conv.id)}
                style={{
                  ...listItemStyle,
                  background: activeConvId === conv.id ? "#2a3942" : "transparent",
                }}
              >
                {conv.isBroadcast ? (
                  <div
                    style={{
                      width: 48,
                      height: 48,
                      borderRadius: "50%",
                      background: "#00a884",
                      color: "#111b21",
                      display: "grid",
                      placeItems: "center",
                      fontSize: 22,
                      flexShrink: 0,
                    }}
                  >
                    📢
                  </div>
                ) : (
                  <Avatar src={peer?.photo} name={peer?.prenom || "U"} size={48} online={isOnline(peer?.lastSeenAt)} />
                )}
                <div style={{ flex: 1, textAlign: "left", overflow: "hidden" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
                    <span style={{ fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                      {title}
                    </span>
                    <span style={{ color: conv.unread ? "#00a884" : "#8696a0", fontSize: 12, flexShrink: 0 }}>
                      {last ? shortTime(last.createdAt) : ""}
                    </span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 8, marginTop: 2 }}>
                    <span
                      style={{
                        color: "#8696a0",
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
                          background: "#00a884",
                          color: "#111b21",
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
                </div>
              </button>
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
          background: "#0b141a",
        }}
        className="wa-chat"
      >
        {activeConvId || receiverId ? (
          <>
            <div
              className="wa-chat-header"
              style={{
                padding: "10px 16px",
                background: "#202c33",
                display: "flex",
                alignItems: "center",
                gap: 12,
                borderBottom: "1px solid #222d34",
              }}
            >
              <button
                type="button"
                onClick={() => {
                  setMobileShowChat(false);
                  setActiveConvId(null);
                  setReceiverId(null);
                }}
                style={{ ...ghostBtn, display: "inline-flex" }}
                className="wa-back"
              >
                ←
              </button>
              {activeConv?.isBroadcast ? (
                <div
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: "50%",
                    background: "#00a884",
                    color: "#111b21",
                    display: "grid",
                    placeItems: "center",
                    fontSize: 18,
                    flexShrink: 0,
                  }}
                >
                  📢
                </div>
              ) : (
                <Avatar src={activePeer?.photo} name={activePeer?.prenom || "U"} size={40} online={isOnline(activePeer?.lastSeenAt)} />
              )}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 700 }}>
                  {activeConv?.isBroadcast
                    ? activeConv.title || "Annonce Lectorat"
                    : activePeer
                      ? `${activePeer.prenom} ${activePeer.nom}`
                      : "Discussion"}
                </div>
                <div style={{ color: isOnline(activePeer?.lastSeenAt) ? "#00a884" : "#8696a0", fontSize: 12 }}>
                  {activeConv?.isBroadcast
                    ? "Message visible par tous les lecteurs"
                    : activePeer
                      ? presenceText(activePeer.lastSeenAt)
                      : activeConvId
                        ? "Discussion privée"
                        : "Nouvelle discussion"}
                </div>
              </div>
            </div>

            <div
              style={{
                flex: 1,
                overflowY: "auto",
                padding: "18px 5% 12px",
                backgroundImage:
                  "radial-gradient(circle at 20% 20%, rgba(0,168,132,0.05), transparent 35%), radial-gradient(circle at 80% 0%, rgba(255,255,255,0.03), transparent 25%), linear-gradient(180deg,#0b141a,#0b141a)",
              }}
            >
              {messages.length === 0 && (
                <div style={{ textAlign: "center", color: "#8696a0", marginTop: 40 }}>
                  {receiverId ? "Dites bonjour 👋" : "Aucun message"}
                </div>
              )}

              {groupByDate(messages).map((group) => (
                <div key={group.label}>
                  <div style={{ textAlign: "center", margin: "16px 0" }}>
                    <span
                      style={{
                        background: "#182229",
                        color: "#8696a0",
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
                    return (
                      <div
                        key={msg.id}
                        style={{
                          display: "flex",
                          justifyContent: isMine ? "flex-end" : "flex-start",
                          marginBottom: 6,
                        }}
                      >
                        <div
                          style={{
                            maxWidth: "min(75%, 520px)",
                            background: isMine ? "#005c4b" : "#202c33",
                            color: "#e9edef",
                            borderRadius: isMine ? "10px 10px 0 10px" : "10px 10px 10px 0",
                            padding: "6px 9px 4px",
                            boxShadow: "0 1px 0.5px rgba(11,20,26,0.13)",
                            position: "relative",
                          }}
                          className="wa-bubble"
                        >
                          {msg.replyTo && (
                            <div
                              style={{
                                background: "rgba(0,0,0,0.2)",
                                borderLeft: "3px solid #00a884",
                                borderRadius: 6,
                                padding: "6px 8px",
                                marginBottom: 6,
                                fontSize: 12,
                                color: "#8696a0",
                              }}
                            >
                              <strong style={{ color: "#00a884" }}>
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
                                  background: "#111b21",
                                  color: "#e9edef",
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
                              <MessageBody msg={msg} mine={isMine} />
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
                                <button type="button" onClick={() => handleDeleteMessage(msg.id)} style={{ ...tinyAction, color: "#f15c6d" }}>
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
                  background: "#202c33",
                  borderTop: "1px solid #222d34",
                  padding: "8px 16px",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  gap: 10,
                }}
              >
                <div style={{ borderLeft: "3px solid #00a884", paddingLeft: 10, minWidth: 0 }}>
                  <div style={{ color: "#00a884", fontWeight: 700, fontSize: 13 }}>
                    Réponse à {replyTo.sender?.prenom || "message"}
                  </div>
                  <div style={{ color: "#8696a0", fontSize: 13, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
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
                  background: "#202c33",
                  padding: "8px 16px",
                  borderTop: "1px solid #222d34",
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
                    <div style={{ color: "#8696a0", fontSize: 12 }}>{(file.size / 1024 / 1024).toFixed(2)} Mo</div>
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
                  background: "#202c33",
                  padding: "8px 12px",
                  display: "flex",
                  flexWrap: "wrap",
                  gap: 6,
                  borderTop: "1px solid #222d34",
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
                background: "#1f2c34",
                borderTop: "1px solid #222d34",
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

              <div style={{ flex: 1, background: "#2a3942", borderRadius: 8, padding: "4px 10px" }}>
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
                    color: "#e9edef",
                    fontSize: 15,
                    fontFamily: "inherit",
                    maxHeight: 120,
                    padding: "8px 0",
                  }}
                />
              </div>

              {recording ? (
                <button type="button" onClick={stopRecording} style={{ ...roundIcon, background: "#f15c6d" }} title="Stop">
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
                  background: "#00a884",
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
              color: "#8696a0",
              padding: 24,
              textAlign: "center",
              borderBottom: "6px solid #00a884",
            }}
          >
            <img
              src="/logo-lectorat.jpg"
              alt="Logo Lectorat"
              style={{ width: 88, height: 88, borderRadius: "50%", objectFit: "cover", marginBottom: 14, border: "2px solid rgba(255,255,255,0.12)" }}
            />
            <h2 style={{ margin: "0 0 8px", color: "#e9edef" }}>Messagerie Lectorat</h2>
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
          .wa-back { display: none !important; }
          .messages-page--chat .messages-shell { height: 100dvh !important; }
        }
      `}</style>
      </div>
    </div>
  );
}

function MessageBody({ msg, mine = false }: { msg: any; mine?: boolean }) {
  const mediaType = resolveMessageMediaType(msg);

  if (mediaType === "IMAGE" && msg.mediaUrl) {
    return (
      <div>
        <a href={msg.mediaUrl} target="_blank" rel="noreferrer">
          <img src={msg.mediaUrl} alt="" style={{ maxWidth: "100%", borderRadius: 8, display: "block", marginBottom: msg.content ? 6 : 0 }} />
        </a>
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
            color: "#e9edef",
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
        {src && <img src={src} alt="" style={{ maxWidth: 240, borderRadius: 8 }} />}
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
        <img src={src} alt="" style={{ width: size, height: size, borderRadius: "50%", objectFit: "cover", display: "block" }} />
      ) : (
        <div
          style={{
            width: size,
            height: size,
            borderRadius: "50%",
            background: "#00a884",
            color: "#111b21",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontWeight: 800,
          }}
        >
          {(name || "U").charAt(0).toUpperCase()}
        </div>
      )}
      <span
        title={online ? "En ligne" : "Hors ligne"}
        style={{
          position: "absolute",
          right: 1,
          bottom: 1,
          width: Math.max(10, size * 0.28),
          height: Math.max(10, size * 0.28),
          borderRadius: "50%",
          background: online ? "#22c55e" : "#64748b",
          border: "2px solid #202c33",
          boxSizing: "border-box",
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
  const now = new Date();
  if (d.toDateString() === now.toDateString()) {
    return d.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
  }
  return d.toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit" });
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
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);
  if (d.toDateString() === today.toDateString()) return "Aujourd'hui";
  if (d.toDateString() === yesterday.toDateString()) return "Hier";
  return d.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" });
}

const listItemStyle: React.CSSProperties = {
  width: "100%",
  display: "flex",
  gap: 12,
  alignItems: "center",
  padding: "12px 16px",
  border: "none",
  borderBottom: "1px solid #222d34",
  background: "transparent",
  color: "inherit",
  cursor: "pointer",
};

const ghostBtn: React.CSSProperties = {
  border: "none",
  background: "transparent",
  color: "#e9edef",
  cursor: "pointer",
  fontSize: 16,
};

const primaryBtn: React.CSSProperties = {
  border: "none",
  background: "#00a884",
  color: "#111b21",
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
  background: "#2a3942",
  color: "#e9edef",
  cursor: "pointer",
  fontSize: 18,
  flexShrink: 0,
};

const tinyAction: React.CSSProperties = {
  border: "none",
  background: "transparent",
  color: "#8696a0",
  cursor: "pointer",
  fontSize: 11,
  padding: 0,
};
