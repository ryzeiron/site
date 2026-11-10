"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";

const STORAGE_KEY = "pokedel-visitor-id";
// Chaque ping ecrit trois lignes en base. A 60 s, un seul onglet ouvert
// empechait la base de se mettre en veille et generait des milliers
// d'ecritures par jour. A 5 minutes, la presence reste utilisable pour les
// stats et la base peut s'endormir entre deux visiteurs.
const HEARTBEAT_INTERVAL_MS = 300_000;

// Un visiteur qui parcourt dix cartes declenchait dix pings. On n'en renvoie un
// a la navigation que si le precedent date d'assez longtemps.
const MIN_INTERVAL_BETWEEN_PINGS_MS = 120_000;

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
  const dernierPing = useRef(0);

  useEffect(() => {
    if (!pathname || pathname.startsWith("/admin")) return;

    const visitorId = getVisitorId();

    function ping(path: string) {
      const maintenant = Date.now();
      if (maintenant - dernierPing.current < MIN_INTERVAL_BETWEEN_PINGS_MS) {
        return;
      }

      dernierPing.current = maintenant;
      void sendPresence(visitorId, path);
    }

    ping(pathname);

    const interval = window.setInterval(() => {
      if (document.visibilityState === "visible") {
        ping(window.location.pathname);
      }
    }, HEARTBEAT_INTERVAL_MS);

    return () => window.clearInterval(interval);
  }, [pathname]);

  return null;
}
