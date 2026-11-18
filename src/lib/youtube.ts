export function extractYoutubeId(url?: string | null) {
  if (!url) return null;
  const match = String(url).match(
    /(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|live\/|shorts\/)|v=|\/)([\w-]{11})/
  );
  return match ? match[1] : null;
}

export function youtubeEmbedUrl(url?: string | null) {
  const id = extractYoutubeId(url);
  return id ? `https://www.youtube.com/embed/${id}?autoplay=1&rel=0` : null;
}
