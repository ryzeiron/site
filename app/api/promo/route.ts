import { NextResponse } from "next/server";
import { getPromo } from "@/lib/promo";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { code?: string };
    const promo = getPromo(body.code);
    if (!promo) {
      return NextResponse.json(
        { error: "Code promo invalide." },
        { status: 404 },
      );
    }
    return NextResponse.json({ promo });
  } catch {
    return NextResponse.json({ error: "Requete invalide." }, { status: 400 });
  }
}
