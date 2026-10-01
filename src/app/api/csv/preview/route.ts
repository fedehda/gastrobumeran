import { NextRequest, NextResponse } from "next/server";
import { inspectCsv } from "@/lib/csv/parser";

export async function POST(req: NextRequest) {
  try {
    const contentType = req.headers.get("content-type") || "";
    let csvContent = "";

    if (contentType.includes("multipart/form-data")) {
      const formData = await req.formData();
      const file = formData.get("file") as File | null;
      if (!file) {
        return NextResponse.json({ success: false, error: "No se proporcionó ningún archivo CSV." }, { status: 400 });
      }
      csvContent = await file.text();
    } else {
      const body = await req.json();
      csvContent = body.csvContent || "";
    }

    if (!csvContent.trim()) {
      return NextResponse.json({ success: false, error: "El contenido del archivo está vacío." }, { status: 400 });
    }

    const preview = inspectCsv(csvContent);

    return NextResponse.json({
      success: true,
      data: preview,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Error al previsualizar CSV";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
