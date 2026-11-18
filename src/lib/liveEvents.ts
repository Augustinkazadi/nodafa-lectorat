export const LIVE_EVENT_TYPES = [
  { value: "fete", label: "Fête", emoji: "🎉" },
  { value: "excursion", label: "Excursion", emoji: "🚌" },
  { value: "amitie", label: "Journée d’amitié", emoji: "🤝" },
  { value: "messe", label: "Messe / Célébration", emoji: "⛪" },
  { value: "autre", label: "Autre événement", emoji: "📡" },
] as const;

export type LiveEventType = (typeof LIVE_EVENT_TYPES)[number]["value"];

export function liveEventLabel(type?: string | null) {
  const found = LIVE_EVENT_TYPES.find((t) => t.value === type);
  return found ? `${found.emoji} ${found.label}` : "📡 Événement";
}
