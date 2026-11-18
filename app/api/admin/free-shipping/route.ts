import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/admin/auth";
import {
  getFreeShippingPromo,
  saveFreeShippingPromo,
  sanitizeFreeShippingPromo,
} from "@/lib/free-shipping-promo";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "Non autorise." }, { status: 401 });
  }

  return NextResponse.json({ promo: await getFreeShippingPromo() });
}

export async function POST(request: Request) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "Non autorise." }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Requete invalide." }, { status: 400 });
  }

  const promo = sanitizeFreeShippingPromo(body);

  if (promo.startsAt && promo.endsAt && Date.parse(promo.endsAt) <= Date.parse(promo.startsAt)) {
    return NextResponse.json(
      { error: "La date de fin doit etre apres la date de debut." },
      { status: 400 },
    );
  }

  if (promo.active && promo.endsAt && Date.parse(promo.endsAt) <= Date.now()) {
    return NextResponse.json(
      { error: "La date de fin est deja passee." },
      { status: 400 },
    );
  }

  try {
    return NextResponse.json({ promo: await saveFreeShippingPromo(promo) });
  } catch {
    return NextResponse.json(
      {
        error:
          "Impossible d'enregistrer. As-tu lance la migration site_settings dans Neon ?",
      },
      { status: 500 },
    );
  }
}
