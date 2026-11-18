import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../../auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";

export async function GET(
  req: Request,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    const userId = parseInt((session?.user as any)?.id);
    if (!userId) return NextResponse.json({ message: "Non autorisé" }, { status: 401 });

    const params = await props.params;
    const conversationId = parseInt(params.id);
    if (isNaN(conversationId)) {
      return NextResponse.json({ message: "ID invalide" }, { status: 400 });
    }

    const participant = await prisma.conversationParticipant.findFirst({
      where: { conversationId, userId },
    });
    if (!participant) return NextResponse.json({ message: "Accès refusé" }, { status: 403 });

    await prisma.conversationParticipant.updateMany({
      where: { userId, conversationId },
      data: { lastReadAt: new Date() },
    });

    const messages = await prisma.message.findMany({
      where: { conversationId },
      include: {
        sender: { select: { id: true, nom: true, prenom: true, photo: true } },
        replyTo: {
          select: {
            id: true,
            content: true,
            mediaType: true,
            mediaName: true,
            sender: { select: { prenom: true, nom: true } },
          },
        },
      },
      orderBy: { createdAt: "asc" },
    });

    const others = await prisma.conversationParticipant.findMany({
      where: { conversationId, userId: { not: userId } },
      select: { lastReadAt: true },
    });
    const peerLastRead = others
      .map((o) => o.lastReadAt)
      .filter(Boolean)
      .sort((a, b) => (b as Date).getTime() - (a as Date).getTime())[0] as Date | undefined;

    const enriched = messages.map((msg) => {
      let receipt: "SENT" | "DELIVERED" | "READ" = "SENT";
      if (msg.senderId === userId) {
        if (peerLastRead && peerLastRead >= msg.createdAt) receipt = "READ";
        else receipt = "DELIVERED";
      }
      return { ...msg, receipt };
    });

    return NextResponse.json(enriched);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ message: "Erreur serveur" }, { status: 500 });
  }
}
