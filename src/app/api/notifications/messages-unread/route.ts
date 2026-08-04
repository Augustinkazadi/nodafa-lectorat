import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { getServerSession } from "next-auth";
import { authOptions } from "../../auth/[...nextauth]/route";

const prisma = new PrismaClient();

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    const userId = parseInt((session?.user as any)?.id);
    if (!userId) return NextResponse.json({ message: "Non autorisé" }, { status: 401 });

    const unreadNotifications = await prisma.notification.count({
      where: { userId, isRead: false },
    });

    const participants = await prisma.conversationParticipant.findMany({
      where: { userId },
      include: {
        conversation: {
          include: {
            messages: { orderBy: { createdAt: "desc" }, take: 1 },
          },
        },
      },
    });

    let unreadMessages = 0;
    for (const p of participants) {
      const lastMessage = p.conversation.messages[0];
      if (!lastMessage) continue;
      const lastReadTime = p.lastReadAt ? new Date(p.lastReadAt).getTime() : 0;
      const lastMessageTime = new Date(lastMessage.createdAt).getTime();
      if (lastMessageTime > lastReadTime) unreadMessages++;
    }

    return NextResponse.json({
      notifications: unreadNotifications,
      messages: unreadMessages,
      total: unreadNotifications + unreadMessages,
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ message: "Erreur serveur" }, { status: 500 });
  }
}