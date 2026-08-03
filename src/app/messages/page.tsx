"use client";
import { useState, useEffect, useRef } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function MessagesPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [conversations, setConversations] = useState<any[]>([]);
  const [activeConvId, setActiveConvId] = useState<number | null>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [receiverId, setReceiverId] = useState<number | null>(null);
  const [users, setUsers] = useState<any[]>([]);
  const [file, setFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (status === "unauthenticated") router.push("/login");
    if (status === "authenticated") {
      fetchConversations();
      fetchUsers();
    }
  }, [status, router]);

  const fetchConversations = async () => {
    try {
      const res = await fetch("/api/messages");
      if (res.ok) setConversations(await res.json());
    } catch (e) { console.error(e); }
  };

  const fetchUsers = async () => {
    try {
      const res = await fetch("/api/users");
      if (res.ok) setUsers(await res.json());
    } catch (e) { console.error(e); }
  };

  const fetchMessages = async (convId: number) => {
    setActiveConvId(convId);
    setReceiverId(null);
    try {
      const res = await fetch(`/api/messages/${convId}`);
      if (res.ok) {
        const data = await res.json();
        setMessages(data);
      }
    } catch (e) { console.error(e); }
  };

  const handleNewConversation = (userId: number) => {
    setReceiverId(userId);
    setActiveConvId(null);
    setMessages([]);
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() && !file) return;

    const formData = new FormData();
    formData.append("content", newMessage);
    formData.append("receiverId", receiverId ? receiverId.toString() : "");
    if (activeConvId) formData.append("conversationId", activeConvId.toString());
    if (file) formData.append("file", file);

    try {
      const res = await fetch("/api/messages", {
        method: "POST",
        body: formData,
      });
      if (res.ok) {
        const data = await res.json();
        setNewMessage("");
        setFile(null);
        if (fileInputRef.current) fileInputRef.current.value = "";
        if (!activeConvId) setActiveConvId(data.conversationId);
        fetchMessages(data.conversationId || activeConvId);
        fetchConversations();
      } else {
        const errText = await res.text();
        console.error("Erreur envoi", errText);
      }
    } catch (e) { console.error(e); }
  };

  const handleDeleteMessage = async (msgId: number) => {
    if (!confirm("Supprimer ce message ?")) return;
    try {
      const res = await fetch(`/api/messages/${msgId}/delete`, { method: "DELETE" });
      if (res.ok) {
        setMessages((prev) => prev.filter((m) => m.id !== msgId));
      }
    } catch (e) { console.error(e); }
  };

  // Fonction pour formater la date
  const formatDate = (dateStr: string) => {
    const msgDate = new Date(dateStr);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (msgDate.toDateString() === today.toDateString()) {
      return "Aujourd'hui";
    } else if (msgDate.toDateString() === yesterday.toDateString()) {
      return "Hier";
    } else {
      return msgDate.toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });
    }
  };

  if (status === "loading") return <div style={{ padding: "50px", textAlign: "center", fontFamily: "Arial" }}>Chargement...</div>;

  const userId = parseInt((session?.user as any)?.id || "0");

  return (
    <div style={{ display: "flex", height: "100vh", fontFamily: "Segoe UI", background: "#f0f2f5" }}>
      {/* Barre latérale gauche */}
      <div style={{ width: "320px", background: "white", borderRight: "1px solid #e2e8f0", padding: "20px", overflowY: "auto", display: "flex", flexDirection: "column" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
          <h2 style={{ margin: 0 }}>💬 Messages</h2>
          <Link href="/journal" style={{ color: "#1877f2", textDecoration: "none", fontWeight: "bold", fontSize: "14px" }}>← Journal</Link>
        </div>

        <div style={{ marginBottom: "20px" }}>
          <label style={{ display: "block", fontWeight: "600", color: "#475569", marginBottom: "6px" }}>Nouvelle conversation</label>
          <select
            value=""
            onChange={(e) => {
              const val = e.target.value;
              if (val) handleNewConversation(parseInt(val));
            }}
            style={{ width: "100%", padding: "10px", border: "1px solid #ccd0d5", borderRadius: "8px", fontSize: "15px", background: "white", outline: "none" }}
          >
            <option value="">Choisir un membre...</option>
            {users.map((u: any) => (
              <option key={u.id} value={u.id}>
                {u.prenom} {u.nom} {u.role === "ADMIN" ? "(Admin)" : ""}
              </option>
            ))}
          </select>
        </div>

        <div style={{ flex: 1, overflowY: "auto" }}>
          {conversations.length === 0 && <p style={{ color: "#64748b", fontSize: "14px" }}>Aucune conversation.</p>}
          {conversations.map((conv) => (
            <div
              key={conv.id}
              onClick={() => fetchMessages(conv.id)}
              style={{
                padding: "12px",
                background: activeConvId === conv.id ? "#e0e7ff" : "#f8fafc",
                borderRadius: "8px",
                cursor: "pointer",
                marginBottom: "8px",
                border: activeConvId === conv.id ? "2px solid #1877f2" : "1px solid transparent",
              }}
            >
              <div style={{ fontWeight: "600", color: "#050505", fontSize: "15px" }}>
                {conv.participants
                  .map((p: any) =>
                    p.user.id !== userId ? `${p.user.prenom} ${p.user.nom}` : null
                  )
                  .filter(Boolean)
                  .join(", ")}
              </div>
              <div style={{ fontSize: "13px", color: "#65676b", marginTop: "4px" }}>
                {conv.messages[0]?.content?.substring(0, 40) || "Aucun message..."}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Zone de messages (droite) */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", padding: "20px" }}>
        {activeConvId || receiverId ? (
          <>
            <div style={{ flex: 1, overflowY: "auto", marginBottom: "20px" }}>
              {messages.length > 0 ? (
                messages.map((msg: any) => {
                  const isMine = msg.senderId === userId;
                  return (
                    <div key={msg.id} style={{ marginBottom: "15px", display: "flex", flexDirection: isMine ? "row-reverse" : "row", gap: "10px" }}>
                      {/* Avatar */}
                      <div style={{ width: "36px", height: "36px", borderRadius: "50%", background: "#1877f2", color: "white", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: "bold", flexShrink: 0 }}>
                        {msg.sender?.prenom?.[0] || "U"}
                      </div>
                      {/* Message */}
                      <div style={{ maxWidth: "70%" }}>
                        <div style={{ fontWeight: "bold", fontSize: "12px", color: isMine ? "#1877f2" : "#65676b", marginBottom: "2px", textAlign: isMine ? "right" : "left" }}>
                          {msg.sender?.prenom} {msg.sender?.nom}
                        </div>
                        <div style={{
                          background: isMine ? "#1877f2" : "white",
                          color: isMine ? "white" : "#050505",
                          padding: "8px 12px",
                          borderRadius: "12px",
                          boxShadow: "0 1px 2px rgba(0,0,0,0.05)",
                          wordBreak: "break-word",
                        }}>
                          {msg.content?.startsWith("<img") ? (
                            <img 
                              src={msg.content.match(/src="([^"]+)"/)?.[1] || ""} 
                              alt="image" 
                              style={{ maxWidth: "200px", borderRadius: "8px" }} 
                            />
                          ) : (
                            msg.content
                          )}
                        </div>
                        <div style={{ fontSize: "10px", color: "#65676b", marginTop: "2px", textAlign: isMine ? "right" : "left" }}>
                          {formatDate(msg.createdAt)} – {new Date(msg.createdAt).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
                        </div>
                        {isMine && (
                          <div style={{ display: "flex", gap: "8px", marginTop: "2px", justifyContent: "flex-end" }}>
                            <button onClick={() => handleDeleteMessage(msg.id)} style={{ background: "transparent", border: "none", color: "#dc2626", cursor: "pointer", fontSize: "11px" }}>Supprimer</button>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })
              ) : (
                <p style={{ color: "#64748b" }}>
                  {receiverId
                    ? "Nouvelle conversation. Envoyez votre premier message !"
                    : "Aucun message dans cette conversation."}
                </p>
              )}
            </div>
            <form onSubmit={handleSend} style={{ display: "flex", gap: "10px", alignItems: "center" }}>
              <input
                type="text"
                placeholder="Votre message..."
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                style={{ flex: 1, padding: "12px", borderRadius: "20px", border: "1px solid #ccd0d5", outline: "none", fontSize: "15px" }}
              />
              <input type="file" accept="image/*,video/*" ref={fileInputRef} onChange={(e) => setFile(e.target.files?.[0] || null)} style={{ display: "none" }} />
              <button type="button" onClick={() => fileInputRef.current?.click()} style={{ background: "transparent", border: "none", fontSize: "20px", cursor: "pointer" }}>📷</button>
              <button type="submit" disabled={!newMessage.trim() && !file} style={{ background: "#1877f2", color: "white", border: "none", padding: "12px 20px", borderRadius: "20px", fontWeight: "bold", cursor: "pointer" }}>
                Envoyer
              </button>
            </form>
          </>
        ) : (
          <div style={{ textAlign: "center", color: "#64748b", marginTop: "50px" }}>
            <p>Sélectionnez une conversation ou choisissez un membre pour démarrer une nouvelle discussion.</p>
          </div>
        )}
      </div>
    </div>
  );
}