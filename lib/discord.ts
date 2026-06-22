import "server-only";

import { normalizeSiteUrl } from "@/lib/site-url";

export type DiscordChannel =
  | "accounts"
  | "orders"
  | "preparation"
  | "stock"
  | "favorites"
  | "reviews"
  | "errors";

type DiscordField = {
  name: string;
  value: string | null | undefined;
  inline?: boolean;
};

type DiscordNotification = {
  title: string;
  description?: string | null;
  fields?: DiscordField[];
  color?: number;
};

const CHANNEL_ENV: Record<DiscordChannel, string> = {
  accounts: "DISCORD_ACCOUNTS_WEBHOOK_URL",
  orders: "DISCORD_ORDER_WEBHOOK_URL",
  preparation: "DISCORD_PREPARATION_WEBHOOK_URL",
  stock: "DISCORD_STOCK_WEBHOOK_URL",
  favorites: "DISCORD_FAVORITES_WEBHOOK_URL",
  reviews: "DISCORD_REVIEWS_WEBHOOK_URL",
  errors: "DISCORD_ERRORS_WEBHOOK_URL",
};

const CHANNEL_COLOR: Record<DiscordChannel, number> = {
  accounts: 0x8b5cf6,
  orders: 0x7c3aed,
  preparation: 0x38bdf8,
  stock: 0xf59e0b,
  favorites: 0xec4899,
  reviews: 0x22c55e,
  errors: 0xef4444,
};

export function discordValue(value: string | null | undefined, fallback = "-") {
  const cleaned = value?.trim();
  if (!cleaned) return fallback;
  return cleaned.length > 1000 ? `${cleaned.slice(0, 997)}...` : cleaned;
}

export function discordSiteUrl() {
  return normalizeSiteUrl(
    process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000",
  );
}

export function discordAdminUrl(path = "/admin") {
  return `${discordSiteUrl()}${path}`;
}

function getWebhookUrl(channel: DiscordChannel) {
  return (
    process.env[CHANNEL_ENV[channel]]?.trim() ||
    process.env.DISCORD_ADMIN_WEBHOOK_URL?.trim() ||
    process.env.DISCORD_ORDER_WEBHOOK_URL?.trim() ||
    null
  );
}

export async function sendDiscordNotification(
  channel: DiscordChannel,
  notification: DiscordNotification,
) {
  const webhookUrl = getWebhookUrl(channel);
  if (!webhookUrl) return false;

  const response = await fetch(webhookUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      username: "PokeDel62",
      allowed_mentions: { parse: [] },
      embeds: [
        {
          title: notification.title,
          color: notification.color ?? CHANNEL_COLOR[channel],
          description: notification.description ?? undefined,
          fields: (notification.fields ?? []).map((field) => ({
            name: field.name,
            value: discordValue(field.value),
            inline: field.inline ?? false,
          })),
          timestamp: new Date().toISOString(),
        },
      ],
    }),
  });

  if (!response.ok) {
    throw new Error(`Discord webhook error ${response.status}`);
  }

  return true;
}

export async function sendDiscordErrorNotification({
  title,
  message,
  route,
}: {
  title: string;
  message: string;
  route?: string;
}) {
  return sendDiscordNotification("errors", {
    title,
    fields: [
      { name: "Erreur", value: message, inline: false },
      { name: "Route", value: route ?? "-", inline: false },
    ],
  });
}
