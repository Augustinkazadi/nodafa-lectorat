import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

const prisma = new PrismaClient();

export async function POST(
  req: Request,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    const userSession = session?.user as any;

    if (!session || !userSession?.id) {
      return NextResponse.json({ message: "Non autorisé" }, { status: 401 });
    }

    const params = await props.params;
    const postId = parseInt(params.id, 10);
    const userId = parseInt(userSession.id, 10);

    if (Number.isNaN(postId) || Number.isNaN(userId)) {
      return NextResponse.json({ message: "ID invalide" }, { status: 400 });
    }

    const targetPost = await prisma.post.findUnique({
      where: { id: postId },
    });

    if (!targetPost) {
      return NextResponse.json({ message: "Publication introuvable" }, { status: 404 });
    }

    const existingLike = await prisma.like.findUnique({
      where: {
        userId_postId: {
          userId,
          postId,
        },
      },
    });

    if (existingLike) {
      await prisma.like.delete({
        where: { id: existingLike.id },
      });

      return NextResponse.json({ message: "Like retiré" });
    }

    await prisma.like.create({
      data: {
        userId,
        postId,
      },
    });

    if (targetPost.authorId !== userId) {
      await prisma.notification.create({
        data: {
          title: "Nouveau like",
          message: `${userSession.name || "Quelqu'un"} a aimé votre publication.`,
          url: "/journal",
          userId: targetPost.authorId,
        },
      });
    }

    return NextResponse.json({ message: "Like ajouté" });
  } catch (error) {
    console.error("Erreur LIKE:", error);
    return NextResponse.json({ message: "Erreur serveur" }, { status: 500 });
  }
}