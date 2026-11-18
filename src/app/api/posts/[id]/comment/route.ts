import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../../../auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request, props: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    const userSession = session?.user as any;
    if (!session || !userSession) return NextResponse.json({ message: "Non autorisé" }, { status: 401 });

    const params = await props.params;
    const postId = parseInt(params.id);
    const userId = parseInt(userSession.id);

    const body = await req.json();
    const content = String(body.content || "").trim();
    const rawParentId = body.parentId ? parseInt(body.parentId) : null;
    if (!content) return NextResponse.json({ message: "Commentaire vide" }, { status: 400 });

    let rootParentId: number | null = null;
    let notifyUserId: number | null = null;

    if (rawParentId) {
      const parent = await prisma.comment.findUnique({
        where: { id: rawParentId },
        select: { id: true, postId: true, parentId: true, userId: true },
      });
      if (!parent || parent.postId !== postId) {
        return NextResponse.json({ message: "Commentaire parent introuvable" }, { status: 400 });
      }
      // Une seule profondeur : réponse à une réponse → sous le commentaire racine
      rootParentId = parent.parentId || parent.id;
      notifyUserId = parent.userId;
    }

    const comment = await prisma.comment.create({
      data: {
        content,
        postId,
        userId,
        parentId: rootParentId,
      },
      include: {
        user: { select: { id: true, nom: true, prenom: true, photo: true } },
      },
    });

    const post = await prisma.post.findUnique({ where: { id: postId } });
    const preview = content.length > 40 ? `${content.substring(0, 40)}…` : content;

    const postUrl = `/journal?post=${postId}&comments=1`;

    if (post && post.authorId !== userId) {
      await prisma.notification.create({
        data: {
          title: rootParentId ? "Réponse à un commentaire" : "Nouveau commentaire",
          message: `${userSession.name} a ${rootParentId ? "répondu sur" : "commenté"} votre publication : « ${preview} »`,
          url: postUrl,
          kind: rootParentId ? "POST_COMMENT_REPLY" : "POST_COMMENT",
          userId: post.authorId,
        },
      });
    }

    if (notifyUserId && notifyUserId !== userId && notifyUserId !== post?.authorId) {
      await prisma.notification.create({
        data: {
          title: "Réponse à votre commentaire",
          message: `${userSession.name} a répondu : « ${preview} »`,
          url: `${postUrl}&comment=${rawParentId}`,
          kind: "COMMENT_REPLY",
          userId: notifyUserId,
        },
      });
    }

    return NextResponse.json(comment);
  } catch (error) {
    console.error("Erreur COMMENTAIRE:", error);
    return NextResponse.json({ message: "Erreur serveur" }, { status: 500 });
  }
}
