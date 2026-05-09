"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

const VISITOR_ID_KEY = "pokedel_visitor_id";

function getVisitorId() {
  try {
    const existing = window.localStorage.getItem(VISITOR_ID_KEY);
    if (existing) return existing;

    const id =
      typeof window.crypto?.randomUUID === "function"
        ? window.crypto.randomUUID()
        : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    window.localStorage.setItem(VISITOR_ID_KEY, id);
    return id;
  } catch {
    return "anonymous";
  }
}

export default function AnalyticsTracker() {
  const pathname = usePathname();

  useEffect(() => {
    if (!pathname || pathname.startsWith("/admin")) return;

    const payload = JSON.stringify({
      path: pathname,
      visitorId: getVisitorId(),
    });

    if (navigator.sendBeacon) {
      navigator.sendBeacon(
        "/api/analytics/visit",
        new Blob([payload], { type: "application/json" }),
      );
      return;
    }

    fetch("/api/analytics/visit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: payload,
      keepalive: true,
    }).catch(() => {
      // Le suivi ne doit jamais bloquer la navigation du visiteur.
    });
  }, [pathname]);

  return null;
}
