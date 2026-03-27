"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { parseExpenseDateString, parseLocalDateInput } from "@/lib/date-local";
import { billingYmForParcelIndex, expenseDateForParcelRow } from "@/lib/billing-ym-advance";
import { computeExpenseBillingYm, parseBillingYm } from "@/lib/expense-billing-ym";

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

  const totalInstallments = type === "parcelada" && totalInstallmentsStr ? parseInt(totalInstallmentsStr, 10) : null;
  const currentInstallment = type === "parcelada" && currentInstallmentStr ? parseInt(currentInstallmentStr, 10) : null;
  const billingYmForm = parseBillingYm(formData.get("billingYm") as string | null);

  const familyMember = await db.familyMember.findFirst({
    where: { userId: session.userId },
  });
  if (!familyMember) return { error: "Família não encontrada" };

  const expenseDate = parseLocalDateInput(dateStr);
  const cid = typeof cardId === "string" && cardId.trim() !== "" ? cardId.trim() : null;
  const card = cid
    ? await db.card.findFirst({
        where: { id: cid, familyId: familyMember.familyId },
        select: { statementClosingDay: true },
      })
    : null;

  const shouldSpreadParcels =
    type === "parcelada" &&
    totalInstallments != null &&
    totalInstallments >= 2 &&
    (currentInstallment ?? 1) === 1 &&
    billingYmForm != null;

  const responsibleRow = await db.user.findFirst({
    where: { id: responsibleId },
    select: { name: true },
  });
  const responsibleLabel = responsibleRow?.name ?? "—";

  const otherMembers = await db.familyMember.findMany({
    where: { familyId: familyMember.familyId, userId: { not: session.userId } },
    select: { userId: true },
  });

  const notifyCreated = async (payload: { expenseId?: string; description: string }) => {
    if (otherMembers.length === 0) return;
    try {
      await db.notification.createMany({
        data: otherMembers.map((m) => ({
          userId: m.userId,
          type: "expense_added",
          title: `Gasto adicionado — ${responsibleLabel}`,
          description: payload.description,
          metadata: JSON.stringify({
            expenseId: payload.expenseId,
            responsibleName: responsibleLabel,
            expenseName: name,
          }),
        })),
      });
    } catch (e) {
      console.error("[createExpense] falha ao criar notificações (gasto salvo):", e);
    }
  };

  if (shouldSpreadParcels && totalInstallments) {
    const firstYm = billingYmForm;
    const rows = Array.from({ length: totalInstallments }, (_, i) => {
      const ym = billingYmForParcelIndex(firstYm, card, i);
      const rowDate = expenseDateForParcelRow(i, expenseDate, ym, card);
      return {
        name,
        invoiceId: invoiceId || null,
        date: rowDate,
        billingYm: ym,
        amount,
        type: "parcelada" as const,
        totalInstallments,
        currentInstallment: i + 1,
        familyId: familyMember.familyId,
        categoryId: categoryId || null,
        responsibleId,
        cardId: cid,
      };
    });
    await db.expense.createMany({ data: rows });
    const amountFmt = amount.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
    await notifyCreated({
      description: `${responsibleLabel} registrou: ${name} · ${totalInstallments}x de ${amountFmt}/parcela (faturas seguintes)`,
    });
  } else {
    const billingYm = billingYmForm ?? computeExpenseBillingYm(expenseDate, card);
    const expense = await db.expense.create({
      data: {
        name,
        invoiceId: invoiceId || null,
        date: expenseDate,
        billingYm,
        amount,
        type,
        totalInstallments,
        currentInstallment,
        familyId: familyMember.familyId,
        categoryId: categoryId || null,
        responsibleId,
        cardId: cid,
      },
      include: { responsible: { select: { name: true } } },
    });
    const amountFmt = amount.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
    await notifyCreated({
      expenseId: expense.id,
      description: `${expense.responsible.name} registrou: ${name} · ${amountFmt}`,
    });
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

  const familyMember = await db.familyMember.findFirst({
    where: { userId: session.userId },
  });
  if (!familyMember) return { error: "Família não encontrada" };

  const owned = await db.expense.findFirst({
    where: { id: expenseId, familyId: familyMember.familyId },
    select: { id: true },
  });
  if (!owned) return { error: "Gasto não encontrado" };

  const expenseDate = parseLocalDateInput(dateStr);
  const cid = typeof cardId === "string" && cardId.trim() !== "" ? cardId.trim() : null;
  const card = cid
    ? await db.card.findFirst({
        where: { id: cid, familyId: familyMember.familyId },
        select: { statementClosingDay: true },
      })
    : null;
  const billingYmForm = parseBillingYm(formData.get("billingYm") as string | null);
  const billingYm = billingYmForm ?? computeExpenseBillingYm(expenseDate, card);

  await db.expense.update({
    where: { id: expenseId },
    data: {
      name,
      invoiceId: invoiceId || null,
      date: expenseDate,
      billingYm,
      amount,
      type,
      totalInstallments,
      currentInstallment,
      pending: false,
      categoryId: categoryId || null,
      responsibleId,
      cardId: cid,
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

  const ids = [...new Set(expenses.map((e) => e.cardId).filter((x): x is string => Boolean(x)))];
  const cards = ids.length
    ? await db.card.findMany({
        where: { familyId: member.familyId, id: { in: ids } },
        select: { id: true, statementClosingDay: true },
      })
    : [];
  const cardById = new Map(cards.map((c) => [c.id, c]));

  await db.expense.createMany({
    data: expenses.map((e: { name: string; amount: number; date: string; type: string; categoryId?: string; responsibleId: string; cardId?: string }) => {
      const d = parseExpenseDateString(e.date);
      const cid = e.cardId && e.cardId.trim() !== "" ? e.cardId.trim() : null;
      const card = cid ? cardById.get(cid) ?? null : null;
      return {
        name: e.name,
        amount: e.amount,
        date: d,
        billingYm: computeExpenseBillingYm(d, card),
        type: e.type,
        pending: true,
        familyId: member.familyId,
        categoryId: e.categoryId || null,
        responsibleId: e.responsibleId,
        cardId: cid,
      };
    }),
  });

  revalidatePath("/transactions");
  revalidatePath("/");
  return { success: true, count: expenses.length };
}
