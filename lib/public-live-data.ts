import "server-only";

import { headers } from "next/headers";

const BOT_USER_AGENT_PATTERN =
  /(bot|crawler|spider|crawling|googlebot|bingbot|slurp|duckduckbot|baiduspider|yandex|facebookexternalhit|twitterbot|linkedinbot|discordbot|whatsapp|semrush|ahrefs|mj12bot|dotbot|petalbot|bytespider|applebot|adsbot-google|mediapartners-google|apis-google|google-inspectiontool)/i;

export async function shouldUseLivePublicData() {
  const requestHeaders = await headers();
  const userAgent = requestHeaders.get("user-agent")?.trim() ?? "";

  if (!userAgent) return false;

  return !BOT_USER_AGENT_PATTERN.test(userAgent);
}
