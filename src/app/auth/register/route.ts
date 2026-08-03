import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { nom, prenom, email, password, telephone, dateNaissance } = body;

    if (!nom || !prenom || !email || !password) {
      return NextResponse.json({ message: "Champs obligatoires manquants" }, { status: 400 });
    }

    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      return NextResponse.json({ message: "Cet email est déjà utilisé" }, { status: 400 });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const birthDate = dateNaissance ? new Date(dateNaissance) : null;

    const user = await prisma.user.create({
      data: {
        nom,
        prenom,
        email,
        password: hashedPassword,
        telephone: telephone || "",
        dateNaissance: birthDate,
        role: "LECTEUR", // Par défaut tout le monde est LECTEUR
        isActive: true,
      },
    });

    return NextResponse.json({ message: "Compte créé avec succès", user: { id: user.id, email: user.email } });
  } catch (error) {
    console.error("Erreur Inscription:", error);
    return NextResponse.json({ message: "Erreur serveur" }, { status: 500 });
  }
}