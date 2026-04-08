import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { resolveDashboardBillingPeriod } from "@/lib/dashboard-period";
import { LEGACY_EXPENSE_BILLING_YM } from "@/lib/expense-billing-ym";
import { sortMembersForBudgetDisplay } from "@/lib/member-display-order";
import { extendRecurringExpenses } from "@/lib/recurring-expenses";
import { addCivilMonths } from "@/lib/billing-ym-advance";

export type DashboardQueryParams = {
  from?: string | null;
  to?: string | null;
};

export async function getDashboardData(params: DashboardQueryParams = {}) {
  const session = await getSession();
  if (!session) return null;

  const userId = session.userId;
  const user = session.user;

  // familyId vem da sessão — sem round-trip extra para familyMember.findFirst
  const familyId = session.user.memberships[0]?.familyId;

  const period = resolveDashboardBillingPeriod(params.from, params.to);
  const billingYmFilter = { gte: period.ymFrom, lte: period.ymTo };
  const dateFilterCivil = { gte: period.start, lte: period.end };

  // Estende gastos fixos até 3 meses além do período consultado.
  // Custo: 1 groupBy (rápido) na maioria das chamadas; createMany só quando necessário.
  if (familyId) {
    await extendRecurringExpenses(familyId, addCivilMonths(period.ymTo, 3)).catch(
      (e) => console.error("[dashboard] extendRecurringExpenses error:", e)
    );
  }

  if (!familyId) {
    return {
      user,
      family: null,
      expenses: [],
      totalSpent: 0,
      daysInMonth: period.daysInPeriod,
      period: { from: period.from, to: period.to, ymFrom: period.ymFrom, ymTo: period.ymTo },
      periodLabel: period.periodLabel,
      categories: [],
      cards: [],
      spendByPayment: [],
      memberSpending: [],
      typeStats: { avulsa: 0, fixa: 0, parcelada: 0 },
    };
  }

  const expenseWhereInPeriod = {
    familyId,
    OR: [
      { billingYm: billingYmFilter },
      { billingYm: LEGACY_EXPENSE_BILLING_YM, date: dateFilterCivil },
    ],
  };

  // Todas as queries em paralelo — sem round-trip sequential
  const [
    familyMember,
    expenses,
    typeGroups,
    memberGroups,
    categoryGroups,
    cardGroups,
    categories,
    cards,
  ] = await Promise.all([
    db.familyMember.findFirst({
      where: { userId, familyId },
      select: {
        family: {
          select: {
            id: true, name: true, budget: true,
            members: {
              select: {
                userId: true, role: true, budget: true,
                user: { select: { name: true, avatar: true } },
              },
            },
          },
        },
      },
    }),
    db.expense.findMany({
      where: expenseWhereInPeriod,
      orderBy: [{ billingYm: "desc" }, { date: "desc" }],
      take: 5,
      select: {
        id: true, name: true, amount: true, date: true, billingYm: true,
        category: { select: { id: true, name: true } },
        responsible: { select: { id: true, name: true } },
        card: { select: { id: true, name: true, image: true } },
      },
    }),
    // groupBy no banco — muito mais eficiente que buscar todas as rows
    db.expense.groupBy({
      by: ["type"],
      where: expenseWhereInPeriod,
      _sum: { amount: true },
    }),
    db.expense.groupBy({
      by: ["responsibleId"],
      where: expenseWhereInPeriod,
      _sum: { amount: true },
    }),
    db.expense.groupBy({
      by: ["categoryId"],
      where: expenseWhereInPeriod,
      _sum: { amount: true },
    }),
    db.expense.groupBy({
      by: ["cardId"],
      where: expenseWhereInPeriod,
      _sum: { amount: true },
    }),
    db.category.findMany({
      where: { familyId },
      select: { id: true, name: true, limitAmount: true },
    }),
    db.card.findMany({
      where: { familyId },
      select: { id: true, name: true, statementClosingDay: true, image: true },
    }),
  ]);

  if (!familyMember) {
    return {
      user, family: null, expenses: [], totalSpent: 0,
      daysInMonth: period.daysInPeriod,
      period: { from: period.from, to: period.to, ymFrom: period.ymFrom, ymTo: period.ymTo },
      periodLabel: period.periodLabel,
      categories: [], cards: [], spendByPayment: [], memberSpending: [],
      typeStats: { avulsa: 0, fixa: 0, parcelada: 0 },
    };
  }

  const family = familyMember.family!;
  const daysInMonth = period.daysInPeriod;

  // Agrega resultados dos groupBy
  let totalSpent = 0;
  let avulsa = 0, fixa = 0, parcelada = 0;

  for (const g of typeGroups) {
    const amt = g._sum.amount ?? 0;
    totalSpent += amt;
    if (g.type === "fixa") fixa += amt;
    else if (g.type === "parcelada") parcelada += amt;
    else avulsa += amt;
  }

  const memberSpendMap = new Map<string, number>(
    memberGroups.map((g) => [g.responsibleId, g._sum.amount ?? 0])
  );
  const categorySpendMap = new Map<string | null, number>(
    categoryGroups.map((g) => [g.categoryId, g._sum.amount ?? 0])
  );
  const cardSpendMap = new Map<string | null, number>(
    cardGroups.map((g) => [g.cardId, g._sum.amount ?? 0])
  );

  type CategoryRow = { id: string; name: string; limitAmount: number };
  type Member = { userId: string; role: string; budget: number | null; user: { name: string; avatar: string | null } };

  const categoriesWithStats = (categories as CategoryRow[]).map((cat) => {
    const spent = categorySpendMap.get(cat.id) ?? 0;
    const percentage = cat.limitAmount > 0 ? Math.min(Math.round((spent / cat.limitAmount) * 100), 100) : 0;
    return { id: cat.id, name: cat.name, limitAmount: cat.limitAmount, spent, percentage };
  });

  const membersOrdered = sortMembersForBudgetDisplay([...(family.members as Member[])]);
  const membersWithBudget = membersOrdered.filter((m: Member) => (m.budget ?? 0) > 0);
  const totalAllocated = membersWithBudget.reduce((acc: number, m: Member) => acc + (m.budget ?? 0), 0);
  const remainingForOthers = Math.max(0, family.budget - totalAllocated);
  const membersWithoutBudget = membersOrdered.filter((m: Member) => (m.budget ?? 0) <= 0);
  const sharePerMember = membersWithoutBudget.length > 0 ? remainingForOthers / membersWithoutBudget.length : 0;

  const memberSpending = membersOrdered.map((member: Member) => {
    const personalBudget = (member.budget ?? 0) > 0 ? (member.budget ?? 0) : sharePerMember;
    return {
      userId: member.userId,
      name: member.user.name,
      avatar: member.user.avatar,
      role: member.role,
      spent: memberSpendMap.get(member.userId) ?? 0,
      dailyBudget: personalBudget > 0 ? personalBudget / daysInMonth : 0,
    };
  });

  type CardRow = { id: string; name: string; statementClosingDay: number | null; image: string | null };
  const spendByPayment = (cards as CardRow[]).map((c) => ({
    id: c.id, name: c.name, image: c.image,
    amount: cardSpendMap.get(c.id) ?? 0,
  }));
  const semPagamento = cardSpendMap.get(null) ?? 0;
  if (semPagamento > 0) {
    spendByPayment.push({ id: "__sem_pagamento__", name: "Sem pagamento", image: null, amount: semPagamento });
  }
  spendByPayment.sort((a, b) => b.amount - a.amount);

  return {
    user, family, expenses, totalSpent, daysInMonth,
    period: { from: period.from, to: period.to, ymFrom: period.ymFrom, ymTo: period.ymTo },
    periodLabel: period.periodLabel,
    categories: categoriesWithStats,
    cards,
    spendByPayment,
    memberSpending,
    typeStats: { avulsa, fixa, parcelada },
  };
}
