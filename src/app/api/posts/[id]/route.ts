import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { getServerSession } from "next-auth";
import { authOptions } from "../../auth/[...nextauth]/route";

const prisma = new PrismaClient();

export async function DELETE(req: Request, props: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    const userSession = session?.user as any;
    if (!session || !userSession) return NextResponse.json({ message: "Non autorisé" }, { status: 401 });

    const params = await props.params;
    const postId = parseInt(params.id);

    // Vérifier si le post existe
    const post = await prisma.post.findUnique({ where: { id: postId } });
    if (!post) return NextResponse.json({ message: "Post introuvable" }, { status: 404 });

    // Vérifier si l'utilisateur est l'auteur (ou s'il est ADMIN)
    if (post.authorId !== parseInt(userSession.id) && userSession.role !== "ADMIN") {
      return NextResponse.json({ message: "Vous ne pouvez supprimer que vos propres posts" }, { status: 403 });
    }

    // Supprimer (Prisma nécessite de supprimer d'abord les likes et commentaires liés)
    await prisma.like.deleteMany({ where: { postId } });
    await prisma.comment.deleteMany({ where: { postId } });
    await prisma.post.delete({ where: { id: postId } });

    return NextResponse.json({ message: "Post supprimé avec succès" });
  } catch (error) {
    console.error("Erreur DELETE post:", error);
    return NextResponse.json({ message: "Erreur serveur" }, { status: 500 });
  }
}