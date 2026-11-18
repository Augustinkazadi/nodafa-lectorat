import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";
import { isUserOnline, ONLINE_WINDOW_MS } from "@/lib/presence";

export async function POST() {
  try {
    const session = await getServerSession(authOptions);
    const userId = parseInt((session?.user as any)?.id || "", 10);
    if (!userId || Number.isNaN(userId)) {
      return NextResponse.json({ message: "Non autorisé" }, { status: 401 });
    }

    const now = new Date();
    await prisma.user.update({
      where: { id: userId },
      data: { lastSeenAt: now },
    });

    return NextResponse.json({ ok: true, lastSeenAt: now.toISOString() });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ message: "Erreur serveur" }, { status: 500 });
  }
}

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ message: "Non autorisé" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const idsRaw = searchParams.get("ids");
    const since = new Date(Date.now() - ONLINE_WINDOW_MS);

    if (idsRaw) {
      const ids = idsRaw
        .split(",")
        .map((x) => parseInt(x, 10))
        .filter((n) => !Number.isNaN(n));
      const users = await prisma.user.findMany({
        where: { id: { in: ids }, isActive: true },
        select: { id: true, lastSeenAt: true, prenom: true, nom: true, photo: true },
      });
      return NextResponse.json(
        users.map((u) => ({
          ...u,
          online: isUserOnline(u.lastSeenAt),
        }))
      );
    }

    const onlineUsers = await prisma.user.findMany({
      where: {
        isActive: true,
        lastSeenAt: { gte: since },
      },
      select: {
        id: true,
        prenom: true,
        nom: true,
        photo: true,
        lastSeenAt: true,
        role: true,
      },
      orderBy: { prenom: "asc" },
      take: 100,
    });

    return NextResponse.json({
      onlineCount: onlineUsers.length,
      users: onlineUsers.map((u) => ({ ...u, online: true })),
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ message: "Erreur serveur" }, { status: 500 });
  }
}
