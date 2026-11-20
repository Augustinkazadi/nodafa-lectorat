import { dateKey } from "@/lib/datetime";

/** Titres clairs pour le lectorat (temps + année A/B/C, sans mention du psautier). */

export type AelfInformations = {
  date?: string;
  annee?: string;
  jour?: string;
  temps_liturgique?: string;
  semaine?: string | null;
  jour_liturgique_nom?: string;
  ligne1?: string;
  ligne2?: string;
  ligne3?: string;
  fete?: string;
  degre?: string;
};

const SEASON_LABELS: Record<string, string> = {
  ordinaire: "Temps Ordinaire",
  avent: "Temps de l'Avent",
  careme: "Temps du Carême",
  "carême": "Temps du Carême",
  paques: "Temps pascal",
  "pâques": "Temps pascal",
  noel: "Temps de Noël",
  "noël": "Temps de Noël",
};

export function liturgicalSeasonLabel(temps?: string | null) {
  if (!temps) return null;
  const key = String(temps).trim().toLowerCase();
  if (SEASON_LABELS[key]) return SEASON_LABELS[key];
  // déjà en français lisible
  if (/temps/i.test(temps)) return temps;
  return temps.charAt(0).toUpperCase() + temps.slice(1);
}

function cleanBaseTitle(raw: string) {
  return raw
    .replace(/\s*\(semaine\s+[IVXLC0-9]+[^)]*\)/gi, "")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeChristRoi(title: string) {
  if (/Christ\s*Roi/i.test(title) || /Roi de l['’]?Univers/i.test(title)) {
    return "Dimanche du Christ Roi de l'univers";
  }
  return title;
}

export function isLiturgicalSunday(info: AelfInformations, isoDate?: string) {
  const jour = String(info.jour || "").toLowerCase();
  if (jour === "dimanche") return true;
  const name = `${info.ligne1 || ""} ${info.jour_liturgique_nom || ""}`;
  if (/dimanche/i.test(name) || /Christ\s*Roi/i.test(name)) return true;
  if (isoDate) {
    const d = new Date(`${isoDate}T12:00:00.000Z`);
    if (!Number.isNaN(d.getTime()) && d.getUTCDay() === 0) return true;
  }
  return false;
}

/**
 * Ex. "33ème dimanche du Temps Ordinaire — année liturgique A"
 * Ex. "Dimanche du Christ Roi de l'univers — Temps Ordinaire, année A"
 * Ex. "1er Dimanche de l'Avent — année liturgique B"
 */
export function formatLiturgicalTitle(info: AelfInformations, isoDate?: string) {
  const year = String(info.annee || "").toUpperCase();
  const season = liturgicalSeasonLabel(info.temps_liturgique);
  let title = cleanBaseTitle(
    String(info.ligne1 || info.jour_liturgique_nom || info.fete || "").trim()
  );
  title = normalizeChristRoi(title);

  if (!title) {
    title = isoDate ? `Lectures du ${isoDate}` : "Lecture liturgique";
  }

  const sunday = isLiturgicalSunday(info, isoDate);
  const alreadyHasYear = /année\s+liturgique/i.test(title);
  const temps = String(info.temps_liturgique || "").toLowerCase();
  const isOrdinary = temps === "ordinaire" || /Temps Ordinaire/i.test(title);

  const titleHasSeasonHint =
    /Temps Ordinaire|Avent|Carême|Pascal|Noël|Christ Roi/i.test(title) ||
    (season ? new RegExp(season.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i").test(title) : false);

  if (sunday && ["A", "B", "C"].includes(year) && !alreadyHasYear) {
    if (isOrdinary || titleHasSeasonHint) {
      return `${title} — année liturgique ${year}`;
    }
    if (season) return `${title} — ${season}, année liturgique ${year}`;
    return `${title} — année liturgique ${year}`;
  }

  // Jours de semaine : préciser le temps + l'année
  if (!sunday && ["A", "B", "C"].includes(year) && !alreadyHasYear) {
    if (titleHasSeasonHint) return `${title} — année liturgique ${year}`;
    if (season) return `${title} — ${season}, année liturgique ${year}`;
  }

  return title;
}

/** Phrase d’état : « Nous sommes actuellement en Temps Ordinaire — année liturgique A » */
export function currentLiturgicalBanner(info: {
  liturgicalSeason?: string | null;
  liturgicalYear?: string | null;
  title?: string | null;
}) {
  const season = info.liturgicalSeason || null;
  const year = info.liturgicalYear ? String(info.liturgicalYear).toUpperCase() : null;
  if (season && year) return `Nous sommes actuellement en ${season} — année liturgique ${year}`;
  if (season) return `Nous sommes actuellement en ${season}`;
  if (year) return `Année liturgique ${year}`;
  return null;
}

function toIsoUtc(d: Date) {
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const dayNum = String(d.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${dayNum}`;
}

function kinshasaAnchor(from = new Date()) {
  const iso = dateKey(from);
  return new Date(`${iso}T12:00:00.000Z`);
}

export function nextSundayDates(count = 6, from = new Date()) {
  const dates: string[] = [];
  const d = kinshasaAnchor(from);
  const day = d.getUTCDay();
  const add = day === 0 ? 0 : 7 - day;
  d.setUTCDate(d.getUTCDate() + add);
  for (let i = 0; i < count; i++) {
    dates.push(toIsoUtc(d));
    d.setUTCDate(d.getUTCDate() + 7);
  }
  return dates;
}

/** Lundi → dimanche de la semaine liturgique courante (fuseau Kinshasa). */
export function currentWeekDates(from = new Date()) {
  const d = kinshasaAnchor(from);
  const day = d.getUTCDay(); // 0=dimanche
  const mondayOffset = day === 0 ? -6 : 1 - day;
  d.setUTCDate(d.getUTCDate() + mondayOffset);
  const dates: string[] = [];
  for (let i = 0; i < 7; i++) {
    dates.push(toIsoUtc(d));
    d.setUTCDate(d.getUTCDate() + 1);
  }
  return dates;
}
