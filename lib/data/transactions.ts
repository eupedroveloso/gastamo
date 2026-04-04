import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { sortMembersForBudgetDisplay } from "@/lib/member-display-order";

/** Dados da página de transações — módulo sem "use server" para uso em Server Components. */
export async function getTransactionsData() {
  const session = await getSession();
  if (!session) return null;

  // familyId vem da sessão — sem round-trip extra para familyMember.findFirst
  const familyId = session.user.memberships[0]?.familyId;
  if (!familyId) return null;

  const [expenses, categories, cards, members] = await Promise.all([
    db.expense.findMany({
      where: { familyId },
      orderBy: [{ billingYm: "desc" }, { date: "desc" }],
      take: 3000, // limite de segurança: parcelado(12) + fixa(24) geram muitos registros
      select: {
        id: true, name: true, amount: true, date: true, type: true, billingYm: true,
        pending: true, totalInstallments: true, currentInstallment: true, invoiceId: true,
        category: { select: { id: true, name: true } },
        responsible: { select: { id: true, name: true } },
        card: { select: { id: true, name: true, image: true } },
      },
    }),
    db.category.findMany({
      where: { familyId },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
    db.card.findMany({
      where: { familyId },
      select: { id: true, name: true, image: true, statementClosingDay: true, dueDayOffset: true },
      orderBy: { name: "asc" },
    }),
    db.familyMember.findMany({
      where: { familyId },
      select: { userId: true, role: true, user: { select: { id: true, name: true } } },
    }),
  ]);

  const membersSorted = sortMembersForBudgetDisplay(members);

  return {
    expenses,
    categories,
    cards,
    members: membersSorted.map((m: { userId: string; user: { id: string; name: string } }) => ({
      userId: m.userId,
      name: m.user.name,
    })),
  };
}
