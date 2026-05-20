import { NextResponse } from "next/server";
import { getSleevesByIds } from "@/lib/sleeves";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { ids?: string[] };
    const ids = Array.isArray(body.ids) ? body.ids.filter(Boolean) : [];

    if (ids.length === 0) {
      return NextResponse.json({ sleeves: [] });
    }

    const sleeves = await getSleevesByIds(ids);
    return NextResponse.json({ sleeves });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Erreur inconnue.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
