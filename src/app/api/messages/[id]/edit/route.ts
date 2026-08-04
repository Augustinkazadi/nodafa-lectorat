import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

const prisma = new PrismaClient();

export async function PUT(req: Request, props: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    const userId = parseInt((session?.user as any)?.id);
    if (!userId) return NextResponse.json({ message: "Non autorisé" }, { status: 401 });

    const params = await props.params;
    const msgId = parseInt(params.id);

    const body = await req.json();
    const { content } = body;
    if (!content) return NextResponse.json({ message: "Contenu vide" }, { status: 400 });

    const message = await prisma.message.findUnique({ where: { id: msgId } });
    if (!message) return NextResponse.json({ message: "Message introuvable" }, { status: 404 });
    if (message.senderId !== userId) return NextResponse.json({ message: "Vous ne pouvez modifier que vos messages" }, { status: 403 });

    const updated = await prisma.message.update({
      where: { id: msgId },
      data: { content },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ message: "Erreur serveur" }, { status: 500 });
  }
}