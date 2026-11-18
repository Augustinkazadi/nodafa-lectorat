import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../../auth/[...nextauth]/route";
import { dateKey, syncDailyReadingFromAelf, syncUpcomingSundays } from "@/lib/aelf";

function authorized(req: Request, session: any) {
  const cronSecret = process.env.CRON_SECRET;
  const authHeader = req.headers.get("authorization");
  if (cronSecret && authHeader === `Bearer ${cronSecret}`) return true;
  if (req.headers.get("x-vercel-cron") === "1") return true;
  if ((session?.user as any)?.role === "ADMIN") return true;
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
    if (!authorized(req, session)) {
      return NextResponse.json({ message: "Non autorisé" }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const mode = String(body.mode || "").toLowerCase();

    if (mode === "sundays" || mode === "upcoming-sundays" || body.upcomingSundays) {
      const count = Math.min(12, Math.max(1, parseInt(String(body.count || 6), 10) || 6));
      const readings = await syncUpcomingSundays(count);
      return NextResponse.json({
        message: `${readings.length} dimanche(s) publié(s) à l’avance`,
        readings,
      });
    }

    const date = body.date ? String(body.date).slice(0, 10) : dateKey();
    const reading = await syncDailyReadingFromAelf(date);
    return NextResponse.json({ message: "Lecture synchronisée", reading });
  } catch (error: any) {
    console.error(error);
    return NextResponse.json({ message: error?.message || "Erreur sync" }, { status: 500 });
  }
}
