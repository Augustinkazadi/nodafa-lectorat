import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";
import { isUserOnline, presenceLabel } from "@/lib/presence";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ message: "Non autorisé" }, { status: 401 });

    const users = await prisma.user.findMany({
      where: { isActive: true },
      select: { id: true, nom: true, prenom: true, role: true, photo: true, lastSeenAt: true },
      orderBy: { prenom: "asc" },
    });

    return NextResponse.json(
      users.map((u) => ({
        ...u,
        online: isUserOnline(u.lastSeenAt),
        presenceLabel: presenceLabel(u.lastSeenAt),
      }))
    );
  } catch (error) {
    console.error("Erreur GET /api/users:", error);
    return NextResponse.json({ message: "Erreur serveur" }, { status: 500 });
  }
}
