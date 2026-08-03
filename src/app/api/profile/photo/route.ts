import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { getServerSession } from "next-auth";
import { authOptions } from "../../auth/[...nextauth]/route";

const prisma = new PrismaClient();

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    const user = session?.user as any;
    if (!user) return NextResponse.json({ message: "Non autorisé" }, { status: 401 });

    const body = await req.json();
    const photo = body.photo;

    if (!photo) return NextResponse.json({ message: "Aucune photo" }, { status: 400 });

    // Mise à jour du profil
    await prisma.user.update({
      where: { id: parseInt(user.id) },
      data: { photo },
    });

    // Création d'une notification dans le journal (comme si c'était un post système)
    await prisma.post.create({
      data: {
        content: `📸 ${user.name} a mis à jour sa photo de profil.`,
        image: photo,
        type: "NOUVELLE",
        authorId: parseInt(user.id),
      },
    });

    return NextResponse.json({ message: "Photo mise à jour" });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ message: "Erreur serveur" }, { status: 500 });
  }
}