"use server";

import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";

export interface Notification {
  id: string;
  type: "invite" | "invite_accepted" | "invite_declined" | "expense_added" | "expense_deleted" | "removed_from_family" | "weekly_report" | "category_alert";
  title: string;
  description: string;
  createdAt: Date;
  read: boolean;
  metadata?: Record<string, string> | null;
}

export async function getNotifications(): Promise<Notification[]> {
  const session = await getSession();
  if (!session) return [];

  try {
    const [dbNotifications, member] = await Promise.all([
      db.notification.findMany({
        where: { userId: session.userId, read: false },
        orderBy: { createdAt: "desc" },
        take: 50,
      }),
      db.familyMember.findFirst({
        where: { userId: session.userId },
        select: { familyId: true },
      }),
    ]);

    const notifications: Notification[] = dbNotifications.map((n) => {
      const metadata = n.metadata ? (JSON.parse(n.metadata) as Record<string, string>) : null;
      // Relatórios antigos tinham descrição truncada; texto completo ficava em metadata.fullReport
      let description = n.description;
      if (n.type === "weekly_report" && metadata?.fullReport) {
        description = metadata.fullReport;
      }
      return {
        id: n.id,
        type: n.type as Notification["type"],
        title: n.title,
        description,
        createdAt: n.createdAt,
        read: n.read,
        metadata,
      };
    });

    // Computed: categories over limit
    if (member) {
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
            read: false,
          });
        }
      }
    }

    notifications.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    return notifications;
  } catch {
    return [];
  }
}

export async function dismissNotification(id: string): Promise<void> {
  const session = await getSession();
  if (!session) return;

  // Category alerts are computed — no DB record
  if (id.startsWith("cat-")) return;

  try {
    await db.notification.updateMany({
      where: { id, userId: session.userId },
      data: { read: true },
    });
  } catch {
    // silent
  }
}

export async function dismissAllNotifications(): Promise<void> {
  const session = await getSession();
  if (!session) return;

  try {
    await db.notification.updateMany({
      where: { userId: session.userId, read: false },
      data: { read: true },
    });
  } catch {
    // silent
  }
}
