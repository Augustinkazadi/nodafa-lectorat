import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../../auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";
import { notifyProfileUpdate } from "@/lib/profileNotify";

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    const user = session?.user as any;
    if (!user?.id) return NextResponse.json({ message: "Non autorisé" }, { status: 401 });

    const body = await req.json();
    const photo = body.photo ? String(body.photo) : "";
    const coverPhoto = body.coverPhoto !== undefined ? (body.coverPhoto ? String(body.coverPhoto) : null) : undefined;
    const kind = body.kind === "cover" ? "cover" : "avatar";

    if (kind === "avatar" && !photo && coverPhoto === undefined) {
      return NextResponse.json({ message: "Aucune photo" }, { status: 400 });
    }

    const userId = parseInt(user.id, 10);
    const data: { photo?: string; coverPhoto?: string | null } = {};
    if (kind === "cover" || coverPhoto !== undefined) {
      data.coverPhoto = coverPhoto !== undefined ? coverPhoto : photo || null;
    } else {
      data.photo = photo;
    }

    const updated = await prisma.user.update({
      where: { id: userId },
      data,
      select: { id: true, photo: true, coverPhoto: true, prenom: true, nom: true },
    });

    const displayName = user.name || `${updated.prenom} ${updated.nom}`.trim();

    // Annonce dans le journal + notifications pour une nouvelle photo de profil
    if (kind === "avatar" && photo) {
      await prisma.post.create({
        data: {
          content: `📸 ${displayName} a mis à jour sa photo de profil.`,
          image: photo,
          mediaUrl: photo,
          mediaType: "IMAGE",
          authorId: userId,
        },
      });
      await notifyProfileUpdate({
        actorId: userId,
        actorName: displayName,
        what: "sa photo de profil",
      });
    } else if (kind === "cover") {
      await notifyProfileUpdate({
        actorId: userId,
        actorName: displayName,
        what: "sa photo de couverture",
      });
    }

    return NextResponse.json({
      message: kind === "cover" ? "Couverture mise à jour" : "Photo mise à jour",
      photo: updated.photo,
      coverPhoto: updated.coverPhoto,
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ message: "Erreur serveur" }, { status: 500 });
  }
}
