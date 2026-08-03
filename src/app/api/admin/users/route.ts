import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { getServerSession } from "next-auth";
import { authOptions } from "../../auth/[...nextauth]/route";

const prisma = new PrismaClient();

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if ((session?.user as any)?.role !== "ADMIN") {
      return NextResponse.json({ message: "Non autorisé" }, { status: 403 });
    }

    const users = await prisma.user.findMany({
      select: { id: true, nom: true, prenom: true, email: true, role: true },
      where: { isActive: true },
    });
    return NextResponse.json(users);
  } catch (error) {
    return NextResponse.json({ message: "Erreur serveur" }, { status: 500 });
  }
}