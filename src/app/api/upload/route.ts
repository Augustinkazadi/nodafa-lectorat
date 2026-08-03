import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File;

    if (!file) return NextResponse.json({ message: "Aucun fichier" }, { status: 400 });

    // Convertir le fichier en base64
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const base64 = buffer.toString("base64");
    const mimeType = file.type;
    const dataUrl = `data:${mimeType};base64,${base64}`;

    return NextResponse.json({ url: dataUrl, name: file.name, type: file.type });
  } catch (error) {
    return NextResponse.json({ message: "Erreur upload" }, { status: 500 });
  }
}