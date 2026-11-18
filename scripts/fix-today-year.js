const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

(async () => {
  const date = new Date("2026-11-18T12:00:00.000Z");
  const r = await prisma.dailyReading.update({
    where: { date },
    data: {
      liturgicalYear: "A",
      title: "mercredi, 33ème semaine du Temps Ordinaire — année liturgique A",
    },
  });
  console.log(r.title, "|", r.liturgicalSeason, "|", r.liturgicalYear);
  await prisma.$disconnect();
})().catch(async (e) => {
  console.error(e);
  await prisma.$disconnect();
  process.exit(1);
});
