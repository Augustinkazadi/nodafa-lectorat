import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";
import { buildLiveRoomName } from "@/lib/liveConfig";
import { LIVE_EVENT_TYPES, liveEventLabel } from "@/lib/liveEvents";

const allowedTypes = LIVE_EVENT_TYPES.map((t) => t.value);

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    const userId = parseInt((session?.user as any)?.id || "", 10);
    if (!userId) {
      return NextResponse.json({ message: "Non autorisé" }, { status: 401 });
    }
    const lives = await prisma.live.findMany({
      orderBy: { createdAt: "desc" },
      take: 40,
      include: {
        likes: { select: { userId: true } },
        comments: {
          orderBy: { createdAt: "asc" },
          include: {
            user: { select: { id: true, prenom: true, nom: true, photo: true } },
          },
        },
        _count: { select: { likes: true, comments: true } },
      },
    });
    return NextResponse.json(
      lives.map((l) => ({
        ...l,
        likesCount: l._count.likes,
        commentsCount: l._count.comments,
        likedByMe: l.likes.some((x) => x.userId === userId),
        likes: undefined,
        _count: undefined,
      }))
    );
  } catch (error) {
    console.error(error);
    return NextResponse.json({ message: "Erreur serveur" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    const userSession = session?.user as any;
    if (!session || userSession?.role !== "ADMIN") {
      return NextResponse.json({ message: "Seul un admin peut lancer une diffusion" }, { status: 403 });
    }

    const body = await req.json();
    const title = String(body.title || "").trim();
    const eventType = String(body.eventType || "autre").trim();
    const description = String(body.description || "").trim() || null;

    if (!title) {
      return NextResponse.json({ message: "Titre de l’événement obligatoire" }, { status: 400 });
    }
    if (!allowedTypes.includes(eventType as any)) {
      return NextResponse.json({ message: "Type d’événement invalide" }, { status: 400 });
    }

    await prisma.live.updateMany({
      where: { isActive: true },
      data: { isActive: false },
    });

    const roomName = String(body.roomName || "").trim() || buildLiveRoomName(title);

    const live = await prisma.live.create({
      data: {
        title,
        eventType,
        description,
        roomName,
        youtubeUrl: null,
        scheduledAt: body.scheduledAt ? new Date(body.scheduledAt) : new Date(),
        isActive: true,
      },
    });

    const typeLabel = liveEventLabel(eventType);
    const members = await prisma.user.findMany({
      where: { isActive: true },
      select: { id: true },
    });
    const stamp = Date.now();
    await Promise.all(
      members.map((u) =>
        prisma.notification
          .create({
            data: {
              title: `🔴 ${typeLabel} en direct`,
              message: `${title} — regardez la diffusion dans Lectorat.`,
              url: "/live",
              kind: "LIVE_STARTED",
              dedupeKey: `live_${live.id}_${u.id}_${stamp}`,
              userId: u.id,
            },
          })
          .catch(() => null)
      )
    );

    return NextResponse.json({ message: "Diffusion de l’événement lancée !", live });
  } catch (error) {
    console.error("Erreur Live:", error);
    return NextResponse.json({ message: "Erreur serveur" }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if ((session?.user as any)?.role !== "ADMIN") {
      return NextResponse.json({ message: "Non autorisé" }, { status: 403 });
    }
    const body = await req.json();
    const id = parseInt(body.id, 10);
    if (Number.isNaN(id)) return NextResponse.json({ message: "ID invalide" }, { status: 400 });

    if (body.isActive === true) {
      await prisma.live.updateMany({ where: { isActive: true }, data: { isActive: false } });
    }

    const live = await prisma.live.update({
      where: { id },
      data: {
        ...(typeof body.isActive === "boolean" ? { isActive: body.isActive } : {}),
        ...(body.title ? { title: body.title } : {}),
        ...(body.eventType ? { eventType: body.eventType } : {}),
        ...(body.description !== undefined ? { description: String(body.description || "").trim() || null } : {}),
        ...(body.roomName ? { roomName: body.roomName } : {}),
        ...(body.replayUrl !== undefined ? { replayUrl: body.replayUrl ? String(body.replayUrl) : null } : {}),
      },
    });
    return NextResponse.json(live);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ message: "Erreur serveur" }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if ((session?.user as any)?.role !== "ADMIN") {
      return NextResponse.json({ message: "Non autorisé" }, { status: 403 });
    }
    const { searchParams } = new URL(req.url);
    const id = parseInt(searchParams.get("id") || "", 10);
    if (Number.isNaN(id)) return NextResponse.json({ message: "ID invalide" }, { status: 400 });
    await prisma.live.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ message: "Erreur serveur" }, { status: 500 });
  }
}
