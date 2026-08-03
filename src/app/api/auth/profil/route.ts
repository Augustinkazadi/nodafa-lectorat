import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { getServerSession } from "next-auth";
import { authOptions } from "../[...nextauth]/route";

const prisma = new PrismaClient();

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ message: "Non autorisé" }, { status: 401 });

    const user = await prisma.user.findUnique({
      where: { id: parseInt((session.user as any).id) },
      select: { photo: true },
    });

    return NextResponse.json({ photo: user?.photo || null });
  } catch (error) {
    return NextResponse.json({ message: "Erreur serveur" }, { status: 500 });
  }
}