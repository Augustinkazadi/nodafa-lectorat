"use client";
import { useState, useEffect, useRef } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { uploadMediaFile } from "@/lib/clientUpload";
import AppNavbar from "@/components/AppNavbar";
import PhotoLightbox from "@/components/PhotoLightbox";
import PostPhotoGrid from "@/components/PostPhotoGrid";

type MediaPreview = {
  file: File;
  url: string;
  kind: "IMAGE" | "VIDEO" | "PDF";
};

const MAX_POST_PHOTOS = 10;

function postImageList(post: any): string[] {
  if (Array.isArray(post.mediaUrls) && post.mediaUrls.length) {
    return post.mediaUrls.map((u: any) => (typeof u === "string" ? u : u?.url)).filter(Boolean);
  }
  const one = post.mediaUrl || post.image;
  if (one && (post.mediaType === "IMAGE" || post.image)) return [one];
  return [];
}

export default function JournalPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const userId = parseInt((session?.user as any)?.id || "0");

  const [posts, setPosts] = useState<any[]>([]);
  const [newPostContent, setNewPostContent] = useState("");
  const [mediaItems, setMediaItems] = useState<MediaPreview[]>([]);
  const [publishing, setPublishing] = useState(false);
  const [loading, setLoading] = useState(true);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const pickModeRef = useRef<"image" | "video" | "pdf">("image");
  const [profilePhoto, setProfilePhoto] = useState("");
  const [activeCommentPostId, setActiveCommentPostId] = useState<number | null>(null);
  const [commentText, setCommentText] = useState("");
  const [replyToCommentId, setReplyToCommentId] = useState<number | null>(null);
  const [replyToName, setReplyToName] = useState("");
  const [editingCommentId, setEditingCommentId] = useState<number | null>(null);
  const [editCommentText, setEditCommentText] = useState("");
  const [unreadCount, setUnreadCount] = useState({ notifications: 0, messages: 0, total: 0 });
  const [composerOpen, setComposerOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [menuPostId, setMenuPostId] = useState<number | null>(null);
  const [likesModalPost, setLikesModalPost] = useState<any | null>(null);
  const [highlightedPostId, setHighlightedPostId] = useState<number | null>(null);
  const [photoViewer, setPhotoViewer] = useState<{ images: string[]; index: number } | null>(null);
  const deepLinkApplied = useRef(false);

  useEffect(() => {
    if (status === "unauthenticated") router.push("/login");
  }, [status, router]);

  // Capturer le deep-link notification tout de suite (survit au remount React)
  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const postId = parseInt(params.get("post") || "", 10);
    if (!postId || Number.isNaN(postId)) return;
    const payload = {
      postId,
      comments: params.get("comments") === "1" || !!params.get("comment"),
      commentId: parseInt(params.get("comment") || "", 10) || null,
    };
    try {
      sessionStorage.setItem("lectorat_journal_deeplink", JSON.stringify(payload));
    } catch {
      /* ignore */
    }
    window.history.replaceState({}, "", "/journal");
  }, []);

  useEffect(() => {
    if (status === "authenticated" && session?.user) {
      fetchProfilePhoto();
      fetchPosts();
      fetchUnreadCount();
      fetch("/api/check-birthdays").catch(() => null);
      fetch("/api/lectures/today").catch(() => null);
    }
  }, [status, session]);

  const fetchPosts = async () => {
    try {
      const res = await fetch("/api/posts");
      if (res.ok) setPosts(await res.json());
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };

  // Appliquer le deep-link une fois le fil chargé
  useEffect(() => {
    if (loading || deepLinkApplied.current || typeof window === "undefined") return;

    let link: { postId: number; comments?: boolean; commentId?: number | null } | null = null;
    try {
      const raw = sessionStorage.getItem("lectorat_journal_deeplink");
      if (raw) link = JSON.parse(raw);
    } catch {
      link = null;
    }
    if (!link?.postId || posts.length === 0) return;

    const target = posts.find((p) => p.feedType === "POST" && Number(p.id) === Number(link!.postId));
    if (!target) return;

    deepLinkApplied.current = true;
    try {
      sessionStorage.removeItem("lectorat_journal_deeplink");
    } catch {
      /* ignore */
    }

    const postId = Number(link.postId);
    const commentId = link.commentId ? Number(link.commentId) : null;

    setHighlightedPostId(postId);
    if (link.comments) setActiveCommentPostId(postId);

    if (commentId) {
      const c = (target.comments || []).find((x: any) => Number(x.id) === commentId);
      if (c) {
        setReplyToCommentId(c.id);
        setReplyToName(`${c.user?.prenom || ""} ${c.user?.nom || ""}`.trim());
      }
    }

    const scrollToPost = (attempt = 0) => {
      const el = document.getElementById(`post-${postId}`);
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "center" });
        if (commentId) {
          const replyEl = document.getElementById(`reply-input-${commentId}`) as HTMLInputElement | null;
          replyEl?.focus();
        }
        return;
      }
      if (attempt < 15) window.setTimeout(() => scrollToPost(attempt + 1), 120);
    };
    window.setTimeout(() => scrollToPost(0), 80);
    window.setTimeout(() => setHighlightedPostId(null), 5000);
  }, [loading, posts]);

  const fetchProfilePhoto = async () => {
    try {
      const res = await fetch("/api/auth/profil");
      if (res.ok) {
        const data = await res.json();
        setProfilePhoto(data.photo || "");
      }
    } catch (e) {
      console.error(e);
    }
  };

  const fetchUnreadCount = async () => {
    try {
      const res = await fetch("/api/unread-count");
      if (res.ok) setUnreadCount(await res.json());
    } catch (e) {
      console.error(e);
    }
  };

  const openFilePicker = (accept: string, mode: "image" | "video" | "pdf") => {
    if (!fileInputRef.current) return;
    pickModeRef.current = mode;
    fileInputRef.current.accept = accept;
    fileInputRef.current.multiple = mode === "image";
    fileInputRef.current.click();
  };

  const handleMediaSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    const mode = pickModeRef.current;

    if (mode === "image") {
      const images = files.filter((f) => f.type.startsWith("image/"));
      if (!images.length) {
        alert("Choisissez des photos (images).");
        return;
      }
      setMediaItems((prev) => {
        const kept = prev.filter((m) => m.kind === "IMAGE");
        const room = Math.max(0, MAX_POST_PHOTOS - kept.length);
        if (room <= 0) {
          alert(`Maximum ${MAX_POST_PHOTOS} photos par publication.`);
          return kept;
        }
        const next = images.slice(0, room).map((file) => ({
          file,
          url: URL.createObjectURL(file),
          kind: "IMAGE" as const,
        }));
        // retire vidéo/pdf si on passe en galerie
        prev.filter((m) => m.kind !== "IMAGE").forEach((m) => URL.revokeObjectURL(m.url));
        return [...kept, ...next];
      });
      setComposerOpen(true);
    } else {
      const file = files[0];
      let kind: MediaPreview["kind"] | null = null;
      if (mode === "video" && file.type.startsWith("video/")) kind = "VIDEO";
      if (mode === "pdf" && (file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf"))) kind = "PDF";
      if (!kind) {
        alert("Formats acceptés : photo, vidéo ou PDF.");
        return;
      }
      setMediaItems((prev) => {
        prev.forEach((m) => URL.revokeObjectURL(m.url));
        return [{ file, url: URL.createObjectURL(file), kind }];
      });
      setComposerOpen(true);
    }
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const clearMedia = () => {
    setMediaItems((prev) => {
      prev.forEach((m) => URL.revokeObjectURL(m.url));
      return [];
    });
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const removeMediaAt = (index: number) => {
    setMediaItems((prev) => {
      const copy = [...prev];
      const [removed] = copy.splice(index, 1);
      if (removed) URL.revokeObjectURL(removed.url);
      return copy;
    });
  };

  const handleCreatePost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPostContent.trim() && mediaItems.length === 0) return;
    setPublishing(true);
    try {
      let mediaUrl: string | undefined;
      let mediaType: string | undefined;
      let mediaName: string | undefined;
      let mediaUrls: string[] | undefined;
      let image: string | null = null;

      if (mediaItems.length) {
        const allImages = mediaItems.every((m) => m.kind === "IMAGE");
        if (allImages) {
          const uploaded = [];
          for (const item of mediaItems.slice(0, MAX_POST_PHOTOS)) {
            uploaded.push(await uploadMediaFile(item.file, "post"));
          }
          mediaUrls = uploaded.map((u) => u.url);
          mediaUrl = mediaUrls[0];
          mediaType = "IMAGE";
          mediaName = uploaded[0]?.name;
          image = mediaUrl;
        } else {
          const item = mediaItems[0];
          const uploaded = await uploadMediaFile(item.file, "post");
          mediaUrl = uploaded.url;
          mediaType = uploaded.mediaType;
          mediaName = uploaded.name;
          image = mediaType === "IMAGE" ? mediaUrl : null;
        }
      }

      const res = await fetch("/api/posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: newPostContent,
          mediaUrl,
          mediaType,
          mediaName,
          mediaUrls,
          image,
        }),
      });
      if (res.ok) {
        setNewPostContent("");
        clearMedia();
        setComposerOpen(false);
        fetchPosts();
      } else {
        const err = await res.json().catch(() => ({}));
        alert(err.message || "Erreur de publication");
      }
    } catch (err: any) {
      alert(err?.message || "Erreur de publication");
    } finally {
      setPublishing(false);
    }
  };

  const handleLike = async (postId: number) => {
    await fetch(`/api/posts/${postId}/like`, { method: "POST" });
    fetchPosts();
  };

  const handleShare = async (post: any) => {
    const text = `${post.content || ""}\n— NODAFA Journal`;
    try {
      if (navigator.share) {
        await navigator.share({ title: "NODAFA", text, url: window.location.href });
      } else {
        await navigator.clipboard.writeText(text);
        alert("Publication copiée dans le presse-papiers");
      }
      await fetch(`/api/posts/${post.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ share: true }),
      }).catch(() => null);
    } catch {
      /* annulé */
    }
  };

  const handleCommentSubmit = async (e: React.FormEvent, postId: number) => {
    e.preventDefault();
    if (!commentText.trim()) return;
    const res = await fetch(`/api/posts/${postId}/comment`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        content: commentText,
        parentId: replyToCommentId || undefined,
      }),
    });
    if (res.ok) {
      setCommentText("");
      setReplyToCommentId(null);
      setReplyToName("");
      fetchPosts();
      fetchUnreadCount();
    }
  };

  const startReply = (comment: any) => {
    setReplyToCommentId(comment.id);
    setReplyToName(`${comment.user?.prenom || ""} ${comment.user?.nom || ""}`.trim());
    setEditingCommentId(null);
    setCommentText("");
    // Focus après rendu du champ de réponse inline
    requestAnimationFrame(() => {
      const el = document.getElementById(`reply-input-${comment.id}`) as HTMLInputElement | null;
      el?.focus();
    });
  };

  const cancelReply = () => {
    setReplyToCommentId(null);
    setReplyToName("");
    setCommentText("");
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

  const handleSavePost = async (post: any) => {
    const mediaUrl = post.mediaUrl || post.image;
    try {
      if (mediaUrl) {
        const a = document.createElement("a");
        a.href = mediaUrl;
        a.download = post.mediaName || `lectorat_${post.id}`;
        a.target = "_blank";
        a.rel = "noreferrer";
        document.body.appendChild(a);
        a.click();
        a.remove();
        return;
      }
      await navigator.clipboard.writeText(post.content || "");
      alert("Texte de la publication copié");
    } catch {
      alert("Impossible d'enregistrer");
    }
  };

  const filteredPosts = posts.filter((p) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      (p.content || "").toLowerCase().includes(q) ||
      `${p.author?.prenom || ""} ${p.author?.nom || ""}`.toLowerCase().includes(q) ||
      (p.mediaName || "").toLowerCase().includes(q)
    );
  });

  if (status === "loading" || loading) {
    return (
      <div style={{ textAlign: "center", padding: "50px", fontFamily: "Helvetica Neue, Arial, sans-serif", color: "#65676b" }}>
        Chargement du journal...
      </div>
    );
  }

  const firstName = session?.user?.name?.split(" ")[0] || "";

  return (
    <div style={{ minHeight: "100vh", color: "var(--ink)" }}>
      <AppNavbar
        userName={session?.user?.name}
        userPhoto={profilePhoto}
        isAdmin={(session?.user as any)?.role === "ADMIN"}
        unreadNotifications={unreadCount.notifications}
        unreadMessages={unreadCount.messages}
        search={search}
        onSearchChange={setSearch}
        active="journal"
      />

      <main style={{ maxWidth: 680, margin: "16px auto", padding: "0 12px 28px" }}>
        {/* Composer Facebook-like */}
        <section style={cardStyle}>
          <div style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 12 }}>
            <a
              href="/profil"
              title="Mon profil"
              aria-label="Ouvrir mon profil"
              style={{ display: "inline-flex", borderRadius: "50%", flexShrink: 0 }}
            >
              <Avatar src={profilePhoto} name={session?.user?.name || "U"} size={40} />
            </a>
            <button
              type="button"
              onClick={() => setComposerOpen(true)}
              style={{
                flex: 1,
                textAlign: "left",
                background: "#f0f2f5",
                border: "none",
                borderRadius: 50,
                padding: "12px 16px",
                color: "#65676b",
                fontSize: 16,
                cursor: "pointer",
              }}
            >
              Quoi de neuf, {firstName} ?
            </button>
          </div>
          <div style={{ borderTop: "1px solid #e4e6eb", paddingTop: 10, display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 6 }}>
            <ComposerAction label="Photos" color="#45bd62" onClick={() => openFilePicker("image/*", "image")} />
            <ComposerAction label="Vidéo" color="#f02849" onClick={() => openFilePicker("video/*", "video")} />
            <ComposerAction label="PDF / Fichier" color="#f7b928" onClick={() => openFilePicker("application/pdf,.pdf", "pdf")} />
          </div>
          <input type="file" ref={fileInputRef} onChange={handleMediaSelect} style={{ display: "none" }} />
        </section>

        {composerOpen && (
          <section style={{ ...cardStyle, marginTop: 12 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
              <h3 style={{ margin: 0, fontSize: 18 }}>Créer une publication</h3>
              <button
                type="button"
                onClick={() => {
                  setComposerOpen(false);
                  clearMedia();
                  setNewPostContent("");
                }}
                style={iconBtn}
              >
                ✕
              </button>
            </div>
            <form onSubmit={handleCreatePost}>
              <div style={{ display: "flex", gap: 10, marginBottom: 10 }}>
                <Avatar src={profilePhoto} name={session?.user?.name || "U"} size={40} />
                <div>
                  <div style={{ fontWeight: 600 }}>{session?.user?.name}</div>
                  <div style={{ fontSize: 12, color: "#65676b" }}>Visible par tout le lectorat</div>
                </div>
              </div>
              <textarea
                placeholder={`Quoi de neuf, ${firstName} ?`}
                value={newPostContent}
                onChange={(e) => setNewPostContent(e.target.value)}
                autoFocus
                style={{
                  width: "100%",
                  border: "none",
                  outline: "none",
                  resize: "vertical",
                  minHeight: 110,
                  fontSize: 18,
                  fontFamily: "inherit",
                  lineHeight: 1.4,
                }}
              />

              {mediaItems.length > 0 && mediaItems.every((m) => m.kind === "IMAGE") && (
                <div style={{ marginBottom: 12 }}>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(96px, 1fr))", gap: 8 }}>
                    {mediaItems.map((item, i) => (
                      <div key={item.url} style={{ position: "relative", borderRadius: 8, overflow: "hidden", border: "1px solid #e4e6eb", aspectRatio: "1" }}>
                        <img src={item.url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
                        <button
                          type="button"
                          onClick={() => removeMediaAt(i)}
                          style={{ ...iconBtn, position: "absolute", top: 4, right: 4, background: "rgba(0,0,0,0.65)", color: "#fff", width: 28, height: 28 }}
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                    {mediaItems.length < MAX_POST_PHOTOS && (
                      <button
                        type="button"
                        onClick={() => openFilePicker("image/*", "image")}
                        style={{
                          border: "1px dashed #ccd0d5",
                          borderRadius: 8,
                          background: "#f7f8fa",
                          cursor: "pointer",
                          fontWeight: 700,
                          color: "#65676b",
                          minHeight: 96,
                        }}
                      >
                        + Photo
                      </button>
                    )}
                  </div>
                  <div style={{ marginTop: 8, fontSize: 12, color: "#65676b" }}>
                    {mediaItems.length}/{MAX_POST_PHOTOS} photos
                  </div>
                </div>
              )}

              {mediaItems.length === 1 && mediaItems[0].kind !== "IMAGE" && (
                <div style={{ position: "relative", marginBottom: 12, border: "1px solid #e4e6eb", borderRadius: 8, overflow: "hidden" }}>
                  <button type="button" onClick={clearMedia} style={{ ...iconBtn, position: "absolute", top: 8, right: 8, zIndex: 2, background: "rgba(0,0,0,0.65)", color: "#fff" }}>
                    ✕
                  </button>
                  {mediaItems[0].kind === "VIDEO" && (
                    <video src={mediaItems[0].url} controls style={{ width: "100%", maxHeight: 360, display: "block", background: "#000" }} />
                  )}
                  {mediaItems[0].kind === "PDF" && (
                    <div style={{ padding: 20, background: "#f7f8fa", display: "flex", alignItems: "center", gap: 12 }}>
                      <div style={{ fontSize: 32 }}>📄</div>
                      <div>
                        <div style={{ fontWeight: 700 }}>{mediaItems[0].file.name}</div>
                        <div style={{ fontSize: 13, color: "#65676b" }}>Document PDF prêt à publier</div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              <div style={{ border: "1px solid #ccd0d5", borderRadius: 8, padding: "10px 12px", display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                <span style={{ fontWeight: 600, fontSize: 14 }}>Ajouter à votre publication</span>
                <div style={{ display: "flex", gap: 8 }}>
                  <button type="button" onClick={() => openFilePicker("image/*", "image")} style={miniMediaBtn} title="Photos">
                    📷
                  </button>
                  <button type="button" onClick={() => openFilePicker("video/*", "video")} style={miniMediaBtn} title="Vidéo">
                    🎬
                  </button>
                  <button type="button" onClick={() => openFilePicker("application/pdf,.pdf", "pdf")} style={miniMediaBtn} title="PDF">
                    📄
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={publishing || (!newPostContent.trim() && mediaItems.length === 0)}
                style={{
                  width: "100%",
                  border: "none",
                  borderRadius: 6,
                  padding: "10px 0",
                  fontWeight: 700,
                  fontSize: 15,
                  cursor: publishing || (!newPostContent.trim() && mediaItems.length === 0) ? "not-allowed" : "pointer",
                  background: newPostContent.trim() || mediaItems.length ? "#1877f2" : "#e4e6eb",
                  color: newPostContent.trim() || mediaItems.length ? "#fff" : "#bcc0c4",
                }}
              >
                {publishing ? "Publication..." : "Publier"}
              </button>
            </form>
          </section>
        )}

        {filteredPosts.length === 0 && (
          <p style={{ textAlign: "center", color: "#65676b", marginTop: 40 }}>Aucune publication pour le moment.</p>
        )}

        {filteredPosts.map((post: any) => {
          const isPost = post.feedType === "POST";
          const isLive = post.feedType === "ADMIN_LIVE";
          const hasLiked = post.likes?.some((like: any) => like.userId === userId);
          const isMyPost = post.author?.id === userId || post.author?.prenom === firstName;
          const mediaUrl = post.mediaUrl || post.image;
          const mediaType = post.mediaType || (post.image ? "IMAGE" : null);
          const imageList = isPost ? postImageList(post) : mediaType === "IMAGE" && mediaUrl ? [mediaUrl] : [];

          const isHighlighted = isPost && highlightedPostId === post.id;

          return (
            <article
              key={String(post.id)}
              id={isPost ? `post-${post.id}` : undefined}
              style={{
                ...cardStyle,
                marginTop: 16,
                overflow: "hidden",
                scrollMarginTop: 88,
                outline: isHighlighted ? "2px solid #1877f2" : undefined,
                boxShadow: isHighlighted ? "0 0 0 4px rgba(24,119,242,0.22)" : cardStyle.boxShadow,
                transition: "box-shadow 0.3s ease, outline 0.3s ease",
              }}
            >
              <div style={{ padding: "12px 16px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                  {isPost && post.author?.id ? (
                    <a href={`/profil?id=${post.author.id}`} style={{ textDecoration: "none", color: "inherit", display: "flex", gap: 10, alignItems: "center" }}>
                      <Avatar
                        src={post.author?.photo}
                        name={`${post.author?.prenom || "U"}`}
                        size={40}
                        online={isAuthorOnline(post.author?.lastSeenAt)}
                        showStatus
                      />
                      <div>
                        <div style={{ fontWeight: 600, fontSize: 15 }}>
                          {post.author?.prenom} {post.author?.nom}
                        </div>
                        <div style={{ color: "#65676b", fontSize: 13 }}>
                          {formatDateTime(post.createdAt)} · {isAuthorOnline(post.author?.lastSeenAt) ? "En ligne" : "Public"}
                        </div>
                      </div>
                    </a>
                  ) : (
                    <>
                      <Avatar src={post.author?.photo} name={`${post.author?.prenom || "U"}`} size={40} />
                      <div>
                        <div style={{ fontWeight: 600, fontSize: 15 }}>
                          {post.author?.prenom} {post.author?.nom}
                          <span style={{ color: isLive ? "#f02849" : "#1877f2", marginLeft: 6, fontSize: 13 }}>
                            {isLive ? "EN DIRECT" : "Officiel"}
                          </span>
                        </div>
                        <div style={{ color: "#65676b", fontSize: 13 }}>{formatDateTime(post.createdAt)} · Public</div>
                      </div>
                    </>
                  )}
                </div>
                {isPost && (
                  <div style={{ position: "relative" }}>
                    <button
                      type="button"
                      onClick={() => setMenuPostId(menuPostId === post.id ? null : post.id)}
                      style={{ ...iconBtn, color: "#050505", fontSize: 20, lineHeight: 1 }}
                      title="Options"
                    >
                      ⋯
                    </button>
                    {menuPostId === post.id && (
                      <div
                        style={{
                          position: "absolute",
                          right: 0,
                          top: 40,
                          background: "#fff",
                          border: "1px solid #e4e6eb",
                          borderRadius: 12,
                          boxShadow: "0 10px 30px rgba(15,23,42,0.12)",
                          minWidth: 180,
                          zIndex: 20,
                          overflow: "hidden",
                        }}
                      >
                        {(mediaUrl || post.content) && (
                          <button
                            type="button"
                            onClick={() => {
                              handleSavePost(post);
                              setMenuPostId(null);
                            }}
                            style={menuItemStyle}
                          >
                            Enregistrer
                          </button>
                        )}
                        {(isMyPost || (session?.user as any)?.role === "ADMIN") && (
                          <button
                            type="button"
                            onClick={() => {
                              setMenuPostId(null);
                              handleDeletePost(post.id);
                            }}
                            style={{ ...menuItemStyle, color: "#dc2626" }}
                          >
                            Supprimer
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {post.content && (
                <div style={{ padding: "0 16px 12px", fontSize: 15, lineHeight: 1.45, whiteSpace: "pre-wrap" }}>{post.content}</div>
              )}

              {post.feedType === "ADMIN_READING" && (
                <div style={{ padding: "0 16px 14px", display: "grid", gap: 10 }}>
                  <ReadingSection title="1ʳᵉ lecture" text={post.firstReading} />
                  <ReadingSection
                    title="2ᵉ lecture"
                    text={post.secondReading}
                    emptyLabel="Pas de 2ᵉ lecture aujourd’hui (messe de semaine)"
                  />
                  <ReadingSection title="Évangile" text={post.gospel} accent emptyLabel="Évangile non disponible" />
                  <a href="/lecture-du-jour" style={{ color: "#1d4ed8", fontWeight: 700, fontSize: 13, textDecoration: "none" }}>
                    Lire les textes complets →
                  </a>
                </div>
              )}

              {imageList.length > 0 && (
                <PostPhotoGrid
                  images={imageList}
                  onOpen={(index) => setPhotoViewer({ images: imageList, index })}
                />
              )}

              {mediaUrl && mediaType === "VIDEO" && (
                <video src={mediaUrl} controls style={{ width: "100%", maxHeight: 520, display: "block", background: "#000" }} />
              )}

              {mediaUrl && mediaType === "PDF" && (
                <div style={{ margin: "0 16px 12px", border: "1px solid #e4e6eb", borderRadius: 8, overflow: "hidden" }}>
                  <div style={{ padding: 14, background: "#f7f8fa", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10 }}>
                    <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                      <span style={{ fontSize: 28 }}>📄</span>
                      <div>
                        <div style={{ fontWeight: 700 }}>{post.mediaName || "Document PDF"}</div>
                        <div style={{ fontSize: 12, color: "#65676b" }}>Fichier partagé avec le lectorat</div>
                      </div>
                    </div>
                    <a href={mediaUrl} target="_blank" rel="noreferrer" style={{ color: "#1877f2", fontWeight: 700, textDecoration: "none" }}>
                      Ouvrir
                    </a>
                  </div>
                  <iframe src={mediaUrl} title={post.mediaName || "PDF"} style={{ width: "100%", height: 360, border: "none", background: "#fff" }} />
                </div>
              )}

              {isLive && (
                <div style={{ padding: "0 16px 14px" }}>
                  {post.isActive ? (
                    <a
                      href="/live"
                      style={{
                        display: "block",
                        textAlign: "center",
                        background: "#dc2626",
                        color: "#fff",
                        fontWeight: 800,
                        padding: "14px 16px",
                        borderRadius: 12,
                        textDecoration: "none",
                      }}
                    >
                      ● Regarder l’événement en direct
                    </a>
                  ) : post.replayUrl ? (
                    <a
                      href="/live"
                      style={{
                        display: "block",
                        textAlign: "center",
                        background: "#1d4ed8",
                        color: "#fff",
                        fontWeight: 800,
                        padding: "14px 16px",
                        borderRadius: 12,
                        textDecoration: "none",
                      }}
                    >
                      ▶ Voir la rediffusion
                    </a>
                  ) : (
                    <div style={{ padding: 12, background: "#f8fafc", borderRadius: 12, color: "#64748b", fontSize: 14 }}>
                      Diffusion terminée
                    </div>
                  )}
                </div>
              )}

              {isPost && (
                <>
                  <div
                    style={{
                      padding: "10px 16px",
                      display: "flex",
                      justifyContent: "space-between",
                      color: "#65676b",
                      fontSize: 15,
                      borderBottom: "1px solid #e4e6eb",
                    }}
                  >
                    <button
                      type="button"
                      onClick={() => (post.likes?.length || 0) > 0 && setLikesModalPost(post)}
                      style={{
                        ...textBtn,
                        fontSize: 15,
                        color: hasLiked ? "#1877f2" : "#65676b",
                        cursor: (post.likes?.length || 0) > 0 ? "pointer" : "default",
                      }}
                      disabled={(post.likes?.length || 0) === 0}
                      title={(post.likes?.length || 0) > 0 ? "Voir qui a aimé" : undefined}
                    >
                      👍 {post.likes?.length || 0}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setActiveCommentPostId(activeCommentPostId === post.id ? null : post.id);
                        setReplyToCommentId(null);
                        setReplyToName("");
                      }}
                      style={{ ...textBtn, fontSize: 15, color: "#65676b" }}
                    >
                      {post.comments?.length || 0} commentaires
                    </button>
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", padding: "4px 8px", borderBottom: activeCommentPostId === post.id ? "1px solid #e4e6eb" : "none" }}>
                    <button onClick={() => handleLike(post.id)} style={{ ...actionBtn, color: hasLiked ? "#1877f2" : "#65676b" }}>
                      👍 J&apos;aime
                    </button>
                    <button
                      onClick={() => {
                        setActiveCommentPostId(activeCommentPostId === post.id ? null : post.id);
                        setReplyToCommentId(null);
                        setReplyToName("");
                      }}
                      style={{ ...actionBtn, color: activeCommentPostId === post.id ? "#1877f2" : "#65676b" }}
                    >
                      💬 Commentaires
                    </button>
                    <button onClick={() => handleShare(post)} style={actionBtn}>
                      ↗ Partager
                    </button>
                  </div>

                  {activeCommentPostId === post.id && (
                    <div style={{ padding: "12px 16px 20px", background: "#fff" }}>
                      {!replyToCommentId && (
                        <form onSubmit={(e) => handleCommentSubmit(e, post.id)} style={{ marginBottom: 12 }}>
                          <div style={{ display: "flex", gap: 8 }}>
                            <Avatar src={profilePhoto} name={session?.user?.name || "U"} size={32} />
                            <input
                              type="text"
                              placeholder="Écrire un commentaire..."
                              value={commentText}
                              onChange={(e) => setCommentText(e.target.value)}
                              style={{
                                flex: 1,
                                padding: "8px 14px",
                                borderRadius: 18,
                                border: "none",
                                background: "#f0f2f5",
                                outline: "none",
                                fontSize: 14,
                              }}
                            />
                            <button
                              type="submit"
                              disabled={!commentText.trim()}
                              style={{
                                border: "none",
                                background: "transparent",
                                color: commentText.trim() ? "#1877f2" : "#bcc0c4",
                                fontWeight: 700,
                                cursor: commentText.trim() ? "pointer" : "default",
                              }}
                            >
                              Publier
                            </button>
                          </div>
                        </form>
                      )}

                      {(post.comments?.length || 0) === 0 && (
                        <p style={{ color: "#65676b", fontSize: 14, margin: "0 0 8px" }}>Aucun commentaire pour le moment.</p>
                      )}

                      {groupComments(post.comments || []).map(({ comment, replies }) => (
                        <div key={comment.id} style={{ marginBottom: 12 }}>
                          <CommentRow
                            comment={comment}
                            userId={userId}
                            editingCommentId={editingCommentId}
                            editCommentText={editCommentText}
                            setEditCommentText={setEditCommentText}
                            onEdit={() => {
                              setEditingCommentId(comment.id);
                              setEditCommentText(comment.content);
                              cancelReply();
                            }}
                            onCancelEdit={() => setEditingCommentId(null)}
                            onSaveEdit={() => handleEditComment(comment.id)}
                            onDelete={() => handleDeleteComment(comment.id)}
                            onReply={() => startReply(comment)}
                            isReplying={replyToCommentId === comment.id}
                          />
                          {replyToCommentId === comment.id && (
                            <InlineReplyForm
                              inputId={`reply-input-${comment.id}`}
                              profilePhoto={profilePhoto}
                              userName={session?.user?.name || "U"}
                              replyToName={replyToName}
                              commentText={commentText}
                              setCommentText={setCommentText}
                              onCancel={cancelReply}
                              onSubmit={(e) => handleCommentSubmit(e, post.id)}
                            />
                          )}
                          {replies.length > 0 && (
                            <div style={{ marginLeft: 40, marginTop: 8 }}>
                              {replies.map((reply: any) => (
                                <div key={reply.id} style={{ marginBottom: 8 }}>
                                  <CommentRow
                                    comment={reply}
                                    userId={userId}
                                    editingCommentId={editingCommentId}
                                    editCommentText={editCommentText}
                                    setEditCommentText={setEditCommentText}
                                    onEdit={() => {
                                      setEditingCommentId(reply.id);
                                      setEditCommentText(reply.content);
                                      cancelReply();
                                    }}
                                    onCancelEdit={() => setEditingCommentId(null)}
                                    onSaveEdit={() => handleEditComment(reply.id)}
                                    onDelete={() => handleDeleteComment(reply.id)}
                                    onReply={() => startReply(reply)}
                                    isReplying={replyToCommentId === reply.id}
                                    compact
                                  />
                                  {replyToCommentId === reply.id && (
                                    <InlineReplyForm
                                      inputId={`reply-input-${reply.id}`}
                                      profilePhoto={profilePhoto}
                                      userName={session?.user?.name || "U"}
                                      replyToName={replyToName}
                                      commentText={commentText}
                                      setCommentText={setCommentText}
                                      onCancel={cancelReply}
                                      onSubmit={(e) => handleCommentSubmit(e, post.id)}
                                    />
                                  )}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}
            </article>
          );
        })}
      </main>

      {photoViewer && (
        <PhotoLightbox
          images={photoViewer.images}
          index={photoViewer.index}
          alt="Photo du journal"
          onClose={() => setPhotoViewer(null)}
        />
      )}

      {likesModalPost && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Personnes qui ont aimé"
          onClick={() => setLikesModalPost(null)}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.45)",
            zIndex: 1200,
            display: "flex",
            alignItems: "flex-end",
            justifyContent: "center",
            padding: 12,
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: "100%",
              maxWidth: 420,
              maxHeight: "70vh",
              background: "#fff",
              borderRadius: 16,
              overflow: "hidden",
              boxShadow: "0 12px 40px rgba(0,0,0,0.25)",
            }}
          >
            <div
              style={{
                padding: "14px 16px",
                borderBottom: "1px solid #e4e6eb",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <strong style={{ fontSize: 17 }}>J&apos;aime</strong>
              <button type="button" onClick={() => setLikesModalPost(null)} style={{ ...textBtn, fontSize: 20, lineHeight: 1 }}>
                ×
              </button>
            </div>
            <div style={{ overflowY: "auto", maxHeight: "calc(70vh - 56px)", padding: "8px 0" }}>
              {(likesModalPost.likes || []).map((like: any) => {
                const name = `${like.user?.prenom || ""} ${like.user?.nom || ""}`.trim() || "Membre";
                return (
                  <div key={like.id || `${like.userId}`} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 16px" }}>
                    <Avatar src={like.user?.photo} name={name} size={40} />
                    <div style={{ flex: 1, fontWeight: 650 }}>{name}</div>
                    <span style={{ color: "#1877f2", fontSize: 18 }}>👍</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function groupComments(comments: any[]) {
  const roots = comments.filter((c) => !c.parentId);
  return roots.map((comment) => ({
    comment,
    replies: comments.filter((c) => c.parentId === comment.id),
  }));
}

function InlineReplyForm({
  inputId,
  profilePhoto,
  userName,
  replyToName,
  commentText,
  setCommentText,
  onCancel,
  onSubmit,
}: {
  inputId: string;
  profilePhoto?: string;
  userName: string;
  replyToName: string;
  commentText: string;
  setCommentText: (v: string) => void;
  onCancel: () => void;
  onSubmit: (e: React.FormEvent) => void;
}) {
  return (
    <form onSubmit={onSubmit} style={{ margin: "8px 0 4px 40px" }}>
      <div style={{ fontSize: 12, color: "#1877f2", marginBottom: 6, display: "flex", justifyContent: "space-between", gap: 8 }}>
        <span>
          Réponse à <strong>{replyToName || "ce commentaire"}</strong>
        </span>
        <button type="button" onClick={onCancel} style={{ ...textBtn, color: "#1877f2", padding: "2px 6px" }}>
          Annuler
        </button>
      </div>
      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
        <Avatar src={profilePhoto} name={userName} size={28} />
        <input
          id={inputId}
          type="text"
          placeholder={`Répondre à ${replyToName || "ce commentaire"}…`}
          value={commentText}
          onChange={(e) => setCommentText(e.target.value)}
          autoFocus
          style={{
            flex: 1,
            padding: "8px 14px",
            borderRadius: 18,
            border: "1px solid #cfe2ff",
            background: "#f0f7ff",
            outline: "none",
            fontSize: 14,
          }}
        />
        <button
          type="submit"
          disabled={!commentText.trim()}
          style={{
            border: "none",
            background: commentText.trim() ? "#1877f2" : "#e4e6eb",
            color: commentText.trim() ? "#fff" : "#bcc0c4",
            fontWeight: 700,
            cursor: commentText.trim() ? "pointer" : "default",
            borderRadius: 16,
            padding: "8px 12px",
            fontSize: 13,
          }}
        >
          Répondre
        </button>
      </div>
    </form>
  );
}

function CommentRow({
  comment,
  userId,
  editingCommentId,
  editCommentText,
  setEditCommentText,
  onEdit,
  onCancelEdit,
  onSaveEdit,
  onDelete,
  onReply,
  isReplying,
  compact,
}: {
  comment: any;
  userId: number;
  editingCommentId: number | null;
  editCommentText: string;
  setEditCommentText: (v: string) => void;
  onEdit: () => void;
  onCancelEdit: () => void;
  onSaveEdit: () => void;
  onDelete: () => void;
  onReply: () => void;
  isReplying?: boolean;
  compact?: boolean;
}) {
  return (
    <div style={{ display: "flex", gap: 8 }}>
      <Avatar src={comment.user?.photo} name={comment.user?.prenom || "U"} size={compact ? 28 : 32} />
      <div style={{ flex: 1, minWidth: 0 }}>
        {editingCommentId === comment.id ? (
          <div style={{ display: "flex", gap: 8 }}>
            <textarea
              value={editCommentText}
              onChange={(e) => setEditCommentText(e.target.value)}
              style={{ flex: 1, padding: 8, borderRadius: 10, border: "1px solid #ccd0d5", minHeight: 40 }}
            />
            <button type="button" onClick={onSaveEdit} style={{ ...smallBtn, background: "#1877f2", color: "#fff" }}>
              OK
            </button>
            <button type="button" onClick={onCancelEdit} style={smallBtn}>
              Annuler
            </button>
          </div>
        ) : (
          <>
            <div style={{ background: "#f0f2f5", padding: "8px 12px", borderRadius: 18, display: "inline-block", maxWidth: "100%" }}>
              <strong style={{ display: "block", fontSize: 13 }}>
                {comment.user?.prenom} {comment.user?.nom}
              </strong>
              <span style={{ fontSize: 14 }}>{comment.content}</span>
            </div>
            <div style={{ fontSize: 12, color: "#65676b", marginTop: 4, display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
              <span>{new Date(comment.createdAt).toLocaleDateString("fr-FR")}</span>
              {comment.isEdited && <span>modifié</span>}
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  onReply();
                }}
                style={{
                  border: "none",
                  background: isReplying ? "#e7f3ff" : "transparent",
                  color: "#1877f2",
                  cursor: "pointer",
                  padding: "4px 8px",
                  borderRadius: 8,
                  fontWeight: 800,
                  fontSize: 12,
                  position: "relative",
                  zIndex: 2,
                  WebkitTapHighlightColor: "transparent",
                }}
              >
                Répondre
              </button>
              {comment.userId === userId && (
                <>
                  <button type="button" onClick={onEdit} style={{ ...textBtn, padding: "4px 6px" }}>
                    Modifier
                  </button>
                  <button type="button" onClick={onDelete} style={{ ...textBtn, color: "#e41e3f", padding: "4px 6px" }}>
                    Supprimer
                  </button>
                </>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function isAuthorOnline(lastSeenAt?: string | Date | null) {
  if (!lastSeenAt) return false;
  return Date.now() - new Date(lastSeenAt).getTime() <= 2 * 60 * 1000;
}

function Avatar({
  src,
  name,
  size,
  online,
  showStatus,
}: {
  src?: string | null;
  name: string;
  size: number;
  online?: boolean;
  showStatus?: boolean;
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
            background: "#1877f2",
            color: "#fff",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontWeight: 700,
            fontSize: size * 0.4,
          }}
        >
          {name?.charAt(0)?.toUpperCase() || "U"}
        </div>
      )}
      {showStatus && (
        <span
          title={online ? "En ligne" : "Hors ligne"}
          style={{
            position: "absolute",
            right: 0,
            bottom: 0,
            width: Math.max(10, size * 0.28),
            height: Math.max(10, size * 0.28),
            borderRadius: "50%",
            background: online ? "#22c55e" : "#94a3b8",
            border: "2px solid #fff",
            boxSizing: "border-box",
          }}
        />
      )}
    </div>
  );
}

function readingFeedPreview(text?: string | null) {
  if (!text?.trim()) return null;
  const lines = text
    .split(/\n+/)
    .map((l) => l.trim())
    .filter(Boolean);
  // Intro + référence + titre/citation : assez pour identifier la lecture sans noyer le fil
  const head = lines.slice(0, 3).join("\n");
  return head.length > 260 ? `${head.slice(0, 260)}…` : head;
}

function ReadingSection({
  title,
  text,
  accent,
  emptyLabel,
}: {
  title: string;
  text?: string | null;
  accent?: boolean;
  emptyLabel?: string;
}) {
  const preview = readingFeedPreview(text);
  if (!preview && !emptyLabel) return null;
  return (
    <div
      style={{
        padding: 12,
        borderRadius: 12,
        background: accent ? "#eff6ff" : "#f8fafc",
        border: `1px solid ${accent ? "#bfdbfe" : "#e2e8f0"}`,
      }}
    >
      <div style={{ fontWeight: 800, marginBottom: 6, color: accent ? "#1d4ed8" : "#0f172a" }}>{title}</div>
      <div
        style={{
          whiteSpace: "pre-wrap",
          lineHeight: 1.5,
          fontSize: 14,
          color: preview ? "#334155" : "#94a3b8",
          fontStyle: preview ? "normal" : "italic",
        }}
      >
        {preview || emptyLabel}
      </div>
    </div>
  );
}

function ComposerAction({ label, color, onClick }: { label: string; color: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        border: "none",
        background: "transparent",
        padding: "10px 6px",
        borderRadius: 8,
        fontWeight: 600,
        color: "#65676b",
        cursor: "pointer",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 6,
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLButtonElement).style.background = "#f0f2f5";
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLButtonElement).style.background = "transparent";
      }}
    >
      <span style={{ width: 10, height: 10, borderRadius: "50%", background: color, display: "inline-block" }} />
      {label}
    </button>
  );
}

function formatDateTime(value: string) {
  return new Date(value).toLocaleString("fr-FR", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function extractYoutubeId(url: string) {
  const match = url.match(/(?:v=|\/)([\w-]{11})/);
  return match ? match[1] : null;
}

const cardStyle: React.CSSProperties = {
  background: "rgba(255,255,255,0.96)",
  borderRadius: 18,
  boxShadow: "0 10px 30px rgba(15,23,42,0.08)",
  border: "1px solid rgba(226,232,240,0.9)",
  padding: 12,
};

const iconBtn: React.CSSProperties = {
  border: "none",
  background: "#e4e6eb",
  width: 32,
  height: 32,
  borderRadius: "50%",
  cursor: "pointer",
  fontWeight: 700,
};

const miniMediaBtn: React.CSSProperties = {
  border: "none",
  background: "#f0f2f5",
  width: 36,
  height: 36,
  borderRadius: "50%",
  cursor: "pointer",
  fontSize: 16,
};

const actionBtn: React.CSSProperties = {
  border: "none",
  background: "transparent",
  padding: "10px 0",
  color: "#65676b",
  fontWeight: 600,
  fontSize: 15,
  borderRadius: 6,
  cursor: "pointer",
};

const smallBtn: React.CSSProperties = {
  border: "none",
  background: "#e4e6eb",
  padding: "8px 10px",
  borderRadius: 6,
  cursor: "pointer",
  fontWeight: 600,
};

const textBtn: React.CSSProperties = {
  border: "none",
  background: "transparent",
  color: "#65676b",
  cursor: "pointer",
  padding: 0,
  fontWeight: 600,
  fontSize: 12,
};

const menuItemStyle: React.CSSProperties = {
  display: "block",
  width: "100%",
  textAlign: "left",
  border: "none",
  background: "transparent",
  padding: "12px 14px",
  fontWeight: 700,
  fontSize: 14,
  cursor: "pointer",
};
