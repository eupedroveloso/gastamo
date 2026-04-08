import { db } from "@/lib/db";
import { addCivilMonths } from "@/lib/billing-ym-advance";

/**
 * Garante que todos os gastos fixos da família têm linhas criadas até `untilYm`.
 * Chamado no início de getDashboardData para que o mês consultado esteja sempre presente.
 *
 * Fluxo:
 *  1. Agrupa por recurringGroupId → acha o max(billingYm) de cada grupo.
 *  2. Para grupos cujo max < untilYm, busca o template (linha mais recente).
 *  3. Cria as linhas faltantes com createMany.
 *  4. Usa um Set de pares "groupId/ym" já existentes para evitar duplicatas
 *     em caso de chamadas concorrentes (race condition improvável mas possível).
 */
export async function extendRecurringExpenses(
  familyId: string,
  untilYm: string
): Promise<void> {
  // 1. Acha grupos e seu máximo billingYm
  const groups = await db.expense.groupBy({
    by: ["recurringGroupId"],
    where: { familyId, type: "fixa", recurringGroupId: { not: null } },
    _max: { billingYm: true },
  });

  const needsExtension = groups.filter(
    (g) => g.recurringGroupId && g._max.billingYm && g._max.billingYm < untilYm
  );

  if (needsExtension.length === 0) return;

  const groupIds = needsExtension.map((g) => g.recurringGroupId as string);

  // 2. Template = linha mais recente de cada grupo (captura edições futuras)
  const templates = await db.expense.findMany({
    where: { recurringGroupId: { in: groupIds } },
    orderBy: { billingYm: "desc" },
    distinct: ["recurringGroupId"],
  });

  // Descobre o menor ym que precisamos criar para saber o range de verificação
  const minNeeded = needsExtension.reduce((min, g) => {
    const next = addCivilMonths(g._max.billingYm!, 1);
    return next < min ? next : min;
  }, untilYm);

  // 3. Verifica quais (groupId, billingYm) já existem — evita duplicatas
  const existing = await db.expense.findMany({
    where: {
      familyId,
      recurringGroupId: { in: groupIds },
      billingYm: { gte: minNeeded, lte: untilYm },
    },
    select: { recurringGroupId: true, billingYm: true },
  });
  const existingSet = new Set(
    existing.map((r) => `${r.recurringGroupId}/${r.billingYm}`)
  );

  // 4. Monta as linhas novas
  const rows: import("@prisma/client").Prisma.ExpenseCreateManyInput[] = [];

  for (const group of needsExtension) {
    const template = templates.find(
      (t) => t.recurringGroupId === group.recurringGroupId
    );
    if (!template || !group._max.billingYm || !group.recurringGroupId) continue;

    let ym = addCivilMonths(group._max.billingYm, 1);
    while (ym <= untilYm) {
      const key = `${group.recurringGroupId}/${ym}`;
      if (!existingSet.has(key)) {
        rows.push({
          name: template.name,
          invoiceId: template.invoiceId,
          date: template.date,
          billingYm: ym,
          amount: template.amount,
          type: "fixa",
          totalInstallments: null,
          currentInstallment: null,
          pending: false,
          familyId: template.familyId,
          categoryId: template.categoryId,
          responsibleId: template.responsibleId,
          cardId: template.cardId,
          recurringGroupId: group.recurringGroupId,
        });
      }
      ym = addCivilMonths(ym, 1);
    }
  }

  if (rows.length > 0) {
    await db.expense.createMany({ data: rows });
  }
}
