import NextAuth, { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Mot de passe", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        const user = await prisma.user.findUnique({ where: { email: credentials.email } });
        if (!user || !user.isActive) return null;

        const passwordMatch = await bcrypt.compare(credentials.password, user.password);
        if (!passwordMatch) return null;

        return {
          id: user.id.toString(),
          email: user.email,
          name: `${user.prenom} ${user.nom}`,
          role: user.role,
          image: user.photo,
        };
      },
    }),
  ],
  session: { strategy: "jwt" },
  secret: process.env.NEXTAUTH_SECRET || "nodafa_super_secret_key_2026",
  pages: { signIn: "/login" },
  callbacks: {
    async jwt({ token, user, trigger }) {
      if (user) {
        token.id = user.id;
        token.role = (user as any).role;
        token.picture = user.image;
      }

      // Rafraîchir le rôle / photo depuis la DB (changement admin sans rester bloqué)
      const userId = parseInt(String(token.id || ""), 10);
      if (userId && !Number.isNaN(userId)) {
        try {
          const dbUser = await prisma.user.findUnique({
            where: { id: userId },
            select: { role: true, photo: true, isActive: true, prenom: true, nom: true },
          });
          if (dbUser && dbUser.isActive) {
            token.role = dbUser.role;
            if (dbUser.photo) token.picture = dbUser.photo;
            token.name = `${dbUser.prenom} ${dbUser.nom}`.trim();
          }
        } catch {
          /* ignore refresh errors */
        }
      }

      if (trigger === "update") {
        // session.update() côté client
      }

      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as any).id = token.id;
        (session.user as any).role = token.role;
        session.user.image = (token.picture as string) || session.user.image;
        if (token.name) session.user.name = String(token.name);
      }
      return session;
    },
  },
};

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };
