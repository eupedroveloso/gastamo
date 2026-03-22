import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { SettingsClient } from "@/components/settings-client";

export default async function SettingsPage() {
  const session = await getSession();
  if (!session) redirect("/api/auth/signout-expired");

  const user = session.user;

  const membership = await db.familyMember.findFirst({
    where: { userId: user.id },
    select: {
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
        },
      },
    },
  });

  return (
    <SettingsClient
      user={{
        id: user.id,
        name: user.name,
        email: user.email,
        avatar: user.avatar,
      }}
      family={membership?.family ?? null}
    />
  );
}
