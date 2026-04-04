import { redirect } from "next/navigation";
import { getDashboardData } from "@/lib/actions/dashboard";
import { DashboardPageClient } from "@/components/dashboard-page-client";

export default async function DashboardPage({
  searchParams,
}: {
  searchParams?: Promise<{ from?: string; to?: string }>;
}) {
  const sp = (await searchParams) ?? {};
  const data = await getDashboardData({ from: sp.from, to: sp.to });

  if (!data) redirect("/api/auth/signout-expired");

  const {
    user,
    family,
    expenses,
    totalSpent,
    daysInMonth,
    categories,
    cards,
    memberSpending,
    spendByPayment = [],
    period,
  } = data;
  const typeStats = data.typeStats ?? { avulsa: 0, fixa: 0, parcelada: 0 };

  const totalBudget = family?.budget ?? 0;
  const dailyBudget = daysInMonth && totalBudget > 0 ? totalBudget / daysInMonth : 0;
  const freeBudget = Math.max(0, totalBudget - totalSpent);

  const donutSegments =
    totalSpent > 0
      ? [
          // Orçamento livre primeiro — renderiza por baixo dos outros segmentos
          ...(freeBudget > 0 ? [{ value: freeBudget, color: "#F5F5F5", linecap: "butt" as const }] : []),
          { value: typeStats.avulsa || 0.001, color: "#99E83A" },
          { value: typeStats.fixa || 0.001, color: "#D6F5E3" },
          { value: typeStats.parcelada || 0.001, color: "#0C7341" },
        ]
      : [{ value: 1, color: "#F5F5F5" }];

  return (
    <DashboardPageClient
      user={{ name: user.name }}
      expenses={expenses.map((e: (typeof expenses)[number]) => ({
        ...e,
        date: e.date instanceof Date ? e.date.toISOString() : String(e.date),
        billingYm: e.billingYm,
      }))}
      totalSpent={totalSpent}
      categories={categories}
      cards={cards.map((c: { id: string; name: string; statementClosingDay?: number | null }) => ({
        id: c.id,
        name: c.name,
        statementClosingDay: c.statementClosingDay ?? null,
      }))}
      memberSpending={memberSpending}
      spendByPayment={spendByPayment}
      period={period}
      typeStats={typeStats}
      totalBudget={totalBudget}
      dailyBudget={dailyBudget}
      freeBudget={freeBudget}
      donutSegments={donutSegments}
    />
  );
}
