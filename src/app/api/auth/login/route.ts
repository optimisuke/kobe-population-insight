import { NextRequest, NextResponse } from "next/server";

async function sha256hex(text: string): Promise<string> {
  const buf = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(text)
  );
  return [...new Uint8Array(buf)]
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export async function POST(req: NextRequest) {
  const { password } = await req.json();
  const envPassword = process.env.AUTH_PASSWORD;

  if (!envPassword || typeof password !== "string" || password !== envPassword) {
    // タイミング攻撃を避けるため常に同じ遅延
    await new Promise((r) => setTimeout(r, 200));
    return NextResponse.json({ error: "Invalid password" }, { status: 401 });
  }

  const token = await sha256hex(envPassword);
  const res = NextResponse.json({ ok: true });
  res.cookies.set("auth-token", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/",
    maxAge: 60 * 60 * 24 * 30, // 30日
  });
  return res;
}
