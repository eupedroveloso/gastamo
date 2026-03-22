import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";

/** Dados da página de transações — módulo sem "use server" para uso em Server Components. */
export async function getTransactionsData() {
  const session = await getSession();
  if (!session) return null;

  const member = await db.familyMember.findFirst({
    where: { userId: session.userId },
    select: { familyId: true },
  });
  if (!member) return null;

  const fid = member.familyId;

  const [expenses, categories, cards, members] = await Promise.all([
    db.expense.findMany({
      where: { familyId: fid },
      orderBy: { date: "desc" },
      select: {
        id: true, name: true, amount: true, date: true, type: true,
        pending: true, totalInstallments: true, currentInstallment: true, invoiceId: true,
        category: { select: { id: true, name: true } },
        responsible: { select: { id: true, name: true } },
        card: { select: { id: true, name: true } },
      },
    }),
    db.category.findMany({
      where: { familyId: fid },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
    db.card.findMany({
      where: { familyId: fid },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
    db.familyMember.findMany({
      where: { familyId: fid },
      select: { userId: true, user: { select: { id: true, name: true } } },
    }),
  ]);

  return {
    expenses,
    categories,
    cards,
    members: members.map((m: { userId: string; user: { id: string; name: string } }) => ({
      userId: m.userId,
      name: m.user.name,
    })),
  };
}
