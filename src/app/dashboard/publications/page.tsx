"use client";

import { useRef, useState } from "react";
import AdminShell from "@/components/AdminShell";
import { uploadMediaFile } from "@/lib/clientUpload";

export default function AdminPublicationsPage() {
  const fileRef = useRef<HTMLInputElement>(null);
  const photoRef = useRef<HTMLInputElement>(null);
  const [content, setContent] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [status, setStatus] = useState("");
  const [publishing, setPublishing] = useState(false);

  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoNote, setPhotoNote] = useState("");
  const [photoStatus, setPhotoStatus] = useState("");
  const [photoPublishing, setPhotoPublishing] = useState(false);

  const publishFile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim() && !file) return;
    setPublishing(true);
    setStatus("Publication...");
    try {
      let mediaUrl: string | undefined;
      let mediaType: string | undefined;
      let mediaName: string | undefined;
      if (file) {
        const uploaded = await uploadMediaFile(file, "post");
        mediaUrl = uploaded.url;
        mediaType = uploaded.mediaType;
        mediaName = uploaded.name;
      }
      const res = await fetch("/api/posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content,
          mediaUrl,
          mediaType,
          mediaName,
          image: mediaType === "IMAGE" ? mediaUrl : null,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || "Erreur");
      }
      setStatus("✅ Fichier / publication envoyé(e) dans le journal");
      setContent("");
      setFile(null);
      if (fileRef.current) fileRef.current.value = "";
    } catch (err: any) {
      setStatus("❌ " + (err.message || "Erreur"));
    } finally {
      setPublishing(false);
    }
  };

  const publishReadingPhoto = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!photoFile) return;
    setPhotoPublishing(true);
    setPhotoStatus("Envoi de la photo...");
    try {
      const uploaded = await uploadMediaFile(photoFile, "post");
      // Attache la photo à la lecture du jour + publie aussi dans le journal
      const todayRes = await fetch("/api/lectures/today?sync=1");
      const today = todayRes.ok ? await todayRes.json() : null;

      if (today?.id) {
        await fetch("/api/lectures", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: today.id, image: uploaded.url }),
        });
      }

      const res = await fetch("/api/posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: photoNote || `📖 Photo de lecture — ${today?.title || "Lecture du jour"}`,
          mediaUrl: uploaded.url,
          mediaType: "IMAGE",
          mediaName: uploaded.name,
          image: uploaded.url,
        }),
      });
      if (!res.ok) throw new Error("Publication journal échouée");

      setPhotoStatus("✅ Photo de lecture publiée");
      setPhotoNote("");
      setPhotoFile(null);
      if (photoRef.current) photoRef.current.value = "";
    } catch (err: any) {
      setPhotoStatus("❌ " + (err.message || "Erreur"));
    } finally {
      setPhotoPublishing(false);
    }
  };

  return (
    <AdminShell>
      <h1 style={{ margin: "0 0 8px", fontFamily: "var(--font-display)", fontSize: 30 }}>Publications</h1>
      <p style={{ margin: "0 0 16px", color: "#64748b" }}>
        Publiez des fichiers pour le journal et des photos de lecture.
      </p>

      <div className="admin-panel">
        <h2>📤 Publication de fichier</h2>
        <form className="admin-form-grid" onSubmit={publishFile}>
          <textarea
            placeholder="Texte d'accompagnement (optionnel)"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            rows={4}
          />
          <input
            ref={fileRef}
            type="file"
            accept="image/*,video/*,application/pdf,.pdf"
            onChange={(e) => setFile(e.target.files?.[0] || null)}
          />
          {file && <div style={{ color: "#64748b", fontSize: 14 }}>Fichier : {file.name}</div>}
          <button type="submit" className="nodafa-btn nodafa-btn-primary" disabled={publishing || (!content.trim() && !file)}>
            {publishing ? "Publication..." : "Publier dans le journal"}
          </button>
        </form>
        {status && <p style={{ marginTop: 12, fontWeight: 700 }}>{status}</p>}
      </div>

      <div className="admin-panel">
        <h2>📸 Photo de lecture</h2>
        <p style={{ marginTop: 0, color: "#64748b", fontSize: 14 }}>
          Ajoute une image à la lecture du jour et la publie aussi dans le journal communautaire.
        </p>
        <form className="admin-form-grid" onSubmit={publishReadingPhoto}>
          <textarea
            placeholder="Légende (optionnel)"
            value={photoNote}
            onChange={(e) => setPhotoNote(e.target.value)}
            rows={3}
          />
          <input
            ref={photoRef}
            type="file"
            accept="image/*"
            required
            onChange={(e) => setPhotoFile(e.target.files?.[0] || null)}
          />
          {photoFile && <div style={{ color: "#64748b", fontSize: 14 }}>Photo : {photoFile.name}</div>}
          <button type="submit" className="nodafa-btn nodafa-btn-primary" style={{ background: "#0f766e" }} disabled={photoPublishing || !photoFile}>
            {photoPublishing ? "Publication..." : "Publier la photo de lecture"}
          </button>
        </form>
        {photoStatus && <p style={{ marginTop: 12, fontWeight: 700 }}>{photoStatus}</p>}
      </div>
    </AdminShell>
  );
}
