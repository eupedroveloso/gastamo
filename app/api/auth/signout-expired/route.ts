import { NextResponse } from "next/server";

const SESSION_COOKIE = "gastamo_session";

/** Limpa cookie de sessão inválida/expirada. Só em Route Handler (não em Server Components). */
export async function GET(request: Request) {
  const res = NextResponse.redirect(new URL("/login", request.url));
  res.cookies.delete(SESSION_COOKIE);
  return res;
}
