import { prisma } from "@/lib/prisma";
import {
  currentWeekDates,
  formatLiturgicalTitle,
  isLiturgicalSunday,
  liturgicalSeasonLabel,
  nextSundayDates,
  sundaysOfLiturgicalYear,
  upcomingWeekdayDates,
} from "@/lib/liturgicalTitle";
import { dateAtMidnight, dateAtNoon, dateKey, dayRange } from "@/lib/datetime";

export { dateAtMidnight, dateAtNoon, dateKey } from "@/lib/datetime";

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

export async function findReadingByIso(isoDate: string) {
  const { start, end } = dayRange(isoDate);
  // Couvre minuit Kinshasa + anciennes lignes stockées à midi UTC
  return prisma.dailyReading.findFirst({
    where: { date: { gte: start, lte: end } },
    orderBy: { date: "asc" },
  });
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

  const existing = await findReadingByIso(isoDate);
  if (existing) {
    return prisma.dailyReading.update({
      where: { id: existing.id },
      data: {
        ...payload,
        // Normalise l’heure d’apparition au journal : 00h00 Kinshasa
        date: dateAtMidnight(isoDate),
      },
    });
  }

  return prisma.dailyReading.create({
    data: { date: dateAtMidnight(isoDate), ...payload },
  });
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

/** Importe les dimanches d’une année liturgique (par lots pour éviter les timeouts). */
export async function syncLiturgicalYearSundays(
  letter: "A" | "B" | "C" = "B",
  opts?: { offset?: number; limit?: number }
) {
  const { dates, adventYear, startIso, endIso } = sundaysOfLiturgicalYear(letter);
  const offset = Math.max(0, opts?.offset ?? 0);
  const limit = Math.min(12, Math.max(1, opts?.limit ?? 8));
  const slice = dates.slice(offset, offset + limit);
  const readings = [];
  for (const iso of slice) {
    readings.push(await syncDailyReadingFromAelf(iso));
  }
  const nextOffset = offset + slice.length;
  return {
    letter,
    adventYear,
    startIso,
    endIso,
    total: dates.length,
    offset,
    nextOffset,
    done: nextOffset >= dates.length,
    readings,
  };
}

/** Prépare les messes de la semaine à venir (lun–sam). */
export async function syncUpcomingWeekdays(count = 12) {
  const dates = upcomingWeekdayDates(count);
  const readings = [];
  for (const iso of dates) {
    readings.push(await syncDailyReadingFromAelf(iso));
  }
  return readings;
}

export async function getOrSyncReading(isoDate = dateKey()) {
  const existing = await findReadingByIso(isoDate);
  if (existing) {
    // Anciennes lectures à midi UTC → ramener à 00h00 Kinshasa
    const target = dateAtMidnight(isoDate).getTime();
    if (existing.date.getTime() !== target) {
      try {
        return await prisma.dailyReading.update({
          where: { id: existing.id },
          data: { date: dateAtMidnight(isoDate) },
        });
      } catch {
        return existing;
      }
    }
    return existing;
  }
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
