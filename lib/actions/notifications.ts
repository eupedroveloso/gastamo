"use server";

import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { getActiveFamilyId } from "@/lib/active-family";
import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { ACTIVE_FAMILY_COOKIE } from "@/lib/active-family";

export interface Notification {
  id: string;
  type: "expense" | "category_alert" | "invite";
  title: string;
  description: string;
  createdAt: Date;
  memberName?: string;
  memberAvatar?: string | null;
  inviteId?: string;
  familyName?: string;
}

export async function getNotifications(): Promise<Notification[]> {
  const session = await getSession();
  if (!session) return [];

  try {
    const notifications: Notification[] = [];

    // Pending invites for this user (always show, regardless of active family)
    const pendingInvites = await db.familyInvite.findMany({
      where: { invitedUserId: session.userId, status: "pending" },
      include: {
        family: { select: { name: true } },
        invitedBy: { select: { name: true, avatar: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    for (const invite of pendingInvites) {
      notifications.push({
        id: `invite-${invite.id}`,
        type: "invite",
        title: `${invite.invitedBy.name} te convidou`,
        description: `Convite para entrar na família "${invite.family.name}"`,
        createdAt: invite.createdAt,
        memberName: invite.invitedBy.name,
        memberAvatar: invite.invitedBy.avatar,
        inviteId: invite.id,
        familyName: invite.family.name,
      });
    }

    // Expense and category notifications from active family
    const familyId = await getActiveFamilyId();
    if (!familyId) {
      notifications.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
      return notifications;
    }

    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const recentExpenses = await db.expense.findMany({
      where: {
        familyId,
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

    const categories = await db.category.findMany({
      where: { familyId, limitAmount: { gt: 0 } },
      include: {
        expenses: {
          where: {
            date: { gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1) },
          },
          select: { amount: true },
        },
      },
    });

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

    notifications.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    return notifications;
  } catch {
    return [];
  }
}

export async function acceptInvite(inviteId: string): Promise<{ error?: string; success?: string }> {
  const session = await getSession();
  if (!session) return { error: "Não autorizado" };

  try {
    const invite = await db.familyInvite.findFirst({
      where: { id: inviteId, invitedUserId: session.userId, status: "pending" },
    });
    if (!invite) return { error: "Convite não encontrado ou já processado" };

    const existingMember = await db.familyMember.findFirst({
      where: { userId: session.userId, familyId: invite.familyId },
    });
    if (!existingMember) {
      await db.familyMember.create({
        data: {
          userId: session.userId,
          familyId: invite.familyId,
          role: "member",
          budget: invite.budget,
        },
      });
    }

    await db.familyInvite.update({
      where: { id: inviteId },
      data: { status: "accepted" },
    });

    // Set the new family as active
    const cookieStore = await cookies();
    cookieStore.set(ACTIVE_FAMILY_COOKIE, invite.familyId, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 365,
    });

    revalidatePath("/");
    revalidatePath("/settings");
    revalidatePath("/transactions");
    return { success: "Você entrou na família!" };
  } catch {
    return { error: "Erro ao aceitar convite" };
  }
}

export async function declineInvite(inviteId: string): Promise<{ error?: string; success?: string }> {
  const session = await getSession();
  if (!session) return { error: "Não autorizado" };

  try {
    const invite = await db.familyInvite.findFirst({
      where: { id: inviteId, invitedUserId: session.userId, status: "pending" },
    });
    if (!invite) return { error: "Convite não encontrado" };

    await db.familyInvite.update({
      where: { id: inviteId },
      data: { status: "declined" },
    });

    revalidatePath("/");
    return { success: "Convite recusado" };
  } catch {
    return { error: "Erro ao recusar convite" };
  }
}
