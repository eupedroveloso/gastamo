"use server";

import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";

export interface Notification {
  id: string;
  type: "expense" | "category_alert";
  title: string;
  description: string;
  createdAt: Date;
  memberName?: string;
  memberAvatar?: string | null;
}

export async function getNotifications(): Promise<Notification[]> {
  const session = await getSession();
  if (!session) return [];

  try {
    const member = await db.familyMember.findFirst({
      where: { userId: session.userId },
      select: { familyId: true },
    });
    if (!member) return [];

    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    // Recent expenses by other family members
    const recentExpenses = await db.expense.findMany({
      where: {
        familyId: member.familyId,
        responsibleId: { not: session.userId },
        createdAt: { gte: sevenDaysAgo },
      },
      include: {
        responsible: { select: { name: true, avatar: true } },
        category: { select: { name: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 20,
    });

    // Categories over limit
    const categories = await db.category.findMany({
      where: { familyId: member.familyId, limitAmount: { gt: 0 } },
      include: {
        expenses: {
          where: {
            date: { gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1) },
          },
          select: { amount: true },
        },
      },
    });

    const notifications: Notification[] = [];

    for (const expense of recentExpenses) {
      const amount = expense.amount.toLocaleString("pt-BR", {
        style: "currency",
        currency: "BRL",
      });
      notifications.push({
        id: `expense-${expense.id}`,
        type: "expense",
        title: `${expense.responsible.name} adicionou um gasto`,
        description: `${expense.name} · ${amount}${expense.category ? ` · ${expense.category.name}` : ""}`,
        createdAt: expense.createdAt,
        memberName: expense.responsible.name,
        memberAvatar: expense.responsible.avatar,
      });
    }

    for (const cat of categories) {
      const total = cat.expenses.reduce((sum, e) => sum + e.amount, 0);
      const pct = (total / cat.limitAmount) * 100;
      if (pct >= 80) {
        const totalFmt = total.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
        const limitFmt = cat.limitAmount.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
        notifications.push({
          id: `cat-${cat.id}`,
          type: "category_alert",
          title: `Alerta: categoria ${cat.name}`,
          description: `${Math.round(pct)}% do limite usado este mês (${totalFmt} de ${limitFmt})`,
          createdAt: new Date(),
        });
      }
    }

    // Sort by date desc
    notifications.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

    return notifications;
  } catch {
    return [];
  }
}
