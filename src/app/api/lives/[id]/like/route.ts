import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../../../auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";

export async function POST(_req: Request, props: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    const userId = parseInt((session?.user as any)?.id || "", 10);
    if (!userId) return NextResponse.json({ message: "Non autorisé" }, { status: 401 });

    const params = await props.params;
    const liveId = parseInt(params.id, 10);
    if (Number.isNaN(liveId)) return NextResponse.json({ message: "ID invalide" }, { status: 400 });

    const live = await prisma.live.findUnique({ where: { id: liveId } });
    if (!live) return NextResponse.json({ message: "Diffusion introuvable" }, { status: 404 });

    const existing = await prisma.liveLike.findUnique({
      where: { userId_liveId: { userId, liveId } },
    });

    if (existing) {
      await prisma.liveLike.delete({ where: { id: existing.id } });
      const count = await prisma.liveLike.count({ where: { liveId } });
      return NextResponse.json({ liked: false, count });
    }

    await prisma.liveLike.create({ data: { userId, liveId } });
    const count = await prisma.liveLike.count({ where: { liveId } });
    return NextResponse.json({ liked: true, count });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ message: "Erreur serveur" }, { status: 500 });
  }
}
