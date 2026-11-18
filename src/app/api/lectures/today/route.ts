import { NextResponse } from "next/server";
import { getOrSyncReading, dateKey, syncDailyReadingFromAelf } from "@/lib/aelf";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const force = searchParams.get("sync") === "1";
    const iso = searchParams.get("date") || dateKey();

    const reading = force ? await syncDailyReadingFromAelf(iso) : await getOrSyncReading(iso);

    if (!reading) {
      return NextResponse.json({ message: "Lecture indisponible" }, { status: 404 });
    }
    return NextResponse.json(reading);
  } catch (error: any) {
    console.error(error);
    return NextResponse.json({ message: error?.message || "Erreur serveur" }, { status: 500 });
  }
}
