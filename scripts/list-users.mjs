import { PrismaClient } from "@prisma/client";
const p = new PrismaClient();
const users = await p.user.findMany({
  select: { id: true, email: true, prenom: true, nom: true, role: true, isActive: true },
  orderBy: { id: "asc" },
});
console.log(JSON.stringify(users, null, 2));
await p.$disconnect();
