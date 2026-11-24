import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../../auth/[...nextauth]/route";
import {
  dateKey,
  syncCurrentWeek,
  syncDailyReadingFromAelf,
  syncLiturgicalYearSundays,
  syncUpcomingSundays,
  syncUpcomingWeekdays,
} from "@/lib/aelf";

function authorized(req: Request, session: any, allowMember = false) {
  const cronSecret = process.env.CRON_SECRET;
  const authHeader = req.headers.get("authorization");
  if (cronSecret && authHeader === `Bearer ${cronSecret}`) return true;
  if (req.headers.get("x-vercel-cron") === "1") return true;
  if ((session?.user as any)?.role === "ADMIN") return true;
  if (allowMember && session?.user) return true;
  return false;
}

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!authorized(req, session)) {
      return NextResponse.json({ message: "Non autorisé" }, { status: 401 });
    }
    const { searchParams } = new URL(req.url);
    const date = searchParams.get("date") || dateKey();
    const reading = await syncDailyReadingFromAelf(date);
    return NextResponse.json({ message: "Lecture synchronisée", reading });
  } catch (error: any) {
    console.error(error);
    return NextResponse.json({ message: error?.message || "Erreur sync" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    const body = await req.json().catch(() => ({}));
    const mode = String(body.mode || "").toLowerCase();
    const memberModes = new Set(["year-b", "year-b-sundays", "liturgical-year", "weekdays-upcoming", "date"]);
    if (!authorized(req, session, memberModes.has(mode))) {
      return NextResponse.json({ message: "Non autorisé" }, { status: 401 });
    }

    // Prépare les textes en base (le journal n’affiche que le jour J)
    if (mode === "week" || mode === "current-week" || body.currentWeek) {
      const readings = await syncCurrentWeek();
      return NextResponse.json({
        message: `${readings.length} jours préparés — le journal n’affiche que le jour en cours, un par un`,
        readings,
      });
    }

    // Dimanches à venir = liste de préparation (page Lecture)
    if (mode === "sundays" || mode === "upcoming-sundays" || body.upcomingSundays) {
      const count = Math.min(12, Math.max(1, parseInt(String(body.count || 6), 10) || 6));
      const today = await syncDailyReadingFromAelf(dateKey());
      const sundays = await syncUpcomingSundays(count);
      return NextResponse.json({
        message: `Lecture du jour + ${sundays.length} dimanche(s) pour la préparation`,
        readings: [today, ...sundays],
      });
    }

    // Tous les dimanches d’une année liturgique (B par défaut), par lots
    if (mode === "year-b" || mode === "year-b-sundays" || mode === "liturgical-year") {
      const letterRaw = String(body.letter || "B").toUpperCase();
      const letter = (["A", "B", "C"].includes(letterRaw) ? letterRaw : "B") as "A" | "B" | "C";
      const offset = Math.max(0, parseInt(String(body.offset || 0), 10) || 0);
      const limit = Math.min(10, Math.max(1, parseInt(String(body.limit || 6), 10) || 6));
      const result = await syncLiturgicalYearSundays(letter, { offset, limit });
      return NextResponse.json({
        message: result.done
          ? `Année liturgique ${letter} : ${result.total} dimanches prêts`
          : `Année ${letter} : ${result.nextOffset}/${result.total} dimanches importés…`,
        ...result,
      });
    }

    if (mode === "weekdays-upcoming") {
      const count = Math.min(21, Math.max(1, parseInt(String(body.count || 12), 10) || 12));
      const readings = await syncUpcomingWeekdays(count);
      return NextResponse.json({
        message: `${readings.length} messes de la semaine préparées`,
        readings,
      });
    }

    const date = body.date ? String(body.date).slice(0, 10) : dateKey();
    const reading = await syncDailyReadingFromAelf(date);
    return NextResponse.json({ message: "Lecture synchronisée", reading, readings: [reading] });
  } catch (error: any) {
    console.error(error);
    return NextResponse.json({ message: error?.message || "Erreur sync" }, { status: 500 });
  }
}
