"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";

const STORAGE_KEY = "pokedel-visitor-id";
// Plus de ping automatique en arriere-plan : un onglet laisse ouvert envoyait
// un signal toutes les 5 minutes, ce qui empechait Neon de se mettre en veille
// (il s'endort apres 5 minutes sans requete) et faisait payer la base 24 h/24.
// On ne signale plus la presence qu'a la navigation, au plus une fois toutes
// les 5 minutes par visiteur.
const MIN_INTERVAL_BETWEEN_PINGS_MS = 300_000;

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
    // Robots / navigateurs automatises : pas de statistiques, pas de base.
    if (navigator.webdriver) return;

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
  }, [pathname]);

  return null;
}
