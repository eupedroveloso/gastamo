import { cookies } from "next/headers";
import { NextResponse } from "next/server";

const SESSION_COOKIE = "gastamo_session";

export async function GET(request: Request) {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE);
  return NextResponse.redirect(new URL("/login", request.url));
}
