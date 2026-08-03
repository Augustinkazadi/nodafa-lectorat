import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";

const prisma = new PrismaClient();

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    const userId = parseInt((session?.user as any)?.id);
    if (!userId) {
      return NextResponse.json({ message: "Non autorisé" }, { status: 401 });
    }

    const participants = await prisma.conversationParticipant.findMany({
      where: { userId },
      include: {
        conversation: {
          include: {
            participants: {
              where: { userId: { not: userId } },
              include: { user: { select: { prenom: true, nom: true } } },
            },
            messages: {
              orderBy: { createdAt: "desc" },
              take: 1,
            },
          },
        },
      },
    });

    const unreadInfo = participants
      .map((p) => {
        const lastMessage = p.conversation.messages[0];
        if (!lastMessage) return null;
        const lastReadTime = p.lastReadAt
          ? new Date(p.lastReadAt).getTime()
          : 0;
        const lastMessageTime = new Date(lastMessage.createdAt).getTime();
        const isUnread = lastMessageTime > lastReadTime;
        return {
          conversationId: p.conversationId,
          otherUser: p.conversation.participants[0]?.user,
          unread: isUnread ? 1 : 0,
        };
      })
      .filter((item): item is NonNullable<typeof item> => item !== null);

    const totalUnread = unreadInfo.filter((u) => u.unread > 0).length;

    return NextResponse.json({ totalUnread, conversations: unreadInfo });
  } catch (error) {
    console.error("Erreur messages-unread:", error);
    return NextResponse.json({ message: "Erreur serveur" }, { status: 500 });
  }
}