"use server";

import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";

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
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

  const [monthExpenses, allCategories] = await Promise.all([
    db.expense.findMany({
      where: { familyId: family.id, date: { gte: startOfMonth, lte: endOfMonth } },
      orderBy: { amount: "desc" },
      include: {
        category: true,
        card: true,
        responsible: true,
      },
    }),
    db.category.findMany({
      where: { familyId: family.id },
      include: {
        expenses: { where: { date: { gte: startOfMonth, lte: endOfMonth } } },
      },
    }),
  ]);

  type Expense = {
    amount: number; type: string; responsibleId: string; name: string; date: Date;
    category: { name: string } | null; card: { name: string } | null; responsible: { name: string };
  };
  type CatWithExpenses = { name: string; limitAmount: number; expenses: { amount: number }[] };
  type FamilyMember = { userId: string; user: { name: string } };

  const totalSpent = (monthExpenses as Expense[]).reduce((acc: number, e: Expense) => acc + e.amount, 0);
  const budget = family.budget;
  const remaining = budget - totalSpent;

  const typeBreakdown = {
    avulsa: (monthExpenses as Expense[]).filter((e: Expense) => e.type === "avulsa").reduce((acc: number, e: Expense) => acc + e.amount, 0),
    fixa: (monthExpenses as Expense[]).filter((e: Expense) => e.type === "fixa").reduce((acc: number, e: Expense) => acc + e.amount, 0),
    parcelada: (monthExpenses as Expense[]).filter((e: Expense) => e.type === "parcelada").reduce((acc: number, e: Expense) => acc + e.amount, 0),
  };

  const categories = (allCategories as CatWithExpenses[]).map((cat: CatWithExpenses) => {
    const spent = cat.expenses.reduce((acc: number, e: { amount: number }) => acc + e.amount, 0);
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
    card: e.card?.name ?? "Sem cartão",
    responsible: e.responsible.name,
    date: new Date(e.date).toLocaleDateString("pt-BR"),
  }));

  const allExpensesThisMonth = (monthExpenses as Expense[]).map((e: Expense) => ({
    name: e.name,
    amount: e.amount,
    type: e.type,
    category: e.category?.name ?? "Sem categoria",
    card: e.card?.name ?? "Sem cartão",
    responsible: e.responsible.name,
    date: new Date(e.date).toLocaleDateString("pt-BR"),
  }));

  const members = (family.members as FamilyMember[]).map((m: FamilyMember) => {
    const spent = (monthExpenses as Expense[])
      .filter((e: Expense) => e.responsibleId === m.userId)
      .reduce((acc: number, e: Expense) => acc + e.amount, 0);
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
    currentMonth: monthNames[now.getMonth()],
    currentYear: now.getFullYear(),
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


