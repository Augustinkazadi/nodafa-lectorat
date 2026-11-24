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

/** 1er dimanche de l’Avent = dimanche entre le 27 nov. et le 3 déc. */
export function adventStartIso(civilYear: number) {
  for (let day = 27; day <= 33; day++) {
    const monthIndex = day <= 30 ? 10 : 11; // nov / déc
    const dayNum = day <= 30 ? day : day - 30;
    const d = new Date(Date.UTC(civilYear, monthIndex, dayNum, 12));
    if (d.getUTCDay() === 0) return toIsoUtc(d);
  }
  throw new Error(`Avent introuvable pour ${civilYear}`);
}

/** Advent 2023 = B, 2024 = C, 2025 = A, 2026 = B… */
export function liturgicalLetterAtAdvent(civilYear: number): "A" | "B" | "C" {
  const cycle: Array<"A" | "B" | "C"> = ["B", "C", "A"];
  return cycle[((civilYear - 2023) % 3 + 3) % 3];
}

/** Tous les dimanches d’une année liturgique (A/B/C), du 1er Avent au samedi avant le suivant. */
export function sundaysOfLiturgicalYear(letter: "A" | "B" | "C" = "B", around = new Date()) {
  const aroundIso = dateKey(around);
  let startYear: number | null = null;
  let upcomingYear: number | null = null;

  for (let cy = around.getFullYear() - 1; cy <= around.getFullYear() + 2; cy++) {
    if (liturgicalLetterAtAdvent(cy) !== letter) continue;
    const start = adventStartIso(cy);
    const end = adventStartIso(cy + 1);
    if (aroundIso >= start && aroundIso < end) {
      startYear = cy;
      break;
    }
    if (aroundIso < start && upcomingYear === null) upcomingYear = cy;
  }

  const year = startYear ?? upcomingYear ?? around.getFullYear();
  const startIso = adventStartIso(year);
  const endIso = adventStartIso(year + 1);
  const dates: string[] = [];
  const d = new Date(`${startIso}T12:00:00.000Z`);
  const end = new Date(`${endIso}T12:00:00.000Z`);
  while (d < end) {
    dates.push(toIsoUtc(d));
    d.setUTCDate(d.getUTCDate() + 7);
  }
  return { letter, adventYear: year, startIso, endIso, dates };
}

/** Jours de semaine (lun–sam) à venir, pour garder la liste à jour. */
export function upcomingWeekdayDates(count = 14, from = new Date()) {
  const dates: string[] = [];
  const d = kinshasaAnchor(from);
  while (dates.length < count) {
    if (d.getUTCDay() !== 0) dates.push(toIsoUtc(d));
    d.setUTCDate(d.getUTCDate() + 1);
  }
  return dates;
}
