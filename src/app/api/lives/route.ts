import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { getServerSession } from "next-auth";
import { authOptions } from "../auth/[...nextauth]/route";

const prisma = new PrismaClient();

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    const userSession = session?.user as any;
    
    if (!session || userSession.role !== "ADMIN") {
      return NextResponse.json({ message: "Seul un admin peut lancer un live" }, { status: 403 });
    }

    const body = await req.json();
    const { title, youtubeUrl } = body;

    if (!title || !youtubeUrl) {
      return NextResponse.json({ message: "Titre et lien YouTube obligatoires" }, { status: 400 });
    }

    const live = await prisma.live.create({
      data: {
        title,
        youtubeUrl,
        scheduledAt: new Date(),
        isActive: true,
      },
    });

    return NextResponse.json({ message: "Live lancé !", live });
  } catch (error) {
    console.error("Erreur Live:", error);
    return NextResponse.json({ message: "Erreur serveur" }, { status: 500 });
  }
}