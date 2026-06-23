"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

const STORAGE_KEY = "pokedel-visitor-id";
const HEARTBEAT_INTERVAL_MS = 60_000;

function createVisitorId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }

  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
}

function getVisitorId() {
  try {
    const existing = window.localStorage.getItem(STORAGE_KEY);
    if (existing) return existing;

    const visitorId = createVisitorId();
    window.localStorage.setItem(STORAGE_KEY, visitorId);
    return visitorId;
  } catch {
    return createVisitorId();
  }
}

async function sendPresence(visitorId: string, path: string) {
  await fetch("/api/analytics/presence", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ visitorId, path }),
    keepalive: true,
  }).catch(() => {});
}

export default function PresenceHeartbeat() {
  const pathname = usePathname();

  useEffect(() => {
    if (!pathname || pathname.startsWith("/admin")) return;

    const visitorId = getVisitorId();
    sendPresence(visitorId, pathname);

    const interval = window.setInterval(() => {
      if (document.visibilityState === "visible") {
        sendPresence(visitorId, window.location.pathname);
      }
    }, HEARTBEAT_INTERVAL_MS);

    return () => window.clearInterval(interval);
  }, [pathname]);

  return null;
}
