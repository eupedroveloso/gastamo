"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { parseExpenseDateString, parseLocalDateInput, getTodayBrazilYMD } from "@/lib/date-local";
import { addCivilMonths, billingYmForParcelIndex, expenseDateForParcelRow } from "@/lib/billing-ym-advance";
import { parseBillingYm } from "@/lib/expense-billing-ym";

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

  if (!name || !responsibleId) {
    return { error: "Preencha os campos obrigatórios: nome e responsável" };
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

  const expenseDate = parseLocalDateInput(dateStr || getTodayBrazilYMD());
  const cid = typeof cardId === "string" && cardId.trim() !== "" ? cardId.trim() : null;

  const shouldSpreadParcels =
    type === "parcelada" &&
    totalInstallments != null &&
    totalInstallments >= 2 &&
    billingYmForm != null;

  // Busca responsável e outros membros em paralelo — nenhum depende do outro
  const [responsibleRow, otherMembers] = await Promise.all([
    db.user.findFirst({ where: { id: responsibleId }, select: { name: true } }),
    db.familyMember.findMany({
      where: { familyId: familyMember.familyId, userId: { not: session.userId } },
      select: { userId: true },
    }),
  ]);
  const responsibleLabel = responsibleRow?.name ?? "—";

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

  try {
    if (shouldSpreadParcels && totalInstallments && billingYmForm) {
      // billingYmForm é o mês da parcela `currentInstallment`; parcela 1 fica mais atrás
      const currentInst = currentInstallment ?? 1;
      const firstYm = addCivilMonths(billingYmForm, -(currentInst - 1));
      const rows = Array.from({ length: totalInstallments }, (_, i) => {
        const ym = billingYmForParcelIndex(firstYm, null, i);
        const rowDate = expenseDateForParcelRow(i, expenseDate, ym, null);
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
        description: `${responsibleLabel} registrou: ${name} · ${totalInstallments}x de ${amountFmt}/parcela`,
      });
    } else if (type === "fixa") {
      // Gastos fixos: gera 24 meses consecutivos a partir do mês selecionado
      const startYm = billingYmForm ?? getTodayBrazilYMD().slice(0, 7);
      const rows = Array.from({ length: 24 }, (_, i) => ({
        name,
        invoiceId: invoiceId || null,
        date: expenseDate,
        billingYm: addCivilMonths(startYm, i),
        amount,
        type: "fixa" as const,
        totalInstallments: null,
        currentInstallment: null,
        familyId: familyMember.familyId,
        categoryId: categoryId || null,
        responsibleId,
        cardId: cid,
      }));
      await db.expense.createMany({ data: rows });
      const amountFmt = amount.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
      await notifyCreated({
        description: `${responsibleLabel} registrou gasto fixo: ${name} · ${amountFmt}/mês`,
      });
    } else {
      const billingYm = billingYmForm ?? getTodayBrazilYMD().slice(0, 7);
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
  } catch (e) {
    console.error("[createExpense] erro ao salvar gasto:", e);
    return { error: "Erro ao salvar o gasto. Tente novamente." };
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

  const expenseDate = parseLocalDateInput(dateStr || getTodayBrazilYMD());
  const cid = typeof cardId === "string" && cardId.trim() !== "" ? cardId.trim() : null;
  const billingYmForm = parseBillingYm(formData.get("billingYm") as string | null);
  const billingYm = billingYmForm ?? getTodayBrazilYMD().slice(0, 7);

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
    // Busca dados para notificação e deleta em paralelo
    const [expense] = await Promise.all([
      db.expense.findUnique({
        where: { id: expenseId },
        include: {
          responsible: { select: { name: true } },
          family: { include: { members: { select: { userId: true } } } },
        },
      }),
      db.expense.delete({ where: { id: expenseId } }),
    ]);

    if (expense) {
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
    invoiceId?: string;
    amount: number;
    date: string;
    type: string;
    categoryId?: string;
    responsibleId: string;
    cardId?: string;
  }>,
  /** YYYY-MM: mês dos gastos importados. */
  faturaYm?: string | null,
): Promise<{ success?: boolean; count?: number; error?: string }> {
  const session = await getSession();
  if (!session) return { error: "Não autenticado" };

  if (!expenses.length) return { error: "Nenhum gasto para importar" };

  const member = await db.familyMember.findFirst({
    where: { userId: session.userId },
  });
  if (!member) return { error: "Família não encontrada" };

  const resolvedFaturaYm = parseBillingYm(faturaYm ?? null);

  await db.expense.createMany({
    data: expenses.map((e) => {
      const d = parseExpenseDateString(e.date);
      const cid = e.cardId && e.cardId.trim() !== "" ? e.cardId.trim() : null;
      return {
        name: e.name,
        invoiceId: e.invoiceId || null,
        amount: e.amount,
        date: d,
        billingYm: resolvedFaturaYm ?? getTodayBrazilYMD().slice(0, 7),
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

export async function getInvoiceIdSuggestions(): Promise<string[]> {
  const session = await getSession();
  if (!session) return [];

  const member = await db.familyMember.findFirst({
    where: { userId: session.userId },
    select: { familyId: true },
  });
  if (!member) return [];

  const rows = await db.expense.findMany({
    where: { familyId: member.familyId, invoiceId: { not: null } },
    select: { invoiceId: true },
    distinct: ["invoiceId"],
    orderBy: { createdAt: "desc" },
    take: 200,
  });

  return rows.map((r) => r.invoiceId!).filter(Boolean);
}
