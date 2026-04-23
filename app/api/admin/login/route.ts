import { NextResponse } from "next/server";
import { ADMIN_COOKIE, makeAdminCookie } from "@/lib/admin/auth";

export async function POST(request: Request) {
  const form = await request.formData();
  const password = String(form.get("password") ?? "");
  const expected = process.env.ADMIN_PASSWORD;
  if (!expected) {
    return NextResponse.json(
      { error: "ADMIN_PASSWORD non configure." },
      { status: 500 },
    );
  }
  if (password !== expected) {
    const url = new URL("/admin/login?error=1", request.url);
    return NextResponse.redirect(url, { status: 303 });
  }
  const cookieValue = await makeAdminCookie(expected);
  const response = NextResponse.redirect(new URL("/admin", request.url), {
    status: 303,
  });
  response.cookies.set(ADMIN_COOKIE, cookieValue, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30, // 30 days
  });
  return response;
}
