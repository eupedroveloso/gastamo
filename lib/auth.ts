import { cookies } from "next/headers";
import { cache } from "react";
import { db } from "./db";

const SESSION_COOKIE = "gastamo_session";
const SESSION_DAYS = 30;

/**
 * Só leitura de cookies — nunca chame .set/.delete aqui: em RSC isso quebra com
 * "Cookies can only be modified in a Server Action or Route Handler".
 * Cookie inválido: redirecione para `/api/auth/signout-expired`.
 */
async function _getSession() {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (!token) return null;

  let session;
  try {
    session = await db.session.findUnique({
      where: { token },
      include: {
        user: {
          include: {
            // familyId incluído aqui para evitar round-trip extra em cada página
            memberships: { select: { familyId: true }, take: 1 },
          },
        },
      },
    });
  } catch (e) {
    console.error("[auth] getSession DB error:", e);
    return null;
  }

  if (!session || session.expiresAt < new Date()) {
    if (session) await db.session.delete({ where: { id: session.id } }).catch(() => {});
    return null;
  }

  return session;
}

// Deduplicate within a single request – layout, page, and actions share the same result
export const getSession = cache(_getSession);

export async function createSession(userId: string) {
  const { randomBytes } = await import("crypto");
  const token = randomBytes(32).toString("hex");
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + SESSION_DAYS);

  await db.session.create({ data: { token, userId, expiresAt } });

  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    expires: expiresAt,
    path: "/",
  });
}

export async function deleteSession() {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (token) {
    await db.session.deleteMany({ where: { token } });
    cookieStore.delete(SESSION_COOKIE);
  }
}
