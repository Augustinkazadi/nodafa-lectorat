import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { randomUUID } from "crypto";
import { put } from "@vercel/blob";
import { detectMediaKind, type MediaKind } from "@/lib/media";

export type { MediaKind };
export { detectMediaKind };

const MAX_BYTES: Record<MediaKind, number> = {
  IMAGE: 8 * 1024 * 1024,
  VIDEO: 80 * 1024 * 1024,
  PDF: 20 * 1024 * 1024,
  AUDIO: 15 * 1024 * 1024,
};

function extensionFor(file: File, kind: MediaKind): string {
  const fromName = path.extname(file.name || "");
  if (fromName) return fromName.toLowerCase();
  if (kind === "IMAGE") return ".jpg";
  if (kind === "VIDEO") return ".mp4";
  if (kind === "PDF") return ".pdf";
  if (kind === "AUDIO") return ".webm";
  return ".bin";
}

export function usesBlobStorage() {
  return Boolean(process.env.BLOB_READ_WRITE_TOKEN);
}

export async function saveUploadedFile(file: File, allowed: MediaKind[]) {
  const kind = detectMediaKind(file.type, file.name);
  if (!kind || !allowed.includes(kind)) {
    throw new Error(`Type de fichier non autorisé. Formats : ${allowed.join(", ")}`);
  }
  if (file.size > MAX_BYTES[kind]) {
    throw new Error(`Fichier trop volumineux pour un ${kind}`);
  }

  const bytes = await file.arrayBuffer();
  const buffer = Buffer.from(bytes);
  const filename = `nodafa/${Date.now()}-${randomUUID()}${extensionFor(file, kind)}`;
  const mimeType = file.type || "application/octet-stream";

  if (usesBlobStorage()) {
    const blob = await put(filename, buffer, {
      access: "public",
      contentType: mimeType,
      addRandomSuffix: false,
    });
    return {
      url: blob.url,
      name: file.name,
      mediaType: kind,
      mimeType,
      size: file.size,
    };
  }

  const localName = path.basename(filename);
  const dir = path.join(process.cwd(), "public", "uploads");
  await mkdir(dir, { recursive: true });
  await writeFile(path.join(dir, localName), buffer);

  return {
    url: `/uploads/${localName}`,
    name: file.name,
    mediaType: kind,
    mimeType,
    size: file.size,
  };
}
