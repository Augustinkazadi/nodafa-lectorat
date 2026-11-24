import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";
import { findReadingByIso } from "@/lib/aelf";
import { dateAtMidnight } from "@/lib/datetime";

export async function GET() {
  try {
    const readings = await prisma.dailyReading.findMany({
      orderBy: { date: "asc" },
      take: 400,
    });
    return NextResponse.json(readings);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ message: "Erreur serveur" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if ((session?.user as any)?.role !== "ADMIN") {
      return NextResponse.json({ message: "Non autorisé" }, { status: 403 });
    }

    const body = await req.json();
    const title = (body.title || "").trim();
    const gospel = (body.gospel || body.lectureGospel || "").trim();
    const firstReading = (body.firstReading || "").trim();
    const dateRaw = body.date || body.lectureDate;
    if (!title || !gospel || !firstReading || !dateRaw) {
      return NextResponse.json({ message: "Titre, date, 1ʳᵉ lecture et évangile requis" }, { status: 400 });
    }

    const iso = String(dateRaw).slice(0, 10);
    const date = dateAtMidnight(iso);

    const yearRaw = String(body.liturgicalYear || "").toUpperCase();
    const liturgicalYear = ["A", "B", "C"].includes(yearRaw) ? yearRaw : null;
    const liturgicalSeason = String(body.liturgicalSeason || "").trim() || null;
    const isSunday =
      typeof body.isSunday === "boolean"
        ? body.isSunday
        : new Date(`${iso}T12:00:00.000Z`).getUTCDay() === 0 || /dimanche/i.test(title);

    const payload = {
      title,
      gospel,
      firstReading: firstReading || null,
      psalm: body.psalm || null,
      secondReading: (body.secondReading || "").trim() || null,
      liturgicalColor: body.liturgicalColor || null,
      commentary: body.commentary || null,
      source: body.source || "manuel",
      liturgicalYear,
      liturgicalSeason,
      isSunday,
    };

    const existing = await findReadingByIso(iso);
    const reading = existing
      ? await prisma.dailyReading.update({
          where: { id: existing.id },
          data: {
            ...payload,
            date,
            ...(body.image ? { image: body.image } : {}),
          },
        })
      : await prisma.dailyReading.create({
          data: {
            ...payload,
            date,
            image: body.image || null,
          },
        });

    return NextResponse.json(reading);
  } catch (error: any) {
    console.error(error);
    return NextResponse.json({ message: error?.message || "Erreur serveur" }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if ((session?.user as any)?.role !== "ADMIN") {
      return NextResponse.json({ message: "Non autorisé" }, { status: 403 });
    }
    const body = await req.json();
    const id = parseInt(body.id, 10);
    if (Number.isNaN(id)) return NextResponse.json({ message: "ID invalide" }, { status: 400 });

    const reading = await prisma.dailyReading.update({
      where: { id },
      data: {
        ...(body.image !== undefined ? { image: body.image } : {}),
        ...(body.title ? { title: body.title } : {}),
        ...(body.commentary !== undefined ? { commentary: body.commentary } : {}),
      },
    });
    return NextResponse.json(reading);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ message: "Erreur serveur" }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if ((session?.user as any)?.role !== "ADMIN") {
      return NextResponse.json({ message: "Non autorisé" }, { status: 403 });
    }
    const { searchParams } = new URL(req.url);
    const id = parseInt(searchParams.get("id") || "", 10);
    if (Number.isNaN(id)) return NextResponse.json({ message: "ID invalide" }, { status: 400 });
    await prisma.dailyReading.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ message: "Erreur serveur" }, { status: 500 });
  }
}
