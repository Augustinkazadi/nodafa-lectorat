import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";
import { saveUploadedFile } from "@/lib/upload";
import { liveEventLabel } from "@/lib/liveEvents";
import { findReadingByIso, getOrSyncTodayReading } from "@/lib/aelf";
import { dateAtMidnight, dateKey } from "@/lib/datetime";

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

    // Journal : uniquement la lecture d’aujourd’hui (00h00 Kinshasa).
    // Les jours passés et les dimanches à venir restent sur /lecture-du-jour.
    let todayReading = null as Awaited<ReturnType<typeof getOrSyncTodayReading>>;
    try {
      todayReading = await getOrSyncTodayReading();
    } catch {
      /* ignore sync errors in feed */
    }
    if (!todayReading) {
      todayReading = await findReadingByIso(dateKey());
    }
    const readings = todayReading ? [todayReading] : [];
    const lives = await prisma.live.findMany({
      orderBy: { createdAt: "desc" },
      take: 20,
    });

    const formattedPosts = posts.map((p) => {
      const urls = normalizeMediaUrls(p.mediaUrls, p.mediaUrl || p.image);
      return {
        ...p,
        feedType: "POST",
        mediaUrl: p.mediaUrl || p.image || urls[0] || null,
        mediaType: p.mediaType || (p.image || urls.length ? "IMAGE" : null),
        mediaUrls: urls,
      };
    });

    const todayIso = dateKey();
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
      liturgicalSeason: r.liturgicalSeason || null,
      liturgicalYear: r.liturgicalYear || null,
      isSunday: r.isSunday,
      image: r.image || null,
      mediaUrl: r.image || null,
      mediaType: r.image ? "IMAGE" : null,
      // Apparition fixe à 00h00 (Kinshasa) pour le jour liturgique
      createdAt: dateAtMidnight(todayIso),
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
    let mediaUrls: string[] = [];

    if (contentType.includes("multipart/form-data")) {
      const formData = await req.formData();
      content = ((formData.get("content") as string) || "").trim();
      const file = formData.get("file") as File | null;
      if (file && file.size > 0) {
        const uploaded = await saveUploadedFile(file, ["IMAGE", "VIDEO", "PDF"]);
        mediaUrl = uploaded.url;
        mediaType = uploaded.mediaType;
        mediaName = uploaded.name;
        if (uploaded.mediaType === "IMAGE") {
          image = uploaded.url;
          mediaUrls = [uploaded.url];
        }
      }
    } else {
      const body = await req.json();
      content = (body.content || "").trim();
      const fromArray = Array.isArray(body.mediaUrls)
        ? body.mediaUrls.map((u: any) => String(u || "").trim()).filter(Boolean).slice(0, 10)
        : [];
      mediaUrls = fromArray;
      mediaUrl = body.mediaUrl || body.image || fromArray[0] || null;
      mediaType = body.mediaType || (mediaUrl && fromArray.length ? "IMAGE" : body.image ? "IMAGE" : null);
      mediaName = body.mediaName || null;
      image = body.image || (mediaType === "IMAGE" ? mediaUrl : null);
      if (mediaType === "IMAGE" && mediaUrl && !mediaUrls.length) mediaUrls = [mediaUrl];
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
        mediaUrls: mediaType === "IMAGE" && mediaUrls.length ? mediaUrls : undefined,
        authorId: parseInt(userSession.id),
        sharesCount: 0,
      },
      include: {
        author: { select: { id: true, nom: true, prenom: true, photo: true } },
        likes: true,
        comments: true,
      },
    });

    const urls = normalizeMediaUrls(post.mediaUrls, post.mediaUrl || post.image);
    return NextResponse.json({ ...post, feedType: "POST", mediaUrls: urls });
  } catch (error: any) {
    console.error(error);
    return NextResponse.json({ message: error?.message || "Erreur serveur" }, { status: 500 });
  }
}

function normalizeMediaUrls(raw: unknown, fallback?: string | null) {
  const list: string[] = [];
  if (Array.isArray(raw)) {
    for (const item of raw) {
      if (typeof item === "string" && item.trim()) list.push(item.trim());
      else if (item && typeof item === "object" && typeof (item as any).url === "string") {
        list.push(String((item as any).url).trim());
      }
    }
  }
  if (!list.length && fallback) list.push(fallback);
  return Array.from(new Set(list)).slice(0, 10);
}
