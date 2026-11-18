import { prisma } from "@/lib/prisma";

/** Informe les autres membres qu'un profil a été mis à jour. */
export async function notifyProfileUpdate(opts: {
  actorId: number;
  actorName: string;
  what: string;
}) {
  const others = await prisma.user.findMany({
    where: { isActive: true, id: { not: opts.actorId } },
    select: { id: true },
  });

  const url = `/profil?id=${opts.actorId}`;
  const title = "Mise à jour de profil";
  const message = `${opts.actorName} a mis à jour ${opts.what}.`;
  const stamp = Date.now();

  await Promise.all(
    others.map((u) =>
      prisma.notification
        .create({
          data: {
            title,
            message,
            url,
            kind: "PROFILE_UPDATE",
            dedupeKey: `profile_${opts.actorId}_${u.id}_${stamp}`,
            userId: u.id,
          },
        })
        .catch(() => null)
    )
  );
}
