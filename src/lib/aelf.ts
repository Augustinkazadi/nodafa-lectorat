import { prisma } from "@/lib/prisma";
import {
  currentWeekDates,
  formatLiturgicalTitle,
  isLiturgicalSunday,
  liturgicalSeasonLabel,
  nextSundayDates,
} from "@/lib/liturgicalTitle";

const ZONE = process.env.AELF_ZONE || "afrique";

function stripHtml(html = "") {
  return html
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&rsquo;/g, "'")
    .replace(/&lsquo;/g, "'")
    .replace(/&oelig;/g, "oe")
    .replace(/&#8217;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function formatBlock(lecture: any) {
  if (!lecture) return null;
  const parts = [
    lecture.intro_lue ? stripHtml(lecture.intro_lue) : "",
    lecture.ref ? `(${lecture.ref})` : "",
    lecture.titre ? stripHtml(lecture.titre) : "",
    lecture.verset_evangile ? stripHtml(lecture.verset_evangile) : "",
    lecture.refrain_psalmique ? `Refrain : ${stripHtml(lecture.refrain_psalmique)}` : "",
    stripHtml(lecture.contenu || ""),
  ].filter(Boolean);
  return parts.join("\n\n") || null;
}

export function dateKey(d = new Date()) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function dateAtNoon(isoDate: string) {
  return new Date(`${isoDate}T12:00:00.000Z`);
}

export async function fetchAelfMesse(isoDate: string) {
  const url = `https://api.aelf.org/v1/messes/${isoDate}/${ZONE}`;
  const res = await fetch(url, {
    headers: { Accept: "application/json" },
    next: { revalidate: 3600 },
  });
  if (!res.ok) throw new Error(`AELF indisponible (${res.status})`);
  return res.json();
}

export async function syncDailyReadingFromAelf(isoDate = dateKey()) {
  const data = await fetchAelfMesse(isoDate);
  const info = data.informations || {};
  const messe = (data.messes || [])[0];
  const lectures = messe?.lectures || [];

  const byType = (type: string) => lectures.find((l: any) => l.type === type);

  const first = byType("lecture_1");
  const second = byType("lecture_2");
  const psalm = byType("psaume");
  const gospel = byType("evangile");

  const title = formatLiturgicalTitle(info, isoDate);
  const year = String(info.annee || "").toUpperCase();
  const liturgicalYear = ["A", "B", "C"].includes(year) ? year : null;
  const liturgicalSeason = liturgicalSeasonLabel(info.temps_liturgique);
  const sunday = isLiturgicalSunday(info, isoDate);

  const gospelText = formatBlock(gospel) || "Évangile non disponible";
  const color = info.couleur || info.couleur2 || null;

  const extraLines = [info.ligne2, info.ligne3, info.semaine].filter(Boolean).join(" · ");

  const payload = {
    title: String(title),
    firstReading: formatBlock(first),
    psalm: formatBlock(psalm),
    secondReading: formatBlock(second),
    gospel: gospelText,
    liturgicalColor: color ? String(color) : null,
    commentary: extraLines || null,
    source: "aelf",
    liturgicalYear,
    liturgicalSeason,
    isSunday: sunday,
  };

  const date = dateAtNoon(isoDate);

  const reading = await prisma.dailyReading.upsert({
    where: { date },
    create: { date, ...payload },
    update: {
      ...payload,
      // ne pas écraser une image ajoutée manuellement par l'admin
    },
  });

  return reading;
}

export async function syncUpcomingSundays(count = 6) {
  const dates = nextSundayDates(count);
  const readings = [];
  for (const iso of dates) {
    readings.push(await syncDailyReadingFromAelf(iso));
  }
  return readings;
}

/** Publie lun–dim de la semaine en cours → visibles dans le journal chaque jour. */
export async function syncCurrentWeek() {
  const dates = currentWeekDates();
  const readings = [];
  for (const iso of dates) {
    readings.push(await syncDailyReadingFromAelf(iso));
  }
  return readings;
}

export async function getOrSyncReading(isoDate = dateKey()) {
  const date = dateAtNoon(isoDate);
  const existing = await prisma.dailyReading.findUnique({ where: { date } });
  if (existing) return existing;
  try {
    return await syncDailyReadingFromAelf(isoDate);
  } catch (error) {
    console.error("Sync AELF échouée:", error);
    return null;
  }
}

export async function getOrSyncTodayReading() {
  return getOrSyncReading(dateKey());
}
