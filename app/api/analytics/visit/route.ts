import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db/client";
import { siteVisits } from "@/lib/db/schema";

function cleanText(value: unknown, maxLength: number) {
  return typeof value === "string" ? value.trim().slice(0, maxLength) : "";
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as { path?: unknown; visitorId?: unknown };
    const path = cleanText(body.path, 500);
    const visitorId = cleanText(body.visitorId, 120);

    if (!path || !visitorId || path.startsWith("/admin")) {
      return NextResponse.json({ ok: true });
    }

    const db = getDb();
    await db.insert(siteVisits).values({
      id: crypto.randomUUID(),
      visitorId,
      path,
      userAgent: req.headers.get("user-agent")?.slice(0, 500) ?? null,
      referer: req.headers.get("referer")?.slice(0, 500) ?? null,
    });

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("analytics visit failed", e);
    return NextResponse.json({ ok: true });
  }
}
