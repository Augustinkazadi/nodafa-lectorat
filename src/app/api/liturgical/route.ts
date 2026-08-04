import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { getServerSession } from "next-auth";
import { authOptions } from "../auth/[...nextauth]/route";
const prisma = new PrismaClient();

export async function GET() {
  try {
    const events = await prisma.liturgicalEvent.findMany({
      orderBy: { date: "asc" },
      take: 50,
    });
    return NextResponse.json(events);
  } catch (error) {
    console.error("Erreur GET liturgical:", error);
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
    const { title, date, color, note } = body;

    if (!title || !date) {
      return NextResponse.json({ message: "Titre et date requis" }, { status: 400 });
    }

    const event = await prisma.liturgicalEvent.create({
      data: {
        title,
        date: new Date(date),
        color: color || "Vert",
        note: note || "",
      },
    });

    return NextResponse.json(event);
  } catch (error) {
    console.error("Erreur POST liturgical:", error);
    return NextResponse.json({ message: "Erreur serveur" }, { status: 500 });
  }
}