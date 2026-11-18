import { PrismaClient } from "@prisma/client";
const p = new PrismaClient();
const rows = await p.notification.findMany({
  orderBy: { createdAt: "desc" },
  take: 12,
  select: { id: true, title: true, kind: true, url: true, createdAt: true },
});
console.log(JSON.stringify(rows, null, 2));
await p.$disconnect();
