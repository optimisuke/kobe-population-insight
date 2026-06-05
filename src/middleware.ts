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

export async function middleware(req: NextRequest) {
  const password = process.env.AUTH_PASSWORD;

  // AUTH_PASSWORD 未設定なら認証スキップ（ローカル開発）
  if (!password) return NextResponse.next();

  const path = req.nextUrl.pathname;
  if (path.startsWith("/login") || path.startsWith("/api/auth")) {
    return NextResponse.next();
  }

  const token = req.cookies.get("auth-token")?.value;
  const expected = await sha256hex(password);

  if (token !== expected) {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.svg).*)"],
};
