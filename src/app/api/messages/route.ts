import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { getServerSession } from "next-auth";
import { authOptions } from "../auth/[...nextauth]/route";
const prisma = new PrismaClient();

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    const userId = parseInt((session?.user as any)?.id);
    if (!userId) return NextResponse.json({ message: "Non autorisé" }, { status: 401 });

    const conversations = await prisma.conversation.findMany({
      where: { participants: { some: { userId } } },
      include: {
        participants: {
          include: { user: { select: { id: true, nom: true, prenom: true, photo: true } } },
        },
        messages: { orderBy: { createdAt: "desc" }, take: 1 },
      },
      orderBy: { updatedAt: "desc" },
    });

    return NextResponse.json(conversations);
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
    const receiverId = parseInt(formData.get("receiverId") as string);
    const content = (formData.get("content") as string) || "";
    const conversationId = formData.get("conversationId")
      ? parseInt(formData.get("conversationId") as string)
      : null;
    const file = formData.get("file") as File | null;

    if (!content.trim() && !file) {
      return NextResponse.json({ message: "Message ou fichier requis" }, { status: 400 });
    }

    let fileBase64 = "";
    if (file) {
      const bytes = await file.arrayBuffer();
      const buffer = Buffer.from(bytes);
      fileBase64 = `data:${file.type};base64,${buffer.toString("base64")}`;
    }

    let finalContent = content;
    if (fileBase64) {
      finalContent += `\n<img src="${fileBase64}" />`;
    }

    let convId = conversationId;
    if (!convId) {
      if (!receiverId) return NextResponse.json({ message: "Destinataire requis" }, { status: 400 });

      const existing = await prisma.conversation.findFirst({
        where: {
          AND: [
            { participants: { some: { userId: senderId } } },
            { participants: { some: { userId: receiverId } } },
          ],
        },
      });

      if (existing) {
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

    await prisma.message.create({
      data: {
        content: finalContent,
        senderId,
        conversationId: convId,
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

    return NextResponse.json({ message: "Message envoyé", conversationId: convId });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ message: "Erreur serveur" }, { status: 500 });
  }
}