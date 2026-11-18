import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../../../auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";

export async function GET(_req: Request, props: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ message: "Non autorisé" }, { status: 401 });

    const params = await props.params;
    const liveId = parseInt(params.id, 10);
    if (Number.isNaN(liveId)) return NextResponse.json({ message: "ID invalide" }, { status: 400 });

    const comments = await prisma.liveComment.findMany({
      where: { liveId },
      orderBy: { createdAt: "asc" },
      include: {
        user: { select: { id: true, prenom: true, nom: true, photo: true } },
      },
    });
    return NextResponse.json(comments);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ message: "Erreur serveur" }, { status: 500 });
  }
}

export async function POST(req: Request, props: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    const userSession = session?.user as any;
    const userId = parseInt(userSession?.id || "", 10);
    if (!userId) return NextResponse.json({ message: "Non autorisé" }, { status: 401 });

    const params = await props.params;
    const liveId = parseInt(params.id, 10);
    if (Number.isNaN(liveId)) return NextResponse.json({ message: "ID invalide" }, { status: 400 });

    const body = await req.json();
    const content = String(body.content || "").trim();
    if (!content) return NextResponse.json({ message: "Commentaire vide" }, { status: 400 });

    const live = await prisma.live.findUnique({ where: { id: liveId } });
    if (!live) return NextResponse.json({ message: "Diffusion introuvable" }, { status: 404 });

    const comment = await prisma.liveComment.create({
      data: { content, liveId, userId },
      include: {
        user: { select: { id: true, prenom: true, nom: true, photo: true } },
      },
    });

    return NextResponse.json(comment);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ message: "Erreur serveur" }, { status: 500 });
  }
}
