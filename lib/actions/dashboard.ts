import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { formatDateBrazil } from "@/lib/date-local";
import { parseDashboardPeriodParams } from "@/lib/dashboard-period";
import { parceladaAmountInPeriod } from "@/lib/parcelada-in-period";
import { sortMembersForBudgetDisplay } from "@/lib/member-display-order";

export type DashboardQueryParams = {
  from?: string | null;
  to?: string | null;
};

export async function getDashboardData(params: DashboardQueryParams = {}) {
  const session = await getSession();
  if (!session) return null;

  const userId = session.userId;
  const user = session.user;

  const familyMember = await db.familyMember.findFirst({
    where: { userId },
    select: {
      familyId: true,
      family: {
        select: {
          id: true,
          name: true,
          budget: true,
          members: {
            select: {
              userId: true,
              role: true,
              budget: true,
              user: { select: { name: true, avatar: true } },
            },
          },
        },
      },
    },
  });

  const period = parseDashboardPeriodParams(params.from, params.to);
  const dateFilter = { gte: period.start, lte: period.end };

  if (!familyMember) {
    return {
      user,
      family: null,
      expenses: [],
      totalSpent: 0,
      daysInMonth: period.daysInPeriod,
      period: { from: period.from, to: period.to },
      periodLabel: `${formatDateBrazil(period.start)} – ${formatDateBrazil(period.end)}`,
      categories: [],
      cards: [],
      spendByPayment: [],
      memberSpending: [],
      typeStats: { avulsa: 0, fixa: 0, parcelada: 0 },
    };
  }

  const family = familyMember.family;
  const familyId = family.id;

  const [expenses, inPeriodSimple, parceladasSpread, categories, cards] = await Promise.all([
    db.expense.findMany({
      where: { familyId, date: dateFilter },
      orderBy: { date: "desc" },
      take: 5,
      select: {
        id: true, name: true, amount: true, date: true,
        category: { select: { id: true, name: true } },
        responsible: { select: { id: true, name: true } },
        card: { select: { id: true, name: true, image: true } },
      },
    }),
    db.expense.findMany({
      where: {
        familyId,
        date: dateFilter,
        OR: [
          { type: { not: "parcelada" } },
          { totalInstallments: null },
          { totalInstallments: { lt: 2 } },
        ],
      },
      select: {
        amount: true,
        type: true,
        responsibleId: true,
        categoryId: true,
        cardId: true,
      },
    }),
    db.expense.findMany({
      where: { familyId, type: "parcelada", totalInstallments: { gte: 2 } },
      select: {
        amount: true,
        type: true,
        responsibleId: true,
        categoryId: true,
        cardId: true,
        date: true,
        currentInstallment: true,
        totalInstallments: true,
      },
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

  type SimpleRow = {
    amount: number;
    type: string;
    responsibleId: string;
    categoryId: string | null;
    cardId: string | null;
  };
  type SpreadRow = SimpleRow & {
    date: Date;
    currentInstallment: number | null;
    totalInstallments: number | null;
  };
  type CategoryRow = { id: string; name: string; limitAmount: number };
  type Member = { userId: string; role: string; budget: number | null; user: { name: string; avatar: string | null } };

  const daysInMonth = period.daysInPeriod;
  const pStart = period.start;
  const pEnd = period.end;

  let totalSpent = 0;
  let avulsa = 0;
  let fixa = 0;
  let parcelada = 0;

  const memberSpendMap = new Map<string, number>();
  const categorySpendMap = new Map<string, number>();
  const cardSpendMap = new Map<string | null, number>();

  const addToMap = (map: Map<string, number>, key: string | null, value: number) => {
    if (value === 0) return;
    if (key == null) return;
    map.set(key, (map.get(key) ?? 0) + value);
  };

  for (const e of inPeriodSimple as SimpleRow[]) {
    totalSpent += e.amount;
    if (e.type === "fixa") fixa += e.amount;
    else if (e.type === "parcelada") parcelada += e.amount;
    else avulsa += e.amount;
    memberSpendMap.set(e.responsibleId, (memberSpendMap.get(e.responsibleId) ?? 0) + e.amount);
    addToMap(categorySpendMap, e.categoryId, e.amount);
    cardSpendMap.set(e.cardId, (cardSpendMap.get(e.cardId) ?? 0) + e.amount);
  }

  for (const e of parceladasSpread as SpreadRow[]) {
    const contrib = parceladaAmountInPeriod(
      {
        date: e.date,
        amount: e.amount,
        currentInstallment: e.currentInstallment,
        totalInstallments: e.totalInstallments,
      },
      pStart,
      pEnd,
    );
    if (contrib === 0) continue;
    totalSpent += contrib;
    parcelada += contrib;
    memberSpendMap.set(e.responsibleId, (memberSpendMap.get(e.responsibleId) ?? 0) + contrib);
    addToMap(categorySpendMap, e.categoryId, contrib);
    cardSpendMap.set(e.cardId, (cardSpendMap.get(e.cardId) ?? 0) + contrib);
  }

  const categoriesWithStats = (categories as CategoryRow[]).map((cat: CategoryRow) => {
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
    id: c.id,
    name: c.name,
    image: c.image,
    amount: cardSpendMap.get(c.id) ?? 0,
  }));
  const semPagamento = cardSpendMap.get(null) ?? 0;
  if (semPagamento > 0) {
    spendByPayment.push({
      id: "__sem_pagamento__",
      name: "Sem pagamento",
      image: null,
      amount: semPagamento,
    });
  }
  spendByPayment.sort((a, b) => b.amount - a.amount);

  return {
    user,
    family,
    expenses,
    totalSpent,
    daysInMonth,
    period: { from: period.from, to: period.to },
    periodLabel: `${formatDateBrazil(period.start)} – ${formatDateBrazil(period.end)}`,
    categories: categoriesWithStats,
    cards,
    spendByPayment,
    memberSpending,
    typeStats: { avulsa, fixa, parcelada },
  };
}
