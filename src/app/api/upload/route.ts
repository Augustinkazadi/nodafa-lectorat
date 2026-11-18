import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { authOptions } from "../auth/[...nextauth]/route";
import { saveUploadedFile, usesBlobStorage, MediaKind, detectMediaKind } from "@/lib/upload";

export async function GET() {
  return NextResponse.json({
    mode: usesBlobStorage() ? "blob" : "local",
    maxNote:
      "Sur Vercel, activez Vercel Blob. Les uploads passent en direct navigateur → Blob (limite 4,5 Mo évitée).",
  });
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!(session?.user as any)?.id) {
      return NextResponse.json({ message: "Non autorisé" }, { status: 401 });
    }

    const contentType = req.headers.get("content-type") || "";

    // Protocole client Vercel Blob (upload direct depuis le navigateur)
    if (contentType.includes("application/json")) {
      const body = (await req.json()) as HandleUploadBody;
      const jsonResponse = await handleUpload({
        body,
        request: req,
        onBeforeGenerateToken: async (pathname) => {
          const kind = detectMediaKind("", pathname);
          if (!kind) throw new Error("Type de fichier non autorisé");
          return {
            allowedContentTypes: [
              "image/jpeg",
              "image/png",
              "image/gif",
              "image/webp",
              "video/mp4",
              "video/webm",
              "video/quicktime",
              "application/pdf",
              "audio/mpeg",
              "audio/mp4",
              "audio/webm",
              "audio/ogg",
              "audio/wav",
            ],
            maximumSizeInBytes: 80 * 1024 * 1024,
            tokenPayload: JSON.stringify({ userId: (session.user as any).id }),
          };
        },
      });
      return NextResponse.json(jsonResponse);
    }

    // Fallback FormData (dev local / petits fichiers)
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const scope = (formData.get("scope") as string) || "post";
    if (!file) return NextResponse.json({ message: "Aucun fichier" }, { status: 400 });

    const allowed: MediaKind[] =
      scope === "message" ? ["IMAGE", "VIDEO", "PDF", "AUDIO"] : ["IMAGE", "VIDEO", "PDF"];

    const uploaded = await saveUploadedFile(file, allowed);
    return NextResponse.json(uploaded);
  } catch (error: any) {
    console.error(error);
    return NextResponse.json({ message: error?.message || "Erreur upload" }, { status: 400 });
  }
}
