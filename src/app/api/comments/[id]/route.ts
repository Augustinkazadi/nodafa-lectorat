import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { getServerSession } from "next-auth";
import { authOptions } from "../../auth/[...nextauth]/route";

const prisma = new PrismaClient();

export async function PUT(req: Request, props: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    const userSession = session?.user as any;
    if (!session || !userSession) return NextResponse.json({ message: "Non autorisé" }, { status: 401 });

    const params = await props.params;
    const commentId = parseInt(params.id);
    const body = await req.json();
    const { content } = body;

    const comment = await prisma.comment.findUnique({ where: { id: commentId } });
    if (!comment) return NextResponse.json({ message: "Commentaire introuvable" }, { status: 404 });
    if (comment.userId !== parseInt(userSession.id)) return NextResponse.json({ message: "Vous ne pouvez modifier que vos commentaires" }, { status: 403 });

    const updated = await prisma.comment.update({
      where: { id: commentId },
      data: { content, isEdited: true },
    });

    return NextResponse.json(updated);
  } catch (error) {
    return NextResponse.json({ message: "Erreur serveur" }, { status: 500 });
  }
}

export async function DELETE(req: Request, props: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    const userSession = session?.user as any;
    if (!session || !userSession) return NextResponse.json({ message: "Non autorisé" }, { status: 401 });

    const params = await props.params;
    const commentId = parseInt(params.id);

    const comment = await prisma.comment.findUnique({ where: { id: commentId } });
    if (!comment) return NextResponse.json({ message: "Commentaire introuvable" }, { status: 404 });
    if (comment.userId !== parseInt(userSession.id)) return NextResponse.json({ message: "Vous ne pouvez supprimer que vos commentaires" }, { status: 403 });

    await prisma.comment.delete({ where: { id: commentId } });
    return NextResponse.json({ message: "Commentaire supprimé" });
  } catch (error) {
    return NextResponse.json({ message: "Erreur serveur" }, { status: 500 });
  }
}