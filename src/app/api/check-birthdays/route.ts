import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../auth/[...nextauth]/route";
import { syncBirthdayNotifications } from "@/lib/birthdays";

function isAuthorized(req: Request, session: any) {
  const cronSecret = process.env.CRON_SECRET;
  const authHeader = req.headers.get("authorization");
  if (cronSecret && authHeader === `Bearer ${cronSecret}`) return true;
  // Cron Vercel (Hobby/Pro)
  if (req.headers.get("x-vercel-cron") === "1") return true;
  if (session?.user) return true;
  return false;
}

async function run(req: Request) {
  const session = await getServerSession(authOptions);
  if (!isAuthorized(req, session)) {
    return NextResponse.json({ message: "Non autorisé" }, { status: 401 });
  }

  const result = await syncBirthdayNotifications(new Date());
  return NextResponse.json({
    message: "Anniversaires synchronisés",
    ...result,
  });
}

export async function GET(req: Request) {
  try {
    return await run(req);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ message: "Erreur serveur" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    return await run(req);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ message: "Erreur serveur" }, { status: 500 });
  }
}
