import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { getServerSession } from "next-auth";
import { authOptions } from "../auth/[...nextauth]/route";

const prisma = new PrismaClient();

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ message: "Non autorisé" }, { status: 401 });

    const users = await prisma.user.findMany({
      where: { isActive: true },
      select: { id: true, nom: true, prenom: true, role: true },
      orderBy: { prenom: "asc" },
    });

    return NextResponse.json(users);
  } catch (error) {
    console.error("Erreur GET /api/users:", error);
    return NextResponse.json({ message: "Erreur serveur" }, { status: 500 });
  }
}
