"use server";

import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";

export async function getDashboardData() {
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

  if (!familyMember) {
    return { user, family: null, expenses: [], totalSpent: 0, categories: [], cards: [], memberSpending: [], typeStats: { avulsa: 0, fixa: 0, parcelada: 0 } };
  }

  const family = familyMember.family;
  const familyId = family.id;

  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
  const dateFilter = { gte: startOfMonth, lte: endOfMonth };

  const [expenses, monthExpenses, categories, cards] = await Promise.all([
    db.expense.findMany({
      where: { familyId },
      orderBy: { date: "desc" },
      take: 5,
      select: {
        id: true, name: true, amount: true, date: true,
        category: { select: { id: true, name: true } },
        responsible: { select: { id: true, name: true } },
        card: { select: { id: true, name: true } },
      },
    }),
    db.expense.findMany({
      where: { familyId, date: dateFilter },
      select: { amount: true, type: true, responsibleId: true },
    }),
    db.category.findMany({
      where: { familyId },
      select: {
        id: true, name: true, limitAmount: true,
        expenses: {
          where: { date: dateFilter },
          select: { amount: true },
        },
      },
    }),
    db.card.findMany({
      where: { familyId },
      select: { id: true, name: true },
    }),
  ]);

  const totalSpent = monthExpenses.reduce((acc: number, e) => acc + e.amount, 0);
  const daysInMonth = endOfMonth.getDate();

  let avulsa = 0, fixa = 0, parcelada = 0;
  for (const e of monthExpenses) {
    if (e.type === "fixa") fixa += e.amount;
    else if (e.type === "parcelada") parcelada += e.amount;
    else avulsa += e.amount;
  }

  const memberSpendMap = new Map<string, number>();
  for (const e of monthExpenses) {
    memberSpendMap.set(e.responsibleId, (memberSpendMap.get(e.responsibleId) ?? 0) + e.amount);
  }

  const categoriesWithStats = categories.map((cat) => {
    const spent = cat.expenses.reduce((acc: number, e) => acc + e.amount, 0);
    const percentage = cat.limitAmount > 0 ? Math.min(Math.round((spent / cat.limitAmount) * 100), 100) : 0;
    return { id: cat.id, name: cat.name, limitAmount: cat.limitAmount, spent, percentage };
  });

  const membersWithBudget = family.members.filter((m) => (m.budget ?? 0) > 0);
  const totalAllocated = membersWithBudget.reduce((acc: number, m) => acc + (m.budget ?? 0), 0);
  const remainingForOthers = Math.max(0, family.budget - totalAllocated);
  const membersWithoutBudget = family.members.filter((m) => (m.budget ?? 0) <= 0);
  const sharePerMember = membersWithoutBudget.length > 0 ? remainingForOthers / membersWithoutBudget.length : 0;

  const memberSpending = family.members.map((member) => {
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

  return {
    user,
    family,
    expenses,
    totalSpent,
    daysInMonth,
    categories: categoriesWithStats,
    cards,
    memberSpending,
    typeStats: { avulsa, fixa, parcelada },
  };
}
