"use client";
import { useState, useEffect, useRef } from "react";
import { useSession, signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function JournalPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const userId = parseInt((session?.user as any)?.id || "0");

  const [posts, setPosts] = useState<any[]>([]);
  const [newPostContent, setNewPostContent] = useState("");
  const [newPostImage, setNewPostImage] = useState("");
  const [loading, setLoading] = useState(true);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const profileInputRef = useRef<HTMLInputElement>(null);
  const [profilePhoto, setProfilePhoto] = useState("");
  const [activeCommentPostId, setActiveCommentPostId] = useState<number | null>(null);
  const [commentText, setCommentText] = useState("");
  const [replyCommentText, setReplyCommentText] = useState("");
  const [activeReplyCommentId, setActiveReplyCommentId] = useState<number | null>(null);
  const [editingCommentId, setEditingCommentId] = useState<number | null>(null);
  const [editCommentText, setEditCommentText] = useState("");
  const [unreadCount, setUnreadCount] = useState({ notifications: 0, messages: 0, total: 0 });

  useEffect(() => {
    if (status === "unauthenticated") router.push("/login");
  }, [status, router]);

  useEffect(() => {
    if (status === "authenticated" && session?.user) {
      fetchProfilePhoto();
      fetchPosts();
      fetchUnreadCount();
    }
  }, [status, session]);

  const fetchPosts = async () => {
    try {
      const res = await fetch("/api/posts");
      if (res.ok) setPosts(await res.json());
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  const fetchProfilePhoto = async () => {
    try {
      const res = await fetch("/api/auth/profil");
      if (res.ok) {
        const data = await res.json();
        setProfilePhoto(data.photo || "");
      }
    } catch (e) { console.error(e); }
  };

  const fetchUnreadCount = async () => {
    try {
      const res = await fetch("/api/unread-count");
      if (res.ok) setUnreadCount(await res.json());
    } catch (e) { console.error(e); }
  };

  const handleProfilePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = async () => {
      const photo = reader.result as string;
      await fetch("/api/profile/photo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ photo }),
      });
      setProfilePhoto(photo);
      fetchPosts();
    };
    reader.readAsDataURL(file);
  };

  const handleNewImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setNewPostImage(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handleCreatePost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPostContent.trim() && !newPostImage) return;
    const res = await fetch("/api/posts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: newPostContent, image: newPostImage }),
    });
    if (res.ok) {
      setNewPostContent("");
      setNewPostImage("");
      if (fileInputRef.current) fileInputRef.current.value = "";
      fetchPosts();
    }
  };

  const handleLike = async (postId: number) => {
    await fetch(`/api/posts/${postId}/like`, { method: "POST" });
    fetchPosts();
  };

  const handleCommentSubmit = async (e: React.FormEvent, postId: number) => {
    e.preventDefault();
    if (!commentText.trim()) return;
    const res = await fetch(`/api/posts/${postId}/comment`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: commentText }),
    });
    if (res.ok) {
      setCommentText("");
      fetchPosts();
      fetchUnreadCount();
    }
  };

  const handleCommentReply = async (e: React.FormEvent, postId: number, parentCommentId: number) => {
    e.preventDefault();
    if (!replyCommentText.trim()) return;
    await fetch("/api/comments/reply", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ postId, parentCommentId, content: replyCommentText }),
    });
    setReplyCommentText("");
    setActiveReplyCommentId(null);
    fetchPosts();
    fetchUnreadCount();
  };

  const handleEditComment = async (commentId: number) => {
    if (!editCommentText.trim()) return;
    await fetch(`/api/comments/${commentId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: editCommentText }),
    });
    setEditingCommentId(null);
    setEditCommentText("");
    fetchPosts();
  };

  const handleDeleteComment = async (commentId: number) => {
    if (!confirm("Supprimer ce commentaire ?")) return;
    await fetch(`/api/comments/${commentId}`, { method: "DELETE" });
    fetchPosts();
  };

  const handleDeletePost = async (postId: number) => {
    if (!confirm("Supprimer cette publication ?")) return;
    await fetch(`/api/posts/${postId}`, { method: "DELETE" });
    fetchPosts();
  };

  if (status === "loading" || loading) {
    return <div style={{ textAlign: "center", padding: "50px", fontFamily: "Arial" }}>Chargement...</div>;
  }

  return (
    <div style={{ minHeight: "100vh", background: "#f0f2f5", fontFamily: "Segoe UI, Helvetica, Arial, sans-serif" }}>
      {/* NAVBAR */}
      <div style={{ background: "white", height: "60px", display: "flex", justifyContent: "space-between", alignItems: "center", padding: "0 20px", boxShadow: "0 2px 4px rgba(0,0,0,0.1)", position: "sticky", top: 0, zIndex: 100 }}>
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <div style={{ width: "40px", height: "40px", background: "linear-gradient(135deg,#667eea,#764ba2)", borderRadius: "50%", color: "white", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: "bold", fontSize: "20px" }}>N</div>
          <input type="text" placeholder="Rechercher..." style={{ background: "#f0f2f5", border: "none", padding: "10px 15px", borderRadius: "20px", outline: "none", width: "250px" }} />
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "15px" }}>
          <Link href="/calendrier" style={{ color: "#65676b", textDecoration: "none", fontWeight: "600", marginRight: "10px" }}>📅 Calendrier</Link>
          
          {/* Badge Notifications */}
          <Link href="/notifications" style={{ position: "relative", color: "#65676b", textDecoration: "none", fontWeight: "600", marginRight: "10px" }}>
            🔔
            {unreadCount.notifications > 0 && (
              <span style={{
                position: "absolute", top: "-5px", right: "-10px",
                background: "#dc2626", color: "white",
                borderRadius: "50%", width: "18px", height: "18px",
                fontSize: "11px", fontWeight: "bold",
                display: "flex", alignItems: "center", justifyContent: "center"
              }}>
                {unreadCount.notifications}
              </span>
            )}
          </Link>

          {/* Badge Messages */}
          <Link href="/messages" style={{ position: "relative", color: "#65676b", textDecoration: "none", fontWeight: "600", marginRight: "10px" }}>
            💬 Messages
            {unreadCount.messages > 0 && (
              <span style={{
                position: "absolute", top: "-5px", right: "-10px",
                background: "#1877f2", color: "white",
                borderRadius: "50%", width: "18px", height: "18px",
                fontSize: "11px", fontWeight: "bold",
                display: "flex", alignItems: "center", justifyContent: "center"
              }}>
                {unreadCount.messages}
              </span>
            )}
          </Link>

          {(session?.user as any)?.role === "ADMIN" && <Link href="/dashboard" style={{ color: "#65676b", textDecoration: "none", fontWeight: "600", marginRight: "10px" }}>⚙️ Dashboard</Link>}
          <div style={{ position: "relative", cursor: "pointer" }} onClick={() => profileInputRef.current?.click()}>
            {profilePhoto ? (
              <img src={profilePhoto} alt="Profil" style={{ width: "36px", height: "36px", borderRadius: "50%", objectFit: "cover" }} />
            ) : (
              <div style={{ width: "36px", height: "36px", background: "#1877f2", borderRadius: "50%", color: "white", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: "bold" }}>{session?.user?.name?.charAt(0) || "U"}</div>
            )}
            <input type="file" ref={profileInputRef} accept="image/*" onChange={handleProfilePhotoUpload} style={{ display: "none" }} />
          </div>
          <span style={{ fontWeight: "600", color: "#050505" }}>{session?.user?.name}</span>
          <button onClick={() => signOut({ callbackUrl: "/login" })} style={{ border: "none", background: "#e4e6eb", padding: "8px 15px", borderRadius: "6px", fontWeight: "600", cursor: "pointer" }}>Déconnexion</button>
        </div>
      </div>

      <div style={{ maxWidth: "680px", margin: "25px auto", padding: "0 15px" }}>
        {/* BOÎTE DE PUBLICATION */}
        <div style={{ background: "white", borderRadius: "8px", padding: "15px", boxShadow: "0 1px 2px rgba(0,0,0,0.2)", marginBottom: "20px" }}>
          <form onSubmit={handleCreatePost}>
            <div style={{ display: "flex", gap: "10px", marginBottom: "15px", alignItems: "flex-start" }}>
              <div style={{ width: "40px", height: "40px", borderRadius: "50%", overflow: "hidden", flexShrink: 0 }}>
                {profilePhoto ? (
                  <img src={profilePhoto} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                ) : (
                  <div style={{ width: "100%", height: "100%", background: "#1877f2", color: "white", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: "bold" }}>
                    {session?.user?.name?.charAt(0) || "U"}
                  </div>
                )}
              </div>
              <textarea
                placeholder={`Quoi de neuf, ${session?.user?.name?.split(" ")[0] || ""}?`}
                value={newPostContent}
                onChange={(e) => setNewPostContent(e.target.value)}
                style={{ flex: 1, background: "#f0f2f5", border: "none", borderRadius: "20px", padding: "10px 15px", fontSize: "16px", outline: "none", resize: "none", minHeight: "50px", fontFamily: "inherit" }}
              />
            </div>
            {newPostImage && (
              <div style={{ position: "relative", marginBottom: "15px" }}>
                <img src={newPostImage} alt="Aperçu" style={{ width: "100%", borderRadius: "8px", maxHeight: "300px", objectFit: "cover", display: "block" }} />
                <button type="button" onClick={() => setNewPostImage("")} style={{ position: "absolute", top: "10px", right: "10px", background: "rgba(0,0,0,0.6)", color: "white", border: "none", borderRadius: "50%", width: "30px", height: "30px", cursor: "pointer" }}>✕</button>
              </div>
            )}
            <div style={{ borderTop: "1px solid #e4e6eb", margin: "10px 0" }} />
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <input type="file" accept="image/*" ref={fileInputRef} onChange={handleNewImageUpload} style={{ display: "none" }} />
              <button type="button" onClick={() => fileInputRef.current?.click()} style={{ background: "transparent", border: "none", color: "#45bd62", fontWeight: "bold", fontSize: "15px", cursor: "pointer", display: "flex", alignItems: "center", gap: "5px" }}>📷 Photo</button>
              <button type="submit" disabled={!newPostContent.trim() && !newPostImage} style={{ background: (newPostContent.trim() || newPostImage) ? "#1877f2" : "#e4e6eb", color: (newPostContent.trim() || newPostImage) ? "white" : "#bcc0c4", border: "none", padding: "8px 20px", borderRadius: "6px", fontWeight: "bold", cursor: "pointer" }}>Publier</button>
            </div>
          </form>
        </div>

        {/* MUR DES PUBLICATIONS */}
        {posts.length === 0 && <p style={{ textAlign: "center", color: "#65676b", marginTop: "40px" }}>Aucune publication pour le moment.</p>}
        {posts.map((post: any) => {
          const isPost = post.feedType === "POST";
          const isLive = post.feedType === "ADMIN_LIVE";
          const hasLiked = post.likes?.some((like: any) => like.userId === userId);
          const isMyPost = post.author?.prenom === session?.user?.name?.split(" ")[0];

          return (
            <div key={post.id} style={{ background: "white", borderRadius: "8px", boxShadow: "0 1px 2px rgba(0,0,0,0.2)", marginBottom: "20px", overflow: "hidden" }}>
              {/* En-tête */}
              <div style={{ padding: "12px 15px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
                  {post.author?.photo ? (
                    <img src={post.author.photo} alt="Avatar" style={{ width: "40px", height: "40px", borderRadius: "50%", objectFit: "cover" }} />
                  ) : (
                    <div style={{ width: "40px", height: "40px", background: isPost ? "#1877f2" : isLive ? "#dc2626" : "#f59e0b", borderRadius: "50%", color: "white", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: "bold" }}>
                      {isPost ? post.author?.prenom?.[0] || "U" : isLive ? "🔴" : "⛪"}
                    </div>
                  )}
                  <div>
                    <div style={{ fontWeight: "600", color: "#050505", fontSize: "15px" }}>
                      {post.author?.prenom} {post.author?.nom}
                      {!isPost && <span style={{ color: isLive ? "#dc2626" : "#1877f2", marginLeft: "5px" }}>{isLive ? "EN DIRECT" : "Officiel"}</span>}
                    </div>
                    <div style={{ color: "#65676b", fontSize: "13px" }}>{new Date(post.createdAt).toLocaleString("fr-FR")}</div>
                  </div>
                </div>
                {(isMyPost || (session?.user as any)?.role === "ADMIN") && isPost && (
                  <button onClick={() => handleDeletePost(post.id)} style={{ background: "transparent", border: "none", color: "#dc2626", fontSize: "16px", fontWeight: "bold", cursor: "pointer", padding: "5px" }}>✕</button>
                )}
              </div>

              {/* Texte du post */}
              <div style={{ padding: "0 15px 10px", color: "#050505", fontSize: "15px", lineHeight: "1.5", whiteSpace: "pre-wrap" }}>{post.content}</div>

              {/* Image du post */}
              {post.image && (
                <div style={{ position: "relative" }}>
                  <img src={post.image} alt="Publication" style={{ width: "100%", maxHeight: "500px", objectFit: "cover", display: "block" }} />
                  <a href={post.image} download={`nodafa_${post.id}.jpg`} style={{ position: "absolute", bottom: "10px", right: "10px", background: "rgba(0,0,0,0.7)", color: "white", padding: "8px 12px", borderRadius: "6px", textDecoration: "none", fontSize: "13px", fontWeight: "bold" }}>💾 Sauvegarder</a>
                </div>
              )}

              {/* Live YouTube */}
              {isLive && post.youtubeUrl && (
                <div style={{ position: "relative", paddingBottom: "56.25%", background: "#000" }}>
                  <iframe src={`https://www.youtube.com/embed/${extractYoutubeId(post.youtubeUrl)}`} style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%", border: "none" }} allowFullScreen />
                </div>
              )}

              {/* Section interactions (seulement pour les posts classiques) */}
              {isPost && (
                <>
                  <div style={{ padding: "10px 15px", display: "flex", justifyContent: "space-between", color: "#65676b", fontSize: "15px", borderBottom: post.comments?.length > 0 ? "1px solid #e4e6eb" : "none" }}>
                    <span style={{ color: hasLiked ? "#1877f2" : "#65676b" }}>👍 {post.likes?.length || 0} J'aime</span>
                    <span>{post.comments?.length || 0} Commentaires</span>
                  </div>
                  <div style={{ display: "flex", padding: "4px 15px", borderBottom: post.comments?.length > 0 ? "1px solid #e4e6eb" : "none" }}>
                    <button onClick={() => handleLike(post.id)} style={{ flex: 1, background: "transparent", border: "none", padding: "8px 0", color: hasLiked ? "#1877f2" : "#606770", fontWeight: "bold", fontSize: "15px", borderRadius: "4px", cursor: "pointer" }}>👍 J'aime</button>
                    <button onClick={() => setActiveCommentPostId(activeCommentPostId === post.id ? null : post.id)} style={{ flex: 1, background: "transparent", border: "none", padding: "8px 0", color: "#606770", fontWeight: "bold", fontSize: "15px", borderRadius: "4px", cursor: "pointer" }}>💬 Commenter</button>
                  </div>

                  {/* Commentaires */}
                  {(activeCommentPostId === post.id || post.comments?.length > 0) && (
                    <div style={{ padding: "10px 15px", background: "#f0f2f5" }}>
                      {activeCommentPostId === post.id && (
                        <form onSubmit={(e) => handleCommentSubmit(e, post.id)} style={{ display: "flex", gap: "8px", marginBottom: "10px" }}>
                          <input type="text" placeholder="Écrivez un commentaire..." value={commentText} onChange={e => setCommentText(e.target.value)} autoFocus style={{ flex: 1, padding: "8px 15px", borderRadius: "20px", border: "1px solid #ccd0d5", fontSize: "14px", outline: "none", background: "white" }} />
                          <button type="submit" disabled={!commentText.trim()} style={{ background: commentText.trim() ? "#1877f2" : "#e4e6eb", color: commentText.trim() ? "white" : "#bcc0c4", border: "none", padding: "8px 15px", borderRadius: "20px", fontWeight: "bold", cursor: "pointer" }}>Envoyer</button>
                        </form>
                      )}
                      {post.comments?.map((comment: any) => (
                        <div key={comment.id} style={{ display: "flex", gap: "8px", marginBottom: "10px" }}>
                          <div style={{ width: "32px", height: "32px", minWidth: "32px", borderRadius: "50%", overflow: "hidden", background: "#ccc" }}>
                            {comment.user?.photo ? (
                              <img src={comment.user.photo} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                            ) : (
                              <div style={{ width: "100%", height: "100%", color: "white", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "12px", fontWeight: "bold" }}>
                                {comment.user?.prenom?.[0] || "U"}
                              </div>
                            )}
                          </div>
                          <div style={{ flex: 1 }}>
                            {editingCommentId === comment.id ? (
                              <div style={{ display: "flex", gap: "8px", alignItems: "flex-start" }}>
                                <textarea value={editCommentText} onChange={e => setEditCommentText(e.target.value)} style={{ flex: 1, padding: "8px", borderRadius: "10px", border: "1px solid #ccd0d5", resize: "vertical", minHeight: "40px" }} />
                                <button onClick={() => handleEditComment(comment.id)} style={{ background: "#1877f2", color: "white", border: "none", padding: "8px 12px", borderRadius: "6px", fontWeight: "bold", cursor: "pointer" }}>Enregistrer</button>
                                <button onClick={() => setEditingCommentId(null)} style={{ background: "#e4e6eb", padding: "8px 12px", borderRadius: "6px", cursor: "pointer" }}>Annuler</button>
                              </div>
                            ) : (
                              <div>
                                <div style={{ background: "white", padding: "8px 12px", borderRadius: "18px", display: "inline-block", boxShadow: "0 1px 2px rgba(0,0,0,0.1)" }}>
                                  <span style={{ fontWeight: "bold", fontSize: "13px", color: "#050505", display: "block" }}>{comment.user?.prenom} {comment.user?.nom}</span>
                                  <span style={{ fontSize: "14px", color: "#050505" }}>{comment.content}</span>
                                </div>
                                {comment.isEdited && <span style={{ fontSize: "11px", color: "#65676b", marginTop: "2px", display: "block" }}>(modifié)</span>}
                                <div style={{ fontSize: "11px", color: "#65676b", marginTop: "2px", display: "flex", gap: "10px", alignItems: "center" }}>
                                  <span>{new Date(comment.createdAt).toLocaleDateString("fr-FR")}</span>
                                  {comment.userId === userId && (
                                    <>
                                      <button onClick={() => { setEditingCommentId(comment.id); setEditCommentText(comment.content); }} style={{ background: "transparent", border: "none", color: "#1877f2", cursor: "pointer" }}>Modifier</button>
                                      <button onClick={() => handleDeleteComment(comment.id)} style={{ background: "transparent", border: "none", color: "#dc2626", cursor: "pointer" }}>Supprimer</button>
                                    </>
                                  )}
                                  <button onClick={() => setActiveReplyCommentId(activeReplyCommentId === comment.id ? null : comment.id)} style={{ background: "transparent", border: "none", color: "#65676b", cursor: "pointer" }}>Répondre</button>
                                </div>
                              </div>
                            )}
                            {activeReplyCommentId === comment.id && (
                              <form onSubmit={(e) => handleCommentReply(e, post.id, comment.id)} style={{ marginTop: "10px", display: "flex", gap: "8px" }}>
                                <input type="text" placeholder="Répondre..." value={replyCommentText} onChange={e => setReplyCommentText(e.target.value)} autoFocus style={{ flex: 1, padding: "8px 15px", borderRadius: "20px", border: "1px solid #ccd0d5", fontSize: "14px", outline: "none", background: "white" }} />
                                <button type="submit" disabled={!replyCommentText.trim()} style={{ background: replyCommentText.trim() ? "#1877f2" : "#e4e6eb", color: replyCommentText.trim() ? "white" : "#bcc0c4", border: "none", padding: "8px 15px", borderRadius: "20px", fontWeight: "bold", cursor: "pointer" }}>Envoyer</button>
                              </form>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function extractYoutubeId(url: string) {
  const match = url.match(/(?:v=|\/)([\w-]{11})/);
  return match ? match[1] : null;
}
