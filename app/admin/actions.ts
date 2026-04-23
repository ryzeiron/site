"use server";

import { db } from "@/lib/db/client";
import { cards as cardsTable } from "@/lib/db/schema";
import { eq, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { ADMIN_COOKIE, verifyAdminCookie } from "@/lib/admin/auth";

async function assertAdmin() {
  const cookieStore = await cookies();
  const cookie = cookieStore.get(ADMIN_COOKIE)?.value;
  const ok = await verifyAdminCookie(cookie);
  if (!ok) throw new Error("Non autorise.");
}

export async function updateCard(
  id: string,
  data: { stock?: number; price?: number; rarity?: string },
) {
  await assertAdmin();
  const update: Record<string, unknown> = {
    updatedAt: sql`now()`,
  };
  if (data.stock !== undefined) update.stock = data.stock;
  if (data.price !== undefined) update.price = data.price;
  if (data.rarity !== undefined) update.rarity = data.rarity;
  await db.update(cardsTable).set(update).where(eq(cardsTable.id, id));
  revalidatePath("/admin");
  revalidatePath("/");
  revalidatePath("/blocs", "layout");
}
