import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { getServerSession } from "next-auth";
import { authOptions } from "../auth/[...nextauth]/route";

const prisma = new PrismaClient();

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ message: "Non autorisé" }, { status: 401 });

    const userId = parseInt((session.user as any).id);

    // Récupérer les utilisateurs avec anniversaire dans les 2 prochains jours
    const now = new Date();
    const todayMonth = now.getMonth() + 1;
    const todayDay = now.getDate();

    // On cherche les anniversaires dans les 2 jours suivants
    const twoDaysLater = new Date(now);
    twoDaysLater.setDate(twoDaysLater.getDate() + 2);
    const laterMonth = twoDaysLater.getMonth() + 1;
    const laterDay = twoDaysLater.getDate();

    const users = await prisma.user.findMany({
      where: {
        dateNaissance: { not: null },
        isActive: true,
      },
      select: { id: true, prenom: true, nom: true, dateNaissance: true },
    });

    const celebrants: string[] = [];
    users.forEach((u) => {
      if (!u.dateNaissance) return;
      const month = u.dateNaissance.getMonth() + 1;
      const day = u.dateNaissance.getDate();
      // vérifier si l'anniversaire tombe dans les 2 prochains jours
      const anniversaryThisYear = new Date(now.getFullYear(), month - 1, day);
      const diffTime = anniversaryThisYear.getTime() - now.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      if (diffDays >= 0 && diffDays <= 2) {
        celebrants.push(`${u.prenom} ${u.nom}`);
      }
    });

    // Créer une notification pour chaque célébrant (notification unique)
    for (const name of celebrants) {
      // Créer une notification pour tous les utilisateurs (ou pour l'utilisateur connecté)
      await prisma.notification.create({
        data: {
          title: "Anniversaire à venir",
          message: `Dans les prochains jours, ${name} fête son anniversaire !`,
          url: `/journal`,
          userId: userId, // on notifie l'utilisateur connecté ; on pourrait boucler sur tous les users
        },
      });
    }

    return NextResponse.json({ message: `Notifications créées pour ${celebrants.length} anniversaire(s).` });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ message: "Erreur serveur" }, { status: 500 });
  }
}
