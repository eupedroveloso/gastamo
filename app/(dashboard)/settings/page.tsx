import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { getPendingInvitesForUser } from "@/lib/data/settings-invites";
import { SettingsClient } from "@/components/settings-client";

export default async function SettingsPage() {
  const session = await getSession();
  if (!session) redirect("/api/auth/signout-expired");

  const user = session.user;

  const [membership, { sent: pendingInvitesSent, received: pendingInvitesReceived }] = await Promise.all([
    db.familyMember.findFirst({
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
              select: { id: true, name: true, statementClosingDay: true, dueDayOffset: true, image: true },
              orderBy: { createdAt: "asc" },
            },
          },
        },
      },
    }),
    getPendingInvitesForUser(db, user.id),
  ]);

  return (
    <SettingsClient
      user={{
        id: user.id,
        name: user.name,
        email: user.email,
        avatar: user.avatar,
      }}
      family={membership?.family ?? null}
      pendingInvitesSent={pendingInvitesSent.map((inv) => ({
        id: inv.id,
        inviteeName: inv.invitee.name,
        inviteeEmail: inv.invitee.email,
        inviteeAvatar: inv.invitee.avatar,
        familyName: inv.family.name,
        createdAt: inv.createdAt,
      }))}
      pendingInvitesReceived={pendingInvitesReceived.map((inv) => ({
        id: inv.id,
        inviterName: inv.inviter.name,
        familyName: inv.family.name,
        createdAt: inv.createdAt,
      }))}
    />
  );
}
