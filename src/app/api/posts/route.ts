import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { getServerSession } from "next-auth";
import { authOptions } from "../auth/[...nextauth]/route";

const prisma = new PrismaClient();

export async function GET() {
  try {
    const posts = await prisma.post.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        author: { select: { nom: true, prenom: true, photo: true } },
        likes: true,
        comments: {
          orderBy: { createdAt: "asc" },
          include: {
            user: { select: { id: true, nom: true, prenom: true, photo: true } },
          },
        },
      },
    });

    const readings = await prisma.dailyReading.findMany();
    const events = await prisma.event.findMany();
    const lives = await prisma.live.findMany();

    const formattedPosts = posts.map(p => ({ ...p, feedType: "POST" }));
    const formattedReadings = readings.map(r => ({
      id: `reading_${r.id}`, feedType: "ADMIN_READING",
      content: `📖 ${r.title}\n\nÉvangile : ${r.gospel}`,
      image: null, createdAt: r.createdAt,
      author: { prenom: "Paroisse", nom: "NODAFA", photo: null },
      likes: [], comments: [],
    }));
    const formattedEvents = events.map(e => ({
      id: `event_${e.id}`, feedType: "ADMIN_EVENT",
      content: `📅 ${e.title}\n${e.description}\nLe : ${new Date(e.eventDate).toLocaleDateString()}`,
      image: null, createdAt: e.createdAt,
      author: { prenom: "Paroisse", nom: "NODAFA", photo: null },
      likes: [], comments: [],
    }));
    const formattedLives = lives.map(l => ({
      id: `live_${l.id}`, feedType: "ADMIN_LIVE",
      content: `🔴 ${l.title}`,
      image: null, youtubeUrl: l.youtubeUrl, createdAt: l.createdAt,
      author: { prenom: "Paroisse", nom: "NODAFA", photo: null },
      likes: [], comments: [],
    }));

    const megaFeed = [...formattedPosts, ...formattedReadings, ...formattedEvents, ...formattedLives]
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    return NextResponse.json(megaFeed);
  } catch (error) {
    return NextResponse.json({ message: "Erreur serveur" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    const userSession = session?.user as any;
    if (!session || !userSession || !userSession.id) return NextResponse.json({ message: "Non autorisé" }, { status: 401 });

    const body = await req.json();
    const { content, image } = body;
    const post = await prisma.post.create({
      data: { content: content || "", image: image || null, authorId: parseInt(userSession.id), sharesCount: 0 },
      include: { author: { select: { nom: true, prenom: true, photo: true } }, likes: true, comments: true },
    });
    return NextResponse.json(post);
  } catch (error) {
    return NextResponse.json({ message: "Erreur serveur" }, { status: 500 });
  }
}