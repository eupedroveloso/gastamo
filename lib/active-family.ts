import { cookies } from "next/headers";
import { getSession } from "./auth";
import { db } from "./db";

export const ACTIVE_FAMILY_COOKIE = "gastamo_active_family";

export async function getActiveFamilyId(): Promise<string | null> {
  const session = await getSession();
  if (!session) return null;

  const cookieStore = await cookies();
  const activeId = cookieStore.get(ACTIVE_FAMILY_COOKIE)?.value;

  if (activeId) {
    const member = await db.familyMember.findFirst({
      where: { userId: session.userId, familyId: activeId },
    });
    if (member) return activeId;
  }

  const firstMember = await db.familyMember.findFirst({
    where: { userId: session.userId },
  });
  return firstMember?.familyId ?? null;
}
