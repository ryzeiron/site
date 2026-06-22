import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { getDb } from "@/lib/db/client";
import { userDeliveryProfiles, users } from "@/lib/db/schema";
import {
  hasDeliveryProfileData,
  normalizeDeliveryProfileInput,
} from "@/lib/delivery-profile";
import { discordAdminUrl, sendDiscordNotification } from "@/lib/discord";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(request: Request) {
  let body: {
    email?: string;
    password?: string;
    name?: string;
    deliveryProfile?: unknown;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Requête invalide." }, { status: 400 });
  }

  const email = String(body.email ?? "").trim().toLowerCase();
  const password = String(body.password ?? "");
  const name = body.name ? String(body.name).trim().slice(0, 100) : null;

  if (!EMAIL_RE.test(email)) {
    return NextResponse.json({ error: "Email invalide." }, { status: 400 });
  }
  if (password.length < 8) {
    return NextResponse.json(
      { error: "Le mot de passe doit faire au moins 8 caracteres." },
      { status: 400 },
    );
  }

  const db = getDb();
  const existing = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.email, email))
    .limit(1);

  if (existing.length > 0) {
    return NextResponse.json(
      { error: "Un compte existe déjà avec cet email." },
      { status: 409 },
    );
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const id = randomUUID();

  await db.insert(users).values({
    id,
    email,
    passwordHash,
    name,
  });

  const deliveryProfile = normalizeDeliveryProfileInput(
    typeof body.deliveryProfile === "object" && body.deliveryProfile !== null
      ? body.deliveryProfile
      : {},
  );

  if (hasDeliveryProfileData(deliveryProfile)) {
    try {
      await db.insert(userDeliveryProfiles).values({
        userId: id,
        ...deliveryProfile,
      });
    } catch {
      // Le compte reste créé même si le profil livraison n'est pas disponible.
    }
  }

  const hasProfile = hasDeliveryProfileData(deliveryProfile);

  await sendDiscordNotification("accounts", {
    title: "Nouveau compte cree",
    description: `[Ouvrir les clients admin](${discordAdminUrl("/admin/clients")})`,
    fields: [
      { name: "Nom", value: name ?? "-", inline: true },
      { name: "Email", value: email, inline: false },
      {
        name: "Profil livraison",
        value: hasProfile ? "Oui" : "Non",
        inline: true,
      },
      {
        name: "Point relais",
        value: deliveryProfile.relayName
          ? `${deliveryProfile.relayName}${deliveryProfile.relayCode ? ` (${deliveryProfile.relayCode})` : ""}`
          : "-",
        inline: false,
      },
    ],
  }).catch(() => false);

  return NextResponse.json({ ok: true });
}
