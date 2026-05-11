export function normalizeSiteUrl(url: string): string {
  return url.replace(/\/+$/, "");
}

export function getRequestOrigin(request: Request): string {
  return normalizeSiteUrl(
    process.env.NEXT_PUBLIC_SITE_URL ??
      request.headers.get("origin") ??
      "http://localhost:3000",
  );
}
