import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";
import { saveUploadedFile } from "@/lib/upload";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    const userId = parseInt((session?.user as any)?.id);
    if (!userId) return NextResponse.json({ message: "Non autorisé" }, { status: 401 });

    const conversations = await prisma.conversation.findMany({
      where: { participants: { some: { userId } } },
      include: {
        participants: {
          include: {
            user: { select: { id: true, nom: true, prenom: true, photo: true, lastSeenAt: true } },
          },
        },
        messages: {
          orderBy: { createdAt: "desc" },
          take: 1,
          select: {
            id: true,
            content: true,
            mediaType: true,
            mediaName: true,
            senderId: true,
            createdAt: true,
          },
        },
      },
      orderBy: { updatedAt: "desc" },
    });

    const withUnread = conversations.map((conv) => {
      const me = conv.participants.find((p) => p.userId === userId);
      const lastReadAt = me?.lastReadAt ? new Date(me.lastReadAt) : new Date(0);
      const lastMsg = conv.messages[0];
      const unread =
        lastMsg && lastMsg.senderId !== userId && new Date(lastMsg.createdAt) > lastReadAt
          ? 1
          : 0;
      return { ...conv, unread };
    });

    return NextResponse.json(withUnread);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ message: "Erreur serveur" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    const senderId = parseInt((session?.user as any)?.id);
    if (!senderId) return NextResponse.json({ message: "Non autorisé" }, { status: 401 });

    const formData = await req.formData();
    const receiverRaw = formData.get("receiverId") as string;
    const receiverId = receiverRaw ? parseInt(receiverRaw) : NaN;
    const content = ((formData.get("content") as string) || "").trim();
    const conversationId = formData.get("conversationId")
      ? parseInt(formData.get("conversationId") as string)
      : null;
    const replyToId = formData.get("replyToId")
      ? parseInt(formData.get("replyToId") as string)
      : null;
    const file = formData.get("file") as File | null;
    let mediaUrl = (formData.get("mediaUrl") as string) || null;
    let mediaType = (formData.get("mediaType") as string) || null;
    let mediaName = (formData.get("mediaName") as string) || null;

    if (!content && !(file && file.size > 0) && !mediaUrl) {
      return NextResponse.json({ message: "Message ou fichier requis" }, { status: 400 });
    }

    if (file && file.size > 0 && !mediaUrl) {
      const uploaded = await saveUploadedFile(file, ["IMAGE", "VIDEO", "PDF", "AUDIO"]);
      mediaUrl = uploaded.url;
      mediaType = uploaded.mediaType;
      mediaName = uploaded.name;
    }

    const wantBroadcast = String(formData.get("broadcast") || "") === "1";
    let convId = conversationId;

    if (wantBroadcast && !convId) {
      let broadcast = await prisma.conversation.findFirst({ where: { isBroadcast: true } });
      const members = await prisma.user.findMany({
        where: { isActive: true },
        select: { id: true },
      });
      if (!broadcast) {
        broadcast = await prisma.conversation.create({
          data: {
            title: "Annonce Lectorat",
            isBroadcast: true,
            participants: { create: members.map((u) => ({ userId: u.id })) },
          },
        });
      } else {
        const existingIds = new Set(
          (
            await prisma.conversationParticipant.findMany({
              where: { conversationId: broadcast.id },
              select: { userId: true },
            })
          ).map((p) => p.userId)
        );
        const missing = members.filter((u) => !existingIds.has(u.id));
        if (missing.length) {
          await prisma.conversationParticipant.createMany({
            data: missing.map((u) => ({ conversationId: broadcast!.id, userId: u.id })),
            skipDuplicates: true,
          });
        }
      }
      convId = broadcast.id;
    }

    if (!convId) {
      if (!receiverId) {
        return NextResponse.json({ message: "Destinataire requis" }, { status: 400 });
      }

      const existing = await prisma.conversation.findFirst({
        where: {
          isBroadcast: false,
          AND: [
            { participants: { some: { userId: senderId } } },
            { participants: { some: { userId: receiverId } } },
          ],
        },
        include: { participants: true },
      });

      if (existing && existing.participants.length === 2) {
        convId = existing.id;
      } else {
        const newConv = await prisma.conversation.create({
          data: {
            participants: {
              create: [{ userId: senderId }, { userId: receiverId }],
            },
          },
        });
        convId = newConv.id;
      }
    }

    const message = await prisma.message.create({
      data: {
        content: content || "",
        mediaUrl,
        mediaType,
        mediaName,
        replyToId: replyToId || undefined,
        senderId,
        conversationId: convId,
      },
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
    });

    await prisma.conversation.update({
      where: { id: convId },
      data: { updatedAt: new Date() },
    });

    await prisma.conversationParticipant.updateMany({
      where: { userId: senderId, conversationId: convId },
      data: { lastReadAt: new Date() },
    });

    return NextResponse.json({ ...message, conversationId: convId });
  } catch (error: any) {
    console.error(error);
    return NextResponse.json({ message: error?.message || "Erreur serveur" }, { status: 500 });
  }
}
