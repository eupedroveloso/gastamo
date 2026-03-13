import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { getActiveFamilyId } from "@/lib/active-family";
import { SettingsClient } from "@/components/settings-client";

export default async function SettingsPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const user = session.user;

  const activeFamilyId = await getActiveFamilyId();

  const membership = activeFamilyId
    ? await db.familyMember.findFirst({
        where: { userId: user.id, familyId: activeFamilyId },
        select: {
          role: true,
          family: {
            select: {
              id: true,
              name: true,
              budget: true,
              members: {
                select: {
                  id: true,
                  role: true,
                  userId: true,
                  budget: true,
                  user: { select: { id: true, name: true, email: true, avatar: true } },
                },
              },
              categories: {
                select: { id: true, name: true, limitAmount: true },
                orderBy: { createdAt: "asc" },
              },
              cards: {
                select: { id: true, name: true },
                orderBy: { createdAt: "asc" },
              },
              invites: {
                where: { status: "pending" },
                select: {
                  id: true,
                  budget: true,
                  createdAt: true,
                  invitedUser: { select: { id: true, name: true, email: true, avatar: true } },
                  invitedBy: { select: { id: true, name: true } },
                },
                orderBy: { createdAt: "desc" },
              },
            },
          },
        },
      })
    : null;

  return (
    <SettingsClient
      user={{
        id: user.id,
        name: user.name,
        email: user.email,
        avatar: user.avatar,
      }}
      family={membership?.family ?? null}
      currentUserRole={membership?.role ?? "member"}
    />
  );
}
