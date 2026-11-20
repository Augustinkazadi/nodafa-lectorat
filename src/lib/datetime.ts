/** Fuseau paroisse Notre-Dame de Fatima – Gombe (Kinshasa, UTC+1 toute l’année). */
export const APP_TZ = "Africa/Kinshasa";

/** YYYY-MM-DD dans le fuseau Kinshasa. */
export function dateKey(d = new Date()) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: APP_TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(d);
}

/** Minuit Kinshasa pour un jour liturgique YYYY-MM-DD. */
export function dateAtMidnight(isoDate: string) {
  return new Date(`${isoDate}T00:00:00+01:00`);
}

export function dateAtDayEnd(isoDate: string) {
  return new Date(`${isoDate}T23:59:59.999+01:00`);
}

/** Ancienne clé (midi UTC) — encore présente en base pour certaines lectures. */
export function dateAtNoon(isoDate: string) {
  return new Date(`${isoDate}T12:00:00.000Z`);
}

export function dayRange(isoDate: string) {
  return {
    start: dateAtMidnight(isoDate),
    end: dateAtDayEnd(isoDate),
  };
}

export function formatAppDateTime(value: string | Date) {
  return new Date(value).toLocaleString("fr-FR", {
    timeZone: APP_TZ,
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatAppDate(value: string | Date) {
  return new Date(value).toLocaleDateString("fr-FR", {
    timeZone: APP_TZ,
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function formatAppTime(value: string | Date) {
  return new Date(value).toLocaleTimeString("fr-FR", {
    timeZone: APP_TZ,
    hour: "2-digit",
    minute: "2-digit",
  });
}
