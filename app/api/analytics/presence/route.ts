import { NextResponse } from "next/server";
import { lt } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { getDb } from "@/lib/db/client";
import { activeVisitors } from "@/lib/db/schema";

export const runtime = "nodejs";

type Body = {
  visitorId?: string;
  path?: string;
};

const VISITOR_ID_RE = /^[a-z0-9-]{8,80}$/i;
const MAX_PATH_LENGTH = 180;
const CLEANUP_AFTER_MS = 24 * 60 * 60 * 1000;

export async function POST(request: Request) {
  let body: Body;

  try {
    body = (await request.json()) as Body;
  } catch {
    return NextResponse.json({ error: "Requete invalide." }, { status: 400 });
  }

  const visitorId = body.visitorId?.trim() ?? "";
  if (!VISITOR_ID_RE.test(visitorId)) {
    return NextResponse.json({ error: "Visiteur invalide." }, { status: 400 });
  }

  const rawPath = body.path?.trim() ?? "/";
  const path = rawPath.startsWith("/") ? rawPath.slice(0, MAX_PATH_LENGTH) : "/";
  const session = await auth().catch(() => null);
  const now = new Date();

  try {
    await getDb()
      .insert(activeVisitors)
      .values({
        visitorId,
        userId: session?.user?.id ?? null,
        userEmail: session?.user?.email ?? null,
        path,
        lastSeenAt: now,
      })
      .onConflictDoUpdate({
        target: activeVisitors.visitorId,
        set: {
          userId: session?.user?.id ?? null,
          userEmail: session?.user?.email ?? null,
          path,
          lastSeenAt: now,
        },
      });

    if (Math.random() < 0.02) {
      await getDb()
        .delete(activeVisitors)
        .where(lt(activeVisitors.lastSeenAt, new Date(Date.now() - CLEANUP_AFTER_MS)))
        .catch(() => {});
    }
  } catch {
    return NextResponse.json({ ok: true, skipped: true });
  }

  return NextResponse.json({ ok: true });
}
