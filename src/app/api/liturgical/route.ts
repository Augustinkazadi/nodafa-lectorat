import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";

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

export async function DELETE(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if ((session?.user as any)?.role !== "ADMIN") {
      return NextResponse.json({ message: "Non autorisé" }, { status: 403 });
    }
    const { searchParams } = new URL(req.url);
    const id = parseInt(searchParams.get("id") || "", 10);
    if (Number.isNaN(id)) return NextResponse.json({ message: "ID invalide" }, { status: 400 });
    await prisma.liturgicalEvent.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ message: "Erreur serveur" }, { status: 500 });
  }
}