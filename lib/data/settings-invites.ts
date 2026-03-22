import type { Prisma } from "@prisma/client";
import type { PrismaClient } from "@prisma/client";

const includeSent = {
  invitee: { select: { name: true, email: true, avatar: true } },
  family: { select: { name: true } },
} satisfies Prisma.FamilyInviteInclude;

const includeReceived = {
  inviter: { select: { name: true } },
  family: { select: { name: true } },
} satisfies Prisma.FamilyInviteInclude;

export type PendingInviteSent = Prisma.FamilyInviteGetPayload<{ include: typeof includeSent }>;
export type PendingInviteReceived = Prisma.FamilyInviteGetPayload<{ include: typeof includeReceived }>;

/**
 * Convites pendentes. Se o Prisma Client estiver desatualizado (sem `familyInvite` no runtime),
 * retorna listas vazias — rode `npx prisma generate` e reinicie o `next dev`.
 */
export async function getPendingInvitesForUser(
  db: PrismaClient,
  userId: string
): Promise<{ sent: PendingInviteSent[]; received: PendingInviteReceived[] }> {
  const delegate = (db as unknown as { familyInvite?: { findMany: PrismaClient["familyInvite"]["findMany"] } })
    .familyInvite;

  if (!delegate?.findMany) {
    if (process.env.NODE_ENV === "development") {
      console.warn(
        "[gastamo] db.familyInvite indisponível — execute `npx prisma generate` e reinicie o servidor de desenvolvimento."
      );
    }
    return { sent: [], received: [] };
  }

  const now = new Date();
  const [sent, received] = await Promise.all([
    delegate.findMany({
      where: { inviterId: userId, status: "pending", expiresAt: { gt: now } },
      include: includeSent,
      orderBy: { createdAt: "desc" },
    }),
    delegate.findMany({
      where: { inviteeId: userId, status: "pending", expiresAt: { gt: now } },
      include: includeReceived,
      orderBy: { createdAt: "desc" },
    }),
  ]);

  return { sent, received };
}
