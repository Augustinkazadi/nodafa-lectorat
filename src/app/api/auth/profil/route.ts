import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../[...nextauth]/route";
import { prisma } from "@/lib/prisma";
import { notifyProfileUpdate } from "@/lib/profileNotify";
import { isUserOnline, presenceLabel } from "@/lib/presence";

const profileSelect = {
  id: true,
  email: true,
  nom: true,
  prenom: true,
  telephone: true,
  dateNaissance: true,
  photo: true,
  coverPhoto: true,
  bio: true,
  role: true,
  lastSeenAt: true,
  createdAt: true,
} as const;

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ message: "Non autorisé" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const rawId = searchParams.get("id");
    const sessionId = parseInt((session.user as any).id, 10);
    const userId = rawId ? parseInt(rawId, 10) : sessionId;

    if (Number.isNaN(userId)) {
      return NextResponse.json({ message: "ID invalide" }, { status: 400 });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: profileSelect,
    });

    if (!user) {
      return NextResponse.json({ message: "Profil introuvable" }, { status: 404 });
    }

    const posts = await prisma.post.findMany({
      where: { authorId: userId },
      orderBy: { createdAt: "desc" },
      take: 30,
      include: {
        likes: true,
        comments: true,
      },
    });

    return NextResponse.json({
      ...user,
      online: isUserOnline(user.lastSeenAt),
      presenceLabel: presenceLabel(user.lastSeenAt),
      isOwnProfile: userId === sessionId,
      postsCount: posts.length,
      posts: posts.map((p) => ({
        ...p,
        feedType: "POST",
        mediaUrl: p.mediaUrl || p.image || null,
        mediaType: p.mediaType || (p.image ? "IMAGE" : null),
      })),
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ message: "Erreur serveur" }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    const userSession = session?.user as any;
    if (!userSession?.id) return NextResponse.json({ message: "Non autorisé" }, { status: 401 });

    const userId = parseInt(userSession.id, 10);
    const body = await req.json();

    const data: Record<string, unknown> = {};

    if (body.prenom !== undefined) {
      const prenom = String(body.prenom || "").trim();
      if (!prenom) return NextResponse.json({ message: "Prénom requis" }, { status: 400 });
      data.prenom = prenom;
    }
    if (body.nom !== undefined) {
      const nom = String(body.nom || "").trim();
      if (!nom) return NextResponse.json({ message: "Nom requis" }, { status: 400 });
      data.nom = nom;
    }
    if (body.telephone !== undefined) {
      data.telephone = String(body.telephone || "").trim() || null;
    }
    if (body.bio !== undefined) {
      data.bio = String(body.bio || "").trim().slice(0, 300) || null;
    }
    if (body.dateNaissance !== undefined) {
      if (!body.dateNaissance) {
        data.dateNaissance = null;
      } else {
        const d = new Date(body.dateNaissance);
        if (Number.isNaN(d.getTime())) {
          return NextResponse.json({ message: "Date de naissance invalide" }, { status: 400 });
        }
        data.dateNaissance = d;
      }
    }
    if (body.photo !== undefined) {
      data.photo = body.photo ? String(body.photo) : null;
    }
    if (body.coverPhoto !== undefined) {
      data.coverPhoto = body.coverPhoto ? String(body.coverPhoto) : null;
    }

    if (Object.keys(data).length === 0) {
      return NextResponse.json({ message: "Aucune modification" }, { status: 400 });
    }

    const updated = await prisma.user.update({
      where: { id: userId },
      data,
      select: profileSelect,
    });

    const displayName = `${updated.prenom} ${updated.nom}`.trim();
    const visibleChange =
      data.prenom !== undefined ||
      data.nom !== undefined ||
      data.bio !== undefined ||
      data.photo !== undefined ||
      data.coverPhoto !== undefined;

    if (visibleChange) {
      await notifyProfileUpdate({
        actorId: userId,
        actorName: displayName || userSession.name || "Un membre",
        what: "son profil",
      });
    }

    return NextResponse.json(updated);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ message: "Erreur serveur" }, { status: 500 });
  }
}
