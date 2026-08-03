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

    const existingLike = await prisma.like.findUnique({
      where: { userId_postId: { userId, postId } }
    });

    if (existingLike) {
      await prisma.like.delete({ where: { id: existingLike.id } });
      return NextResponse.json({ message: "Like retiré" });
    } else {
      const like = await prisma.like.create({ data: { userId, postId } });

      // création de notification pour l'auteur du post (sauf si c'est son propre like)
      const post = await prisma.post.findUnique({ where: { id: postId } });
      if (post && post.authorId !== userId) {
        await prisma.notification.create({
          data: {
            title: "Nouveau like",
            message: `${userSession.name} a aimé votre publication.`,
            url: `/journal`,
            userId: post.authorId,
          },
        });
      }
      // Après prisma.like.create(...)
const post = await prisma.post.findUnique({ where: { id: postId } });
if (post && post.authorId !== userId) {
  await prisma.notification.create({
    data: {
      title: "Nouveau like",
      message: `${userSession.name} a aimé votre publication.`,
      url: `/journal`,
      userId: post.authorId,
    },
  });
}

      return NextResponse.json({ message: "Like ajouté" });
    }
  } catch (error) {
    console.error("Erreur LIKE:", error);
    return NextResponse.json({ message: "Erreur serveur" }, { status: 500 });
  }
}
