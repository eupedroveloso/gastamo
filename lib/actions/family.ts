"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { ACTIVE_FAMILY_COOKIE } from "@/lib/active-family";

export async function setActiveFamily(familyId: string): Promise<void> {
  const session = await getSession();
  if (!session) return;

  const member = await db.familyMember.findFirst({
    where: { userId: session.userId, familyId },
  });
  if (!member) return;

  const cookieStore = await cookies();
  cookieStore.set(ACTIVE_FAMILY_COOKIE, familyId, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
  });

  revalidatePath("/");
  revalidatePath("/settings");
  revalidatePath("/transactions");
}

export async function getUserFamilies() {
  const session = await getSession();
  if (!session) return [];

  const memberships = await db.familyMember.findMany({
    where: { userId: session.userId },
    select: {
      role: true,
      family: { select: { id: true, name: true } },
    },
  });

  return memberships.map((m) => ({
    id: m.family.id,
    name: m.family.name,
    role: m.role,
  }));
}
