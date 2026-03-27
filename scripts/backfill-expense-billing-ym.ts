/**
 * Recalcula `Expense.billingYm` para todos os gastos (data + cartão).
 * Rode após migrar a coluna: `npx tsx scripts/backfill-expense-billing-ym.ts`
 */
import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { computeExpenseBillingYm } from "../lib/expense-billing-ym";

function requireDatabaseUrl(): string {
  const url =
    process.env.DATABASE_URL?.trim() ||
    process.env.POSTGRES_URL?.trim() ||
    process.env.PRISMA_DATABASE_URL?.trim() ||
    process.env.gastamo_DATABASE_URL?.trim() ||
    process.env.gastamo_POSTGRES_URL?.trim() ||
    process.env.gastamo_PRISMA_DATABASE_URL?.trim();
  if (!url) {
    throw new Error("Defina DATABASE_URL (ou variável equivalente do projeto).");
  }
  return url;
}

async function main() {
  const adapter = new PrismaPg({ connectionString: requireDatabaseUrl() });
  const prisma = new PrismaClient({ adapter });

  const batchSize = 300;
  let skip = 0;
  let total = 0;

  try {
    for (;;) {
      const rows = await prisma.expense.findMany({
        skip,
        take: batchSize,
        orderBy: { id: "asc" },
        select: {
          id: true,
          date: true,
          card: { select: { statementClosingDay: true } },
        },
      });
      if (rows.length === 0) break;

      await prisma.$transaction(
        rows.map((r) =>
          prisma.expense.update({
            where: { id: r.id },
            data: { billingYm: computeExpenseBillingYm(r.date, r.card) },
          }),
        ),
      );

      total += rows.length;
      skip += rows.length;
      console.log(`Atualizados ${total} gastos…`);
    }

    console.log(`Concluído: ${total} gasto(s).`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
