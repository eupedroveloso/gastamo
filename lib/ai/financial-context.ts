"use server";

import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { formatDateBrazil, getTodayBrazilYMD } from "@/lib/date-local";
import { brazilCivilMonthDateRangeFromBillingYm, LEGACY_EXPENSE_BILLING_YM } from "@/lib/expense-billing-ym";
import { sortMembersForBudgetDisplay } from "@/lib/member-display-order";

export interface FinancialContext {
  userName: string;
  familyName: string;
  currentMonth: string;
  currentYear: number;
  budget: number;
  totalSpentThisMonth: number;
  remainingBudget: number;
  budgetUsedPercent: number;

  typeBreakdown: {
    avulsa: number;
    fixa: number;
    parcelada: number;
  };

  categories: {
    name: string;
    spent: number;
    limit: number;
    usagePercent: number;
  }[];

  topExpenses: {
    name: string;
    amount: number;
    type: string;
    category: string;
    card: string;
    responsible: string;
    date: string;
  }[];

  allExpensesThisMonth: {
    name: string;
    amount: number;
    type: string;
    category: string;
    card: string;
    responsible: string;
    date: string;
  }[];

  members: {
    name: string;
    spent: number;
    percentOfTotal: number;
  }[];

  cards: string[];
  categoriesAvailable: string[];
}


export async function buildFinancialContext(): Promise<FinancialContext | null> {
  const session = await getSession();
  if (!session) return null;

  const member = await db.familyMember.findFirst({
    where: { userId: session.userId },
    include: {
      family: {
        include: {
          members: { include: { user: true } },
          categories: true,
          cards: true,
        },
      },
    },
  });

  if (!member) return null;

  const family = member.family;
  const todayYmd = getTodayBrazilYMD();
  const currentBillingYm = todayYmd.slice(0, 7);
  const monthIndex = parseInt(todayYmd.slice(5, 7), 10) - 1;
  const currentYear = parseInt(todayYmd.slice(0, 4), 10);

  const { start: civilMonthStart, end: civilMonthEnd } =
    brazilCivilMonthDateRangeFromBillingYm(currentBillingYm);
  const aiPeriodWhere = {
    familyId: family.id,
    OR: [
      { billingYm: currentBillingYm },
      { billingYm: LEGACY_EXPENSE_BILLING_YM, date: { gte: civilMonthStart, lte: civilMonthEnd } },
    ],
  };

  const [monthExpenses, inPeriodRows] = await Promise.all([
    db.expense.findMany({
      where: aiPeriodWhere,
      orderBy: { amount: "desc" },
      include: {
        category: true,
        card: true,
        responsible: true,
      },
    }),
    db.expense.findMany({
      where: aiPeriodWhere,
      select: {
        amount: true,
        type: true,
        responsibleId: true,
        categoryId: true,
      },
    }),
  ]);

  type Expense = {
    amount: number; type: string; responsibleId: string; name: string; date: Date;
    category: { name: string } | null; card: { name: string } | null; responsible: { name: string };
  };
  type SimpleAgg = { amount: number; type: string; responsibleId: string; categoryId: string | null };
  type FamilyCategory = { id: string; name: string; limitAmount: number };
  type FamilyMember = { userId: string; role: string; user: { name: string } };

  const categorySpendMap = new Map<string, number>();
  const memberSpendMap = new Map<string, number>();
  let totalSpent = 0;
  let avulsa = 0;
  let fixa = 0;
  let parcelada = 0;

  const addCat = (categoryId: string | null, value: number) => {
    if (categoryId == null || value === 0) return;
    categorySpendMap.set(categoryId, (categorySpendMap.get(categoryId) ?? 0) + value);
  };

  for (const e of inPeriodRows as SimpleAgg[]) {
    totalSpent += e.amount;
    if (e.type === "fixa") fixa += e.amount;
    else if (e.type === "parcelada") parcelada += e.amount;
    else avulsa += e.amount;
    memberSpendMap.set(e.responsibleId, (memberSpendMap.get(e.responsibleId) ?? 0) + e.amount);
    addCat(e.categoryId, e.amount);
  }

  const budget = family.budget;
  const remaining = budget - totalSpent;

  const typeBreakdown = { avulsa, fixa, parcelada };

  const categories = (family.categories as FamilyCategory[]).map((cat: FamilyCategory) => {
    const spent = categorySpendMap.get(cat.id) ?? 0;
    return {
      name: cat.name,
      spent,
      limit: cat.limitAmount,
      usagePercent: cat.limitAmount > 0 ? Math.round((spent / cat.limitAmount) * 100) : 0,
    };
  });

  const topExpenses = (monthExpenses as Expense[]).slice(0, 10).map((e: Expense) => ({
    name: e.name,
    amount: e.amount,
    type: e.type,
    category: e.category?.name ?? "Sem categoria",
    card: e.card?.name ?? "Sem pagamento",
    responsible: e.responsible.name,
    date: formatDateBrazil(e.date),
  }));

  const allExpensesThisMonth = (monthExpenses as Expense[]).map((e: Expense) => ({
    name: e.name,
    amount: e.amount,
    type: e.type,
    category: e.category?.name ?? "Sem categoria",
    card: e.card?.name ?? "Sem pagamento",
    responsible: e.responsible.name,
    date: formatDateBrazil(e.date),
  }));

  const membersOrdered = sortMembersForBudgetDisplay([...(family.members as FamilyMember[])]);
  const members = membersOrdered.map((m: FamilyMember) => {
    const spent = memberSpendMap.get(m.userId) ?? 0;
    return {
      name: m.user.name,
      spent,
      percentOfTotal: totalSpent > 0 ? Math.round((spent / totalSpent) * 100) : 0,
    };
  });

  const monthNames = [
    "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
    "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
  ];

  return {
    userName: session.user.name.split(" ")[0],
    familyName: family.name,
    currentMonth: monthNames[monthIndex],
    currentYear,
    budget,
    totalSpentThisMonth: totalSpent,
    remainingBudget: remaining,
    budgetUsedPercent: budget > 0 ? Math.round((totalSpent / budget) * 100) : 0,
    typeBreakdown,
    categories,
    topExpenses,
    allExpensesThisMonth,
    members,
    cards: (family.cards as { name: string }[]).map((c: { name: string }) => c.name),
    categoriesAvailable: (family.categories as { name: string }[]).map((c: { name: string }) => c.name),
  };
}


