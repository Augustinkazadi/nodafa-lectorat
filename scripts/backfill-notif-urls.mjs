import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

function near(date, ms = 15000) {
  const t = new Date(date).getTime();
  return { gte: new Date(t - ms), lte: new Date(t + ms) };
}

const notifs = await prisma.notification.findMany({
  where: {
    OR: [
      { url: "/journal" },
      { url: null },
      { url: "" },
    ],
    kind: { in: ["POST_COMMENT", "POST_COMMENT_REPLY", "COMMENT_REPLY", "POST_LIKE"] },
  },
  orderBy: { createdAt: "desc" },
});

let updated = 0;

for (const n of notifs) {
  let postId = null;
  let commentId = null;

  if (n.kind === "POST_LIKE") {
    const like = await prisma.like.findFirst({
      where: {
        createdAt: near(n.createdAt),
        post: { authorId: n.userId },
      },
      orderBy: { createdAt: "desc" },
    });
    postId = like?.postId || null;
  } else if (n.kind === "COMMENT_REPLY") {
    const comment = await prisma.comment.findFirst({
      where: {
        createdAt: near(n.createdAt),
        parentId: { not: null },
      },
      orderBy: { createdAt: "desc" },
    });
    postId = comment?.postId || null;
    commentId = comment?.parentId || comment?.id || null;
  } else {
    // POST_COMMENT / POST_COMMENT_REPLY → auteur de la publication notifié
    const comment = await prisma.comment.findFirst({
      where: {
        createdAt: near(n.createdAt),
        post: { authorId: n.userId },
      },
      orderBy: { createdAt: "desc" },
    });
    postId = comment?.postId || null;
  }

  if (!postId) continue;

  const url =
    n.kind === "POST_LIKE"
      ? `/journal?post=${postId}`
      : commentId
        ? `/journal?post=${postId}&comments=1&comment=${commentId}`
        : `/journal?post=${postId}&comments=1`;

  await prisma.notification.update({
    where: { id: n.id },
    data: { url },
  });
  updated += 1;
  console.log(`#${n.id} ${n.kind} → ${url}`);
}

console.log(`Updated ${updated}/${notifs.length}`);
await prisma.$disconnect();
