import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { getServerSession } from "next-auth";
import { authOptions } from "../../../auth/[...nextauth]/route";

const prisma = new PrismaClient();

export async function POST(req: Request, props: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    const userSession = session?.user as any;
    if (!session || !userSession) return NextResponse.json({ message: "Non autorisé" }, { status: 401 });

    const params = await props.params;
    const postId = parseInt(params.id);
    const userId = parseInt(userSession.id);

    const body = await req.json();
    const { content } = body;
    if (!content) return NextResponse.json({ message: "Commentaire vide" }, { status: 400 });

    const comment = await prisma.comment.create({
      data: { content, postId, userId }
    });

    // notification pour l'auteur du post
    const post = await prisma.post.findUnique({ where: { id: postId } });
    if (post && post.authorId !== userId) {
      await prisma.notification.create({
        data: {
          title: "Nouveau commentaire",
          message: `${userSession.name} a commenté votre publication : "${content.substring(0, 30)}..."`,
          url: `/journal`,
          userId: post.authorId,
        },
      });
    }

    return NextResponse.json(comment);
  } catch (error) {
    console.error("Erreur COMMENTAIRE:", error);
    return NextResponse.json({ message: "Erreur serveur" }, { status: 500 });
  }
}
