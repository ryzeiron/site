"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

const RETRY_DELAY_MS = 2500;
const MAX_RETRIES = 5;

// Le webhook Stripe credite les points une a deux secondes apres la redirection.
// On rafraichit donc la page quelques fois pour que l'animation finisse par
// s'afficher, sans que le client ait a recharger lui-meme.
export default function LoyaltyPendingRefresh() {
  const router = useRouter();

  useEffect(() => {
    let attempts = 0;

    const timer = setInterval(() => {
      attempts += 1;

      if (attempts > MAX_RETRIES) {
        clearInterval(timer);
        return;
      }

      router.refresh();
    }, RETRY_DELAY_MS);

    return () => clearInterval(timer);
  }, [router]);

  return null;
}
