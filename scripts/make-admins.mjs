import { PrismaClient } from "@prisma/client";
const p = new PrismaClient();

// Propriétaire du projet + comptes actifs de test
const emails = [
  "auguykazka@gmail.com",
  "axel@gmail.com",
  "axelmakanda93@gmail.com",
];

const result = await p.user.updateMany({
  where: { email: { in: emails } },
  data: { role: "ADMIN" },
});

const users = await p.user.findMany({
  select: { id: true, email: true, prenom: true, nom: true, role: true },
  orderBy: { id: "asc" },
});
console.log(`Updated: ${result.count}`);
console.log(JSON.stringify(users, null, 2));
await p.$disconnect();
