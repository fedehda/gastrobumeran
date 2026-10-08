import { NextRequest, NextResponse } from "next/server";
import { isSlugAvailable, generateSlug } from "@/lib/db/restaurant-repo";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const slug = searchParams.get("slug");
    const name = searchParams.get("name");

    if (slug) {
      const clean = slug.trim().toLowerCase();
      const available = isSlugAvailable(clean);
      return NextResponse.json({
        success: true,
        slug: clean,
        available,
        suggestion: available ? clean : generateSlug(clean),
      });
    }

    if (name) {
      const suggestion = generateSlug(name);
      return NextResponse.json({
        success: true,
        slug: suggestion,
        available: true,
      });
    }

    return NextResponse.json({ success: false, error: "Parámetro 'slug' o 'name' requerido." }, { status: 400 });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Error al validar slug";
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
