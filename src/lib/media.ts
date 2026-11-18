export type MediaKind = "IMAGE" | "VIDEO" | "PDF" | "AUDIO";

export function detectMediaKind(mime: string, fileName = ""): MediaKind | null {
  const lower = (fileName || "").toLowerCase();
  const mimeLower = (mime || "").toLowerCase();

  if (mimeLower.startsWith("image/") || /\.(jpe?g|png|gif|webp)$/.test(lower)) {
    return "IMAGE";
  }

  // Notes vocales / audio : AVANT la détection vidéo (sinon .webm devient VIDEO)
  if (
    mimeLower.startsWith("audio/") ||
    /vocal[-_]/i.test(lower) ||
    /\.(mp3|m4a|wav|aac)$/.test(lower) ||
    (lower.endsWith(".webm") && (mimeLower.includes("audio") || /vocal/i.test(lower))) ||
    (lower.endsWith(".ogg") && mimeLower.startsWith("audio/"))
  ) {
    return "AUDIO";
  }

  if (mimeLower.startsWith("video/") || /\.(mp4|mov|webm|ogg)$/.test(lower)) {
    return "VIDEO";
  }

  if (mimeLower === "application/pdf" || lower.endsWith(".pdf")) {
    return "PDF";
  }

  return null;
}

/** Corrige les anciens messages audio mal classés en VIDEO */
export function resolveMessageMediaType(msg: {
  mediaType?: string | null;
  mediaName?: string | null;
  mediaUrl?: string | null;
}): string | null {
  const type = msg.mediaType || null;
  const name = (msg.mediaName || msg.mediaUrl || "").toLowerCase();
  if (type === "AUDIO") return "AUDIO";
  if (type === "VIDEO" && (/vocal/i.test(name) || name.includes("audio"))) return "AUDIO";
  return type;
}
