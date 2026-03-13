"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";

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

  await db.expense.create({
    data: {
      name,
      invoiceId: invoiceId || null,
      date: new Date(dateStr),
      amount,
      type,
      totalInstallments,
      currentInstallment,
      familyId: familyMember.familyId,
      categoryId: categoryId || null,
      responsibleId,
      cardId: cardId || null,
    },
  });

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
      date: new Date(dateStr),
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
    await db.expense.delete({ where: { id: expenseId } });
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
      date: new Date(e.date),
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

export async function getTransactionsData() {
  const session = await getSession();
  if (!session) return null;

  const member = await db.familyMember.findFirst({
    where: { userId: session.userId },
    select: { familyId: true },
  });
  if (!member) return null;

  const fid = member.familyId;

  const [expenses, categories, cards, members] = await Promise.all([
    db.expense.findMany({
      where: { familyId: fid },
      orderBy: { date: "desc" },
      select: {
        id: true, name: true, amount: true, date: true, type: true,
        pending: true, totalInstallments: true, currentInstallment: true, invoiceId: true,
        category: { select: { id: true, name: true } },
        responsible: { select: { id: true, name: true } },
        card: { select: { id: true, name: true } },
      },
    }),
    db.category.findMany({
      where: { familyId: fid },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
    db.card.findMany({
      where: { familyId: fid },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
    db.familyMember.findMany({
      where: { familyId: fid },
      select: { userId: true, user: { select: { id: true, name: true } } },
    }),
  ]);

  return {
    expenses,
    categories,
    cards,
    members: members.map((m: { userId: string; user: { id: string; name: string } }) => ({ userId: m.userId, name: m.user.name })),
  };
}
