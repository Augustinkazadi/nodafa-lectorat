import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";
import { saveUploadedFile } from "@/lib/upload";
import { liveEventLabel } from "@/lib/liveEvents";

export async function GET() {
  try {
    const posts = await prisma.post.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        author: { select: { id: true, nom: true, prenom: true, photo: true, lastSeenAt: true } },
        likes: {
          orderBy: { createdAt: "desc" },
          include: {
            user: { select: { id: true, nom: true, prenom: true, photo: true, lastSeenAt: true } },
          },
        },
        comments: {
          orderBy: { createdAt: "asc" },
          include: {
            user: { select: { id: true, nom: true, prenom: true, photo: true, lastSeenAt: true } },
          },
        },
      },
    });

    // Lectures du jour (annonces spirituelles) + lives → journal
    // Calendrier liturgique (LiturgicalEvent) → UNIQUEMENT /calendrier (jamais ici)
    const readings = await prisma.dailyReading.findMany({
      orderBy: { date: "desc" },
      take: 14,
    });
    const lives = await prisma.live.findMany({
      orderBy: { createdAt: "desc" },
      take: 20,
    });

    const formattedPosts = posts.map((p) => ({
      ...p,
      feedType: "POST",
      mediaUrl: p.mediaUrl || p.image || null,
      mediaType: p.mediaType || (p.image ? "IMAGE" : null),
    }));

    const formattedReadings = readings.map((r) => ({
      id: `reading_${r.id}`,
      feedType: "ADMIN_READING",
      content: `📖 ${r.title}`,
      title: r.title,
      firstReading: r.firstReading || null,
      secondReading: r.secondReading || null,
      psalm: r.psalm || null,
      gospel: r.gospel || null,
      liturgicalColor: r.liturgicalColor || null,
      image: r.image || null,
      mediaUrl: r.image || null,
      mediaType: r.image ? "IMAGE" : null,
      createdAt: r.createdAt,
      author: { prenom: "Paroisse Notre Dame de Fatima", nom: "", photo: null },
      likes: [],
      comments: [],
    }));

    const formattedLives = lives.map((l) => ({
      id: `live_${l.id}`,
      feedType: "ADMIN_LIVE",
      content: `🔴 ${l.title}${l.isActive ? " — EN DIRECT" : ""}\n${liveEventLabel(l.eventType)}${l.description ? `\n${l.description}` : ""}`,
      title: l.title,
      eventType: l.eventType || null,
      description: l.description || null,
      image: null,
      mediaUrl: null,
      mediaType: null,
      roomName: l.roomName || null,
      youtubeUrl: l.youtubeUrl || null,
      replayUrl: l.replayUrl || null,
      isActive: l.isActive,
      createdAt: l.createdAt,
      author: { prenom: "Paroisse Notre Dame de Fatima", nom: "", photo: null },
      likes: [],
      comments: [],
    }));

    const megaFeed = [...formattedPosts, ...formattedReadings, ...formattedLives].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

    return NextResponse.json(megaFeed);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ message: "Erreur serveur" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    const userSession = session?.user as any;
    if (!session || !userSession?.id) {
      return NextResponse.json({ message: "Non autorisé" }, { status: 401 });
    }

    const contentType = req.headers.get("content-type") || "";
    let content = "";
    let mediaUrl: string | null = null;
    let mediaType: string | null = null;
    let mediaName: string | null = null;
    let image: string | null = null;

    if (contentType.includes("multipart/form-data")) {
      const formData = await req.formData();
      content = ((formData.get("content") as string) || "").trim();
      const file = formData.get("file") as File | null;
      if (file && file.size > 0) {
        const uploaded = await saveUploadedFile(file, ["IMAGE", "VIDEO", "PDF"]);
        mediaUrl = uploaded.url;
        mediaType = uploaded.mediaType;
        mediaName = uploaded.name;
        if (uploaded.mediaType === "IMAGE") image = uploaded.url;
      }
    } else {
      const body = await req.json();
      content = (body.content || "").trim();
      mediaUrl = body.mediaUrl || body.image || null;
      mediaType = body.mediaType || (body.image ? "IMAGE" : null);
      mediaName = body.mediaName || null;
      image = body.image || (mediaType === "IMAGE" ? mediaUrl : null);
    }

    if (!content && !mediaUrl) {
      return NextResponse.json({ message: "Texte ou fichier requis" }, { status: 400 });
    }

    const post = await prisma.post.create({
      data: {
        content: content || "",
        image,
        mediaUrl,
        mediaType,
        mediaName,
        authorId: parseInt(userSession.id),
        sharesCount: 0,
      },
      include: {
        author: { select: { id: true, nom: true, prenom: true, photo: true } },
        likes: true,
        comments: true,
      },
    });

    return NextResponse.json({ ...post, feedType: "POST" });
  } catch (error: any) {
    console.error(error);
    return NextResponse.json({ message: error?.message || "Erreur serveur" }, { status: 500 });
  }
}
