import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";
import { syncBirthdayNotifications } from "@/lib/birthdays";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    const userId = parseInt((session?.user as any)?.id);
    if (!userId) return NextResponse.json({ message: "Non autorisé" }, { status: 401 });

    // Rafraîchit les alertes anniversaire (dédupliquées)
    await syncBirthdayNotifications(new Date()).catch(() => null);

    const notifications = await prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: 50,
    });

    return NextResponse.json(notifications);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ message: "Erreur serveur" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    const userId = parseInt((session?.user as any)?.id);
    if (!userId) return NextResponse.json({ message: "Non autorisé" }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    if (body.id) {
      await prisma.notification.updateMany({
        where: { id: Number(body.id), userId },
        data: { isRead: true },
      });
    } else {
      await prisma.notification.updateMany({
        where: { userId, isRead: false },
        data: { isRead: true },
      });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ message: "Erreur serveur" }, { status: 500 });
  }
}
