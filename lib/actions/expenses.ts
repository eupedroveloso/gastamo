"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { parseExpenseDateString, parseLocalDateInput } from "@/lib/date-local";

export type ExpenseState = { error?: string; success?: boolean } | null;

export async function createExpense(
  prevState: ExpenseState,
  formData: FormData
): Promise<ExpenseState> {
  const session = await getSession();
  if (!session) return { error: "Não autenticado" };

  const name = formData.get("name") as string;
  const invoiceId = formData.get("invoiceId") as string;
  const dateStr = formData.get("date") as string;
  const categoryId = formData.get("categoryId") as string;
  const responsibleId = formData.get("responsibleId") as string;
  const cardId = formData.get("cardId") as string;
  const amountStr = formData.get("amount") as string;
  const type = (formData.get("type") as string) || "avulsa";
  const totalInstallmentsStr = formData.get("totalInstallments") as string;
  const currentInstallmentStr = formData.get("currentInstallment") as string;

  if (!name || !dateStr || !responsibleId) {
    return { error: "Preencha os campos obrigatórios: nome, data e responsável" };
  }

  const amount =
    parseFloat(amountStr.replace(/\./g, "").replace(",", ".")) || 0;

  const totalInstallments = type === "parcelada" && totalInstallmentsStr ? parseInt(totalInstallmentsStr) : null;
  const currentInstallment = type === "parcelada" && currentInstallmentStr ? parseInt(currentInstallmentStr) : null;

  const familyMember = await db.familyMember.findFirst({
    where: { userId: session.userId },
  });
  if (!familyMember) return { error: "Família não encontrada" };

  const expense = await db.expense.create({
    data: {
      name,
      invoiceId: invoiceId || null,
      date: parseLocalDateInput(dateStr),
      amount,
      type,
      totalInstallments,
      currentInstallment,
      familyId: familyMember.familyId,
      categoryId: categoryId || null,
      responsibleId,
      cardId: cardId || null,
    },
    include: { responsible: { select: { name: true } } },
  });

  // Notificar outros integrantes da família (quem registrou não recebe)
  const otherMembers = await db.familyMember.findMany({
    where: { familyId: familyMember.familyId, userId: { not: session.userId } },
    select: { userId: true },
  });
  if (otherMembers.length > 0) {
    const amountFmt = amount.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
    const responsibleLabel = expense.responsible.name;
    try {
      await db.notification.createMany({
        data: otherMembers.map((m) => ({
          userId: m.userId,
          type: "expense_added",
          title: `Gasto adicionado — ${responsibleLabel}`,
          description: `${responsibleLabel} registrou: ${name} · ${amountFmt}`,
          metadata: JSON.stringify({
            expenseId: expense.id,
            responsibleName: responsibleLabel,
            expenseName: name,
          }),
        })),
      });
    } catch (e) {
      console.error("[createExpense] falha ao criar notificações (gasto salvo):", e);
    }
  }

  revalidatePath("/");
  revalidatePath("/transactions");
  return { success: true };
}

export async function updateExpense(
  prevState: ExpenseState,
  formData: FormData
): Promise<ExpenseState> {
  const session = await getSession();
  if (!session) return { error: "Não autenticado" };

  const expenseId = formData.get("expenseId") as string;
  const name = formData.get("name") as string;
  const invoiceId = formData.get("invoiceId") as string;
  const dateStr = formData.get("date") as string;
  const categoryId = formData.get("categoryId") as string;
  const responsibleId = formData.get("responsibleId") as string;
  const cardId = formData.get("cardId") as string;
  const amountStr = formData.get("amount") as string;
  const type = (formData.get("type") as string) || "avulsa";
  const totalInstallmentsStr = formData.get("totalInstallments") as string;
  const currentInstallmentStr = formData.get("currentInstallment") as string;

  if (!expenseId || !name || !dateStr || !responsibleId) {
    return { error: "Preencha os campos obrigatórios" };
  }

  const amount =
    parseFloat(amountStr.replace(/\./g, "").replace(",", ".")) || 0;

  const totalInstallments = type === "parcelada" && totalInstallmentsStr ? parseInt(totalInstallmentsStr) : null;
  const currentInstallment = type === "parcelada" && currentInstallmentStr ? parseInt(currentInstallmentStr) : null;

  await db.expense.update({
    where: { id: expenseId },
    data: {
      name,
      invoiceId: invoiceId || null,
      date: parseLocalDateInput(dateStr),
      amount,
      type,
      totalInstallments,
      currentInstallment,
      pending: false,
      categoryId: categoryId || null,
      responsibleId,
      cardId: cardId || null,
    },
  });

  revalidatePath("/transactions");
  revalidatePath("/");
  return { success: true };
}

export async function deleteExpense(expenseId: string): Promise<void> {
  const session = await getSession();
  if (!session) return;

  try {
    const expense = await db.expense.findUnique({
      where: { id: expenseId },
      include: {
        responsible: { select: { name: true } },
        family: { include: { members: { select: { userId: true } } } },
      },
    });

    if (expense) {
      await db.expense.delete({ where: { id: expenseId } });

      // Notify other family members
      const otherMembers = expense.family.members.filter((m) => m.userId !== session.userId);
      if (otherMembers.length > 0) {
        const amountFmt = expense.amount.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
        await db.notification.createMany({
          data: otherMembers.map((m) => ({
            userId: m.userId,
            type: "expense_deleted",
            title: `${session.user.name} excluiu um gasto`,
            description: `"${expense.name}" (${amountFmt}) foi removido.`,
          })),
        });
      }
    }

    revalidatePath("/transactions");
    revalidatePath("/");
  } catch {
    // silent fail
  }
}

export async function bulkDeleteExpenses(ids: string[]): Promise<{ success?: boolean; error?: string }> {
  const session = await getSession();
  if (!session) return { error: "Não autenticado" };

  if (!ids.length) return { error: "Nenhum gasto selecionado" };

  try {
    const member = await db.familyMember.findFirst({
      where: { userId: session.userId },
      select: { familyId: true },
    });
    if (!member) return { error: "Família não encontrada" };

    await db.expense.deleteMany({
      where: { id: { in: ids }, familyId: member.familyId },
    });

    revalidatePath("/transactions");
    revalidatePath("/");
    return { success: true };
  } catch {
    return { error: "Erro ao apagar gastos" };
  }
}

export async function bulkCreateExpenses(
  expenses: Array<{
    name: string;
    amount: number;
    date: string;
    type: string;
    categoryId?: string;
    responsibleId: string;
    cardId?: string;
  }>
): Promise<{ success?: boolean; count?: number; error?: string }> {
  const session = await getSession();
  if (!session) return { error: "Não autenticado" };

  if (!expenses.length) return { error: "Nenhum gasto para importar" };

  const member = await db.familyMember.findFirst({
    where: { userId: session.userId },
  });
  if (!member) return { error: "Família não encontrada" };

  await db.expense.createMany({
    data: expenses.map((e: { name: string; amount: number; date: string; type: string; categoryId?: string; responsibleId: string; cardId?: string }) => ({
      name: e.name,
      amount: e.amount,
      date: parseExpenseDateString(e.date),
      type: e.type,
      pending: true,
      familyId: member.familyId,
      categoryId: e.categoryId || null,
      responsibleId: e.responsibleId,
      cardId: e.cardId || null,
    })),
  });

  revalidatePath("/transactions");
  revalidatePath("/");
  return { success: true, count: expenses.length };
}
