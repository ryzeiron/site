import { NextResponse } from "next/server";
import { lt, sql } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { getDb } from "@/lib/db/client";
import {
  activeVisitors,
  visitorDailyStats,
  visitorHourlyStats,
} from "@/lib/db/schema";

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
  const { day, hour } = getParisVisitorKeys(now);
  const userId = session?.user?.id ?? null;
  const userEmail = session?.user?.email ?? null;

  try {
    const db = getDb();

    await db
      .insert(activeVisitors)
      .values({
        visitorId,
        userId,
        userEmail,
        path,
        lastSeenAt: now,
      })
      .onConflictDoUpdate({
        target: activeVisitors.visitorId,
        set: {
          userId,
          userEmail,
          path,
          lastSeenAt: now,
        },
      });

    await db
      .insert(visitorDailyStats)
      .values({
        visitorId,
        day,
        userId,
        userEmail,
        firstPath: path,
        lastPath: path,
        firstSeenAt: now,
        lastSeenAt: now,
        pingCount: 1,
      })
      .onConflictDoUpdate({
        target: [visitorDailyStats.visitorId, visitorDailyStats.day],
        set: {
          userId,
          userEmail,
          lastPath: path,
          lastSeenAt: now,
          pingCount: sql`${visitorDailyStats.pingCount} + 1`,
        },
      });

    await db
      .insert(visitorHourlyStats)
      .values({
        visitorId,
        hour,
        day,
        userId,
        userEmail,
        firstPath: path,
        lastPath: path,
        firstSeenAt: now,
        lastSeenAt: now,
        pingCount: 1,
      })
      .onConflictDoUpdate({
        target: [visitorHourlyStats.visitorId, visitorHourlyStats.hour],
        set: {
          userId,
          userEmail,
          lastPath: path,
          lastSeenAt: now,
          pingCount: sql`${visitorHourlyStats.pingCount} + 1`,
        },
      });

    if (Math.random() < 0.02) {
      await db
        .delete(activeVisitors)
        .where(lt(activeVisitors.lastSeenAt, new Date(Date.now() - CLEANUP_AFTER_MS)))
        .catch(() => {});
    }
  } catch {
    return NextResponse.json({ ok: true, skipped: true });
  }

  return NextResponse.json({ ok: true });
}

function getParisVisitorKeys(date: Date) {
  const parts = new Intl.DateTimeFormat("fr-FR", {
    timeZone: "Europe/Paris",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);
  const values = Object.fromEntries(
    parts
      .filter((part) => part.type !== "literal")
      .map((part) => [part.type, part.value]),
  );
  const day = `${values.year}-${values.month}-${values.day}`;

  return {
    day,
    hour: `${day} ${values.hour}:00`,
  };
}
