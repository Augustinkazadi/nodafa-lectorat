"use client";

import { upload } from "@vercel/blob/client";
import { detectMediaKind, type MediaKind } from "@/lib/media";

export type UploadedMedia = {
  url: string;
  name: string;
  mediaType: MediaKind;
};

let cachedMode: "blob" | "local" | null = null;

async function getUploadMode() {
  if (cachedMode) return cachedMode;
  try {
    const res = await fetch("/api/upload");
    if (res.ok) {
      const data = await res.json();
      cachedMode = data.mode === "blob" ? "blob" : "local";
      return cachedMode;
    }
  } catch {
    /* ignore */
  }
  cachedMode = "local";
  return cachedMode;
}

export async function uploadMediaFile(
  file: File,
  scope: "post" | "message" = "post"
): Promise<UploadedMedia> {
  const kind = detectMediaKind(file.type, file.name);
  if (!kind) throw new Error("Type de fichier non autorisé");

  const mode = await getUploadMode();

  if (mode === "blob") {
    const blob = await upload(`nodafa/${Date.now()}-${file.name}`, file, {
      access: "public",
      handleUploadUrl: "/api/upload",
    });
    return { url: blob.url, name: file.name, mediaType: kind };
  }

  const formData = new FormData();
  formData.append("file", file);
  formData.append("scope", scope);
  const res = await fetch("/api/upload", { method: "POST", body: formData });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || "Upload échoué");
  return {
    url: data.url,
    name: data.name || file.name,
    mediaType: data.mediaType || kind,
  };
}
