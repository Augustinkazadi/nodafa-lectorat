/** Considéré en ligne si activité dans les 2 dernières minutes */
export const ONLINE_WINDOW_MS = 2 * 60 * 1000;

export function isUserOnline(lastSeenAt?: Date | string | null, now = Date.now()) {
  if (!lastSeenAt) return false;
  const t = new Date(lastSeenAt).getTime();
  if (Number.isNaN(t)) return false;
  return now - t <= ONLINE_WINDOW_MS;
}

export function presenceLabel(lastSeenAt?: Date | string | null, now = Date.now()) {
  if (isUserOnline(lastSeenAt, now)) return "En ligne";
  if (!lastSeenAt) return "Hors ligne";
  const t = new Date(lastSeenAt).getTime();
  const diff = Math.max(0, now - t);
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `Vu il y a ${Math.max(1, mins)} min`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `Vu il y a ${hours} h`;
  const days = Math.floor(hours / 24);
  return `Vu il y a ${days} j`;
}
