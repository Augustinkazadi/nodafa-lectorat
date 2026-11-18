import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../../auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if ((session?.user as any)?.role !== "ADMIN") {
      return NextResponse.json({ message: "Non autorisé" }, { status: 403 });
    }

    const [users, posts, comments, lives, readings, events, activeLives] = await Promise.all([
      prisma.user.count({ where: { isActive: true } }),
      prisma.post.count(),
      prisma.comment.count(),
      prisma.live.count(),
      prisma.dailyReading.count(),
      prisma.liturgicalEvent.count(),
      prisma.live.count({ where: { isActive: true } }),
    ]);

    const recentUsers = await prisma.user.findMany({
      where: { isActive: true },
      orderBy: { createdAt: "desc" },
      take: 5,
      select: { id: true, prenom: true, nom: true, email: true, role: true, createdAt: true },
    });

    const recentPosts = await prisma.post.findMany({
      orderBy: { createdAt: "desc" },
      take: 5,
      include: { author: { select: { prenom: true, nom: true } } },
    });

    return NextResponse.json({
      users,
      posts,
      comments,
      lives,
      readings,
      events,
      activeLives,
      recentUsers,
      recentPosts,
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ message: "Erreur serveur" }, { status: 500 });
  }
}
