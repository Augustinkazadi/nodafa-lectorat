"use client";
import { useState, useRef } from "react";
import { signOut } from "next-auth/react";
import Link from "next/link";

export default function DashboardPage() {
  // Formulaire Live
  const [liveTitle, setLiveTitle] = useState("");
  const [liveUrl, setLiveUrl] = useState("");
  const [status, setStatus] = useState("");

  // Upload fichier
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadedFile, setUploadedFile] = useState<{ url: string; name: string } | null>(null);
  const [postContent, setPostContent] = useState("");
  const [uploadStatus, setUploadStatus] = useState("");

  // Formulaire lecture
  const [lectureTitle, setLectureTitle] = useState("");
  const [lectureGospel, setLectureGospel] = useState("");
  const [lectureDate, setLectureDate] = useState("");
  const [lectureStatus, setLectureStatus] = useState("");

  // Lancer un live
  const handleLaunchLive = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus("Lancement...");
    const res = await fetch("/api/lives", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: liveTitle, youtubeUrl: liveUrl }),
    });
    if (res.ok) {
      setStatus("✅ Live lancé !");
      setLiveTitle(""); setLiveUrl("");
    } else {
      const data = await res.json();
      setStatus("❌ " + (data.message || "Erreur"));
    }
  };

  // Upload fichier et publier
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setUploadedFile({ url: reader.result as string, name: file.name });
      };
      reader.readAsDataURL(file);
    }
  };

  const handlePublishWithFile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!postContent && !uploadedFile) return;
    setUploadStatus("Publication...");
    const res = await fetch("/api/posts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: postContent, image: uploadedFile?.url }),
    });
    if (res.ok) {
      setUploadStatus("✅ Publié !");
      setPostContent("");
      setUploadedFile(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
    } else {
      setUploadStatus("❌ Erreur");
    }
  };

  // Ajouter une lecture
  const handleAddLecture = async (e: React.FormEvent) => {
    e.preventDefault();
    setLectureStatus("Ajout...");
    const res = await fetch("/api/lectures", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: lectureTitle,
        gospel: lectureGospel,
        date: lectureDate,
      }),
    });
    if (res.ok) {
      setLectureStatus("✅ Lecture ajoutée !");
      setLectureTitle(""); setLectureGospel(""); setLectureDate("");
    } else {
      const data = await res.json();
      setLectureStatus("❌ " + (data.message || "Erreur"));
    }
  };

  return (
    <div style={{ padding: "40px", fontFamily: "Arial", background: "#f8fafc", minHeight: "100vh" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "40px" }}>
        <h1 style={{ color: "#0f172a" }}>⚙️ Panneau d'Administration</h1>
        <div style={{ display: "flex", gap: "15px" }}>
          <Link href="/journal" style={{ padding: "10px 20px", background: "#1877f2", color: "white", borderRadius: "8px", textDecoration: "none", fontWeight: "bold" }}>Retour au Journal</Link>
          <button onClick={() => signOut({ callbackUrl: "/login" })} style={{ padding: "10px 20px", background: "#e2e8f0", border: "none", borderRadius: "8px", fontWeight: "bold", cursor: "pointer" }}>Déconnexion</button>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "30px" }}>
        
        {/* Colonne 1 : Live + Upload */}
        <div>
          {/* Formulaire Live */}
          <div style={{ background: "white", padding: "30px", borderRadius: "12px", boxShadow: "0 4px 6px rgba(0,0,0,0.05)", marginBottom: "30px" }}>
            <h2 style={{ color: "#dc2626" }}>🔴 Lancer un Live</h2>
            <form onSubmit={handleLaunchLive}>
              <input type="text" placeholder="Titre du live" value={liveTitle} onChange={e => setLiveTitle(e.target.value)} required style={inputStyle} />
              <input type="url" placeholder="Lien YouTube" value={liveUrl} onChange={e => setLiveUrl(e.target.value)} required style={inputStyle} />
              <button type="submit" style={{ width: "100%", padding: "12px", background: "#dc2626", color: "white", border: "none", borderRadius: "8px", fontWeight: "bold", cursor: "pointer" }}>Diffuser maintenant</button>
            </form>
            {status && <p style={{ marginTop: "15px", fontWeight: "bold", color: status.includes("✅") ? "green" : "red" }}>{status}</p>}
          </div>

          {/* Upload & Publier */}
          <div style={{ background: "white", padding: "30px", borderRadius: "12px", boxShadow: "0 4px 6px rgba(0,0,0,0.05)" }}>
            <h2 style={{ color: "#10b981" }}>📤 Publier un fichier</h2>
            <form onSubmit={handlePublishWithFile}>
              <textarea placeholder="Texte d'accompagnement (optionnel)" value={postContent} onChange={e => setPostContent(e.target.value)} style={{ ...inputStyle, minHeight: "80px" }} />
              <input type="file" ref={fileInputRef} onChange={handleFileChange} accept=".pdf,.doc,.docx,.png,.jpg,.jpeg,.gif" style={{ marginBottom: "15px" }} />
              {uploadedFile && <p style={{ fontSize: "14px", color: "#64748b" }}>Fichier sélectionné : {uploadedFile.name}</p>}
              <button type="submit" style={{ width: "100%", padding: "12px", background: "#10b981", color: "white", border: "none", borderRadius: "8px", fontWeight: "bold", cursor: "pointer" }}>Publier dans le Journal</button>
            </form>
            {uploadStatus && <p style={{ marginTop: "15px", fontWeight: "bold", color: uploadStatus.includes("✅") ? "green" : "red" }}>{uploadStatus}</p>}
          </div>
        </div>

        {/* Colonne 2 : Lectures du jour */}
        <div style={{ background: "white", padding: "30px", borderRadius: "12px", boxShadow: "0 4px 6px rgba(0,0,0,0.05)" }}>
          <h2 style={{ color: "#f59e0b" }}>📖 Ajouter une Lecture</h2>
          <form onSubmit={handleAddLecture}>
            <input type="text" placeholder="Titre (ex: Dimanche de la Pentecôte)" value={lectureTitle} onChange={e => setLectureTitle(e.target.value)} required style={inputStyle} />
            <input type="date" value={lectureDate} onChange={e => setLectureDate(e.target.value)} required style={inputStyle} />
            <textarea placeholder="Évangile du jour" value={lectureGospel} onChange={e => setLectureGospel(e.target.value)} required style={{ ...inputStyle, minHeight: "100px" }} />
            <button type="submit" style={{ width: "100%", padding: "12px", background: "#f59e0b", color: "white", border: "none", borderRadius: "8px", fontWeight: "bold", cursor: "pointer" }}>Ajouter la Lecture</button>
          </form>
          {lectureStatus && <p style={{ marginTop: "15px", fontWeight: "bold", color: lectureStatus.includes("✅") ? "green" : "red" }}>{lectureStatus}</p>}
        </div>

      </div>
    </div>
  );
}

const inputStyle = { width: "100%", padding: "12px", marginBottom: "15px", borderRadius: "8px", border: "1px solid #ccc", fontSize: "15px", boxSizing: "border-box" as const };