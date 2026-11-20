import "server-only";

import { headers } from "next/headers";

const BOT_USER_AGENT_PATTERN =
  /(bot|crawler|spider|crawling|googlebot|bingbot|slurp|duckduckbot|baiduspider|yandex|facebookexternalhit|twitterbot|linkedinbot|discordbot|whatsapp|semrush|ahrefs|mj12bot|dotbot|petalbot|bytespider|applebot|adsbot-google|mediapartners-google|apis-google|google-inspectiontool|googleother|google-read-aloud|feedfetcher|headlesschrome|lighthouse|python-requests|python-urllib|aiohttp|curl\/|wget|go-http-client|java\/|okhttp|scrapy|axios|node-fetch|undici|libwww|httpclient|uptimerobot|statuscake|site24x7|pingdom|barkrowler|crawl)/i;

export function isBotUserAgent(userAgent: string | null | undefined) {
  const value = userAgent?.trim() ?? "";
  return !value || BOT_USER_AGENT_PATTERN.test(value);
}

export async function shouldUseLivePublicData() {
  const requestHeaders = await headers();
  const userAgent = requestHeaders.get("user-agent")?.trim() ?? "";

  if (!userAgent) return false;

  return !BOT_USER_AGENT_PATTERN.test(userAgent);
}
