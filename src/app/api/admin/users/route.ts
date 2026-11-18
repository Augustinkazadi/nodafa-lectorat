import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../../auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";

async function requireAdmin() {
  const session = await getServerSession(authOptions);
  if ((session?.user as any)?.role !== "ADMIN") return null;
  return session;
}

export async function GET() {
  try {
    if (!(await requireAdmin())) {
      return NextResponse.json({ message: "Non autorisé" }, { status: 403 });
    }

    const users = await prisma.user.findMany({
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        nom: true,
        prenom: true,
        email: true,
        role: true,
        telephone: true,
        dateNaissance: true,
        isActive: true,
        lastSeenAt: true,
        photo: true,
        createdAt: true,
      },
    });
    const now = Date.now();
    return NextResponse.json(
      users.map((u) => ({
        ...u,
        online: !!u.lastSeenAt && now - new Date(u.lastSeenAt).getTime() <= 2 * 60 * 1000,
      }))
    );
  } catch (error) {
    console.error(error);
    return NextResponse.json({ message: "Erreur serveur" }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const session = await requireAdmin();
    if (!session) return NextResponse.json({ message: "Non autorisé" }, { status: 403 });

    const body = await req.json();
    const userId = parseInt(body.userId, 10);
    if (Number.isNaN(userId)) {
      return NextResponse.json({ message: "ID invalide" }, { status: 400 });
    }

    const allowedRoles = ["LECTEUR", "ADMIN", "VISITEUR"];
    const data: any = {};
    const nextRole = body.role || body.newRole;
    if (nextRole) {
      if (!allowedRoles.includes(String(nextRole))) {
        return NextResponse.json({ message: "Rôle invalide" }, { status: 400 });
      }
      data.role = String(nextRole);
    }
    if (typeof body.isActive === "boolean") data.isActive = body.isActive;

    if (!Object.keys(data).length) {
      return NextResponse.json({ message: "Aucune modification" }, { status: 400 });
    }

    // Empêche de se retirer soi-même le rôle admin
    const currentId = parseInt((session.user as any).id, 10);
    if (userId === currentId && data.role && data.role !== "ADMIN") {
      return NextResponse.json({ message: "Vous ne pouvez pas retirer votre propre rôle admin" }, { status: 400 });
    }
    if (userId === currentId && data.isActive === false) {
      return NextResponse.json({ message: "Vous ne pouvez pas désactiver votre propre compte" }, { status: 400 });
    }

    // Garde au moins un admin actif
    if (data.role && data.role !== "ADMIN") {
      const adminCount = await prisma.user.count({ where: { role: "ADMIN", isActive: true } });
      const target = await prisma.user.findUnique({ where: { id: userId }, select: { role: true } });
      if (target?.role === "ADMIN" && adminCount <= 1) {
        return NextResponse.json({ message: "Il doit rester au moins un administrateur" }, { status: 400 });
      }
    }

    const updated = await prisma.user.update({
      where: { id: userId },
      data,
      select: {
        id: true,
        nom: true,
        prenom: true,
        email: true,
        role: true,
        isActive: true,
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ message: "Erreur serveur" }, { status: 500 });
  }
}
