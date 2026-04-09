import { db } from "@/lib/db";

type ToolArgs = Record<string, unknown>;
type ToolContext = { familyId: string; userId: string };

export async function executeTool(
  name: string,
  args: ToolArgs,
  ctx: ToolContext
): Promise<string> {
  try {
    switch (name) {
      case "get_expenses":
        return await toolGetExpenses(ctx.familyId, args);
      case "get_financial_summary":
        return await toolGetFinancialSummary(ctx.familyId, args);
      case "create_expense":
        return await toolCreateExpense(ctx.familyId, args);
      case "update_expense":
        return await toolUpdateExpense(ctx.familyId, args);
      case "delete_expense":
        return await toolDeleteExpense(ctx.familyId, args);
      default:
        return JSON.stringify({ error: `Ferramenta desconhecida: ${name}` });
    }
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error(`[tool-executor] ${name} error:`, msg);
    return JSON.stringify({ error: `Erro ao executar "${name}": ${msg}` });
  }
}

async function toolGetExpenses(familyId: string, args: ToolArgs): Promise<string> {
  const fromMonth = String(args.from_month);
  const toMonth = String(args.to_month);

  const expenses = await db.expense.findMany({
    where: {
      familyId,
      billingYm: { gte: fromMonth, lte: toMonth },
    },
    orderBy: [{ billingYm: "desc" }, { date: "desc" }],
    take: 500,
    select: {
      id: true,
      name: true,
      amount: true,
      date: true,
      type: true,
      billingYm: true,
      pending: true,
      totalInstallments: true,
      currentInstallment: true,
      invoiceId: true,
      category: { select: { id: true, name: true } },
      responsible: { select: { id: true, name: true } },
      card: { select: { id: true, name: true } },
    },
  });

  const total = expenses.reduce((s, e) => s + e.amount, 0);

  return JSON.stringify({
    period: `${fromMonth} a ${toMonth}`,
    count: expenses.length,
    totalAmount: total,
    expenses: expenses.map((e) => ({
      id: e.id,
      name: e.name,
      amount: e.amount,
      date: e.date.toISOString().slice(0, 10),
      type: e.type,
      billingYm: e.billingYm,
      pending: e.pending,
      totalInstallments: e.totalInstallments,
      currentInstallment: e.currentInstallment,
      invoiceId: e.invoiceId,
      category: e.category?.name ?? null,
      categoryId: e.category?.id ?? null,
      responsible: e.responsible.name,
      responsibleId: e.responsible.id,
      card: e.card?.name ?? null,
      cardId: e.card?.id ?? null,
    })),
  });
}

async function toolGetFinancialSummary(familyId: string, args: ToolArgs): Promise<string> {
  const fromMonth = String(args.from_month);
  const toMonth = String(args.to_month);
  const where = { familyId, billingYm: { gte: fromMonth, lte: toMonth } };

  const [typeGroups, categoryGroups, memberGroups, cardGroups, family] =
    await Promise.all([
      db.expense.groupBy({
        by: ["type"],
        where,
        _sum: { amount: true },
        _count: true,
      }),
      db.expense.groupBy({
        by: ["categoryId"],
        where,
        _sum: { amount: true },
        _count: true,
      }),
      db.expense.groupBy({
        by: ["responsibleId"],
        where,
        _sum: { amount: true },
        _count: true,
      }),
      db.expense.groupBy({
        by: ["cardId"],
        where,
        _sum: { amount: true },
        _count: true,
      }),
      db.family.findFirst({
        where: { id: familyId },
        select: {
          budget: true,
          categories: { select: { id: true, name: true, limitAmount: true } },
          members: {
            select: { userId: true, user: { select: { name: true } } },
          },
          cards: { select: { id: true, name: true } },
        },
      }),
    ]);

  const totalSpent = typeGroups.reduce((s, g) => s + (g._sum.amount ?? 0), 0);
  const catMap = new Map((family?.categories ?? []).map((c) => [c.id, c]));
  const memberMap = new Map(
    (family?.members ?? []).map((m) => [m.userId, m.user.name])
  );
  const cardMap = new Map((family?.cards ?? []).map((c) => [c.id, c.name]));

  // Project next month based on fixed expenses
  const fixedTotal =
    typeGroups.find((g) => g.type === "fixa")?._sum.amount ?? 0;
  const installmentsTotal =
    typeGroups.find((g) => g.type === "parcelada")?._sum.amount ?? 0;
  const projectedBase = fixedTotal + installmentsTotal;

  return JSON.stringify({
    period: `${fromMonth} a ${toMonth}`,
    budget: family?.budget ?? 0,
    totalSpent,
    remaining: (family?.budget ?? 0) - totalSpent,
    budgetUsedPercent:
      (family?.budget ?? 0) > 0
        ? Math.round((totalSpent / (family?.budget ?? 1)) * 100)
        : null,
    projectedMinimumNextMonth: projectedBase,
    byType: typeGroups.map((g) => ({
      type: g.type,
      amount: g._sum.amount ?? 0,
      count: g._count,
    })),
    byCategory: categoryGroups.map((g) => {
      const cat = g.categoryId ? catMap.get(g.categoryId) : null;
      return {
        categoryId: g.categoryId,
        category: cat?.name ?? "Sem categoria",
        amount: g._sum.amount ?? 0,
        limit: cat?.limitAmount ?? 0,
        count: g._count,
        overLimit:
          (cat?.limitAmount ?? 0) > 0 &&
          (g._sum.amount ?? 0) > (cat?.limitAmount ?? 0),
      };
    }),
    byMember: memberGroups.map((g) => ({
      memberId: g.responsibleId,
      member: memberMap.get(g.responsibleId) ?? "Desconhecido",
      amount: g._sum.amount ?? 0,
      count: g._count,
    })),
    byCard: cardGroups.map((g) => ({
      cardId: g.cardId,
      card: g.cardId ? (cardMap.get(g.cardId) ?? "Cartão desconhecido") : "Sem cartão",
      amount: g._sum.amount ?? 0,
      count: g._count,
    })),
  });
}

async function toolCreateExpense(familyId: string, args: ToolArgs): Promise<string> {
  const name = String(args.name);
  const amount = Number(args.amount);
  const date = new Date(String(args.date));
  const type = String(args.type) as "avulsa" | "fixa" | "parcelada";
  const billingYm = String(args.billingYm);
  const responsibleId = String(args.responsibleId);
  const categoryId = args.categoryId ? String(args.categoryId) : null;
  const cardId = args.cardId ? String(args.cardId) : null;
  const totalInstallments =
    type === "parcelada" && args.totalInstallments
      ? Number(args.totalInstallments)
      : null;
  const currentInstallment =
    type === "parcelada" && args.currentInstallment
      ? Number(args.currentInstallment)
      : null;

  if (isNaN(amount) || amount <= 0) {
    return JSON.stringify({ error: "Valor inválido" });
  }

  // Validate responsible belongs to family
  const member = await db.familyMember.findFirst({
    where: { familyId, userId: responsibleId },
  });
  if (!member) {
    return JSON.stringify({ error: "Responsável não pertence à família" });
  }

  const expense = await db.expense.create({
    data: {
      name,
      amount,
      date,
      type,
      billingYm,
      familyId,
      responsibleId,
      categoryId,
      cardId,
      totalInstallments,
      currentInstallment,
      pending: false,
    },
  });

  return JSON.stringify({
    success: true,
    message: `Gasto "${name}" de R$ ${amount.toFixed(2)} criado com sucesso no mês ${billingYm}`,
    expenseId: expense.id,
  });
}

async function toolUpdateExpense(familyId: string, args: ToolArgs): Promise<string> {
  const expenseId = String(args.expenseId);

  const existing = await db.expense.findFirst({
    where: { id: expenseId, familyId },
    select: { id: true, name: true },
  });
  if (!existing) {
    return JSON.stringify({ error: "Gasto não encontrado ou sem permissão" });
  }

  const data: Record<string, unknown> = {};
  if (args.name !== undefined) data.name = String(args.name);
  if (args.amount !== undefined) data.amount = Number(args.amount);
  if (args.date !== undefined) data.date = new Date(String(args.date));
  if (args.type !== undefined) data.type = String(args.type);
  if (args.billingYm !== undefined) data.billingYm = String(args.billingYm);
  if (args.categoryId !== undefined)
    data.categoryId = args.categoryId ? String(args.categoryId) : null;
  if (args.cardId !== undefined)
    data.cardId = args.cardId ? String(args.cardId) : null;

  if (Object.keys(data).length === 0) {
    return JSON.stringify({ error: "Nenhum campo para atualizar foi fornecido" });
  }

  await db.expense.update({ where: { id: expenseId }, data });

  return JSON.stringify({
    success: true,
    message: `Gasto "${existing.name}" atualizado com sucesso`,
  });
}

async function toolDeleteExpense(familyId: string, args: ToolArgs): Promise<string> {
  if (!args.confirmed) {
    return JSON.stringify({
      success: false,
      requiresConfirmation: true,
      message: `Aguardando confirmação para excluir "${args.expenseName}". Peça ao usuário para confirmar.`,
    });
  }

  const expenseId = String(args.expenseId);

  const existing = await db.expense.findFirst({
    where: { id: expenseId, familyId },
    select: { id: true, name: true },
  });
  if (!existing) {
    return JSON.stringify({ error: "Gasto não encontrado ou sem permissão" });
  }

  await db.expense.delete({ where: { id: expenseId } });

  return JSON.stringify({
    success: true,
    message: `Gasto "${existing.name}" excluído com sucesso`,
  });
}
