import { NextResponse } from "next/server";
import { checkPassword, setAdminCookie } from "@/lib/admin/auth";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { password?: string };
    const password = body.password ?? "";
    if (!checkPassword(password)) {
      return NextResponse.json(
        { error: "Mot de passe incorrect." },
        { status: 401 },
      );
    }
    await setAdminCookie();
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Requête invalide." }, { status: 400 });
  }
}
