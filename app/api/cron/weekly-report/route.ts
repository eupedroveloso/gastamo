import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getTodayBrazilYMD } from "@/lib/date-local";
import { brazilCivilMonthDateRangeFromBillingYm, LEGACY_EXPENSE_BILLING_YM } from "@/lib/expense-billing-ym";

/** Fuso para rótulos do relatório (Brasil sem horário de verão). */
const TZ = "America/Sao_Paulo";

function formatBrt(d: Date, opts: Intl.DateTimeFormatOptions) {
  return new Intl.DateTimeFormat("pt-BR", { timeZone: TZ, ...opts }).format(d);
}

function buildFallbackWeeklySummary(params: {
  familyName: string;
  totalSpent: number;
  expenseCount: number;
  budget: number;
  memberBreakdown: string;
  topCategories: string;
  billingYmLabel: string;
}): string {
  const fmt = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  const { familyName, totalSpent, expenseCount, budget, memberBreakdown, topCategories, billingYmLabel } = params;
  const p1 = `Olá! Este é o resumo semanal da família "${familyName}". No mês de referência da fatura ${billingYmLabel} há ${expenseCount} gasto${expenseCount !== 1 ? "s" : ""}, totalizando ${fmt(totalSpent)}.`;
  const p2 = budget > 0 ? `O orçamento mensal da família é ${fmt(budget)}.` : "Ainda não há orçamento mensal definido para a família.";
  const p3 = `Gastos por integrante: ${memberBreakdown}.`;
  const p4 = topCategories ? `Principais categorias: ${topCategories}.` : "";
  const p5 = "Acesse o Gastamo para ver detalhes e acompanhar a fatura.";
  return [p1, p2, p3, p4, p5].filter(Boolean).join(" ");
}

/**
 * Cron Vercel: `10 19 * * 0` = domingo 19:10 UTC ≈ 16:10 em Brasília (America/Sao_Paulo).
 * Proteja com CRON_SECRET: Authorization: Bearer <CRON_SECRET>
 *
 * Agrega gastos pela competência atual (`billingYm` = YYYY-MM em BRT, igual ao dashboard),
 * não pelo intervalo civil de 7 dias. O rótulo da semana civil só contextualiza o envio.
 */
export async function GET(req: NextRequest) {
  const secret = req.headers.get("authorization")?.replace("Bearer ", "");
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = new Date();
  const weekStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  const currentBillingYm = getTodayBrazilYMD().slice(0, 7);
  const [by, bm] = [currentBillingYm.slice(0, 4), currentBillingYm.slice(5, 7)];
  const billingYmLabel = `${bm}/${by}`;

  const weekRangeLabel = `${formatBrt(weekStart, { day: "2-digit", month: "short" })} – ${formatBrt(now, { day: "2-digit", month: "short", year: "numeric" })}`;
  const periodLabel = `${weekRangeLabel} · Fatura ref. ${billingYmLabel}`;

  const { start: civilMonthStart, end: civilMonthEnd } =
    brazilCivilMonthDateRangeFromBillingYm(currentBillingYm);
  const weeklyReportExpenseWhere = {
    OR: [
      { billingYm: currentBillingYm },
      { billingYm: LEGACY_EXPENSE_BILLING_YM, date: { gte: civilMonthStart, lte: civilMonthEnd } },
    ],
  };

  try {
    const families = await db.family.findMany({
      include: {
        members: { include: { user: { select: { id: true, name: true } } } },
        expenses: {
          where: weeklyReportExpenseWhere,
          include: {
            category: { select: { name: true } },
            responsible: { select: { name: true } },
          },
        },
        categories: { select: { name: true, limitAmount: true } },
      },
    });

    let reportCount = 0;

    for (const family of families) {
      if (family.members.length === 0 || family.expenses.length === 0) continue;

      const totalSpent = family.expenses.reduce((s, e) => s + e.amount, 0);
      const byCategory: Record<string, number> = {};
      const byMember: Record<string, number> = {};

      for (const e of family.expenses) {
        const cat = e.category?.name ?? "Sem categoria";
        byCategory[cat] = (byCategory[cat] ?? 0) + e.amount;
        const mem = e.responsible.name;
        byMember[mem] = (byMember[mem] ?? 0) + e.amount;
      }

      const topCategories = Object.entries(byCategory)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([name, amount]) => `${name}: R$ ${amount.toFixed(2)}`);

      const memberBreakdown = Object.entries(byMember)
        .map(([name, amount]) => `${name}: R$ ${amount.toFixed(2)}`)
        .join(", ");

      let summary: string;

      if (process.env.OPENROUTER_API_KEY) {
        const fmt = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
        const prompt = `Você é um assistente financeiro pessoal brasileiro. A família "${family.name}" usa competência por fatura: os valores abaixo são todos os gastos já contabilizados no mês de referência **${billingYmLabel}** (YYYY-MM: ${currentBillingYm}), não apenas os lançados na última semana civil.

Este e-mail é enviado semanalmente (semana civil ${weekRangeLabel}) como lembrete do andamento **dessa fatura/mês de referência**.

Dados:
- Total no mês de referência da fatura: ${fmt(totalSpent)}
- Orçamento mensal da família: ${fmt(family.budget)}
- Número de transações (nesse mês de referência): ${family.expenses.length}
- Por integrante: ${memberBreakdown}
- Por categoria: ${topCategories.join(", ")}

Escreva um resumo em português (máx. 4 parágrafos curtos), amigável e útil:
1. Comente o total em relação ao orçamento mensal (ainda há parte do mês pela frente).
2. Destaque padrões de gastos por categoria ou pessoa.
3. Uma dica objetiva para as próximas semanas até o fim desse mês de referência.
Não use bullet points; texto fluido.`;

        const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
            "HTTP-Referer": process.env.OPENROUTER_SITE_URL ?? "https://gastamo.app",
            "X-Title": process.env.OPENROUTER_APP_NAME ?? "Gastamo",
          },
          body: JSON.stringify({
            model: process.env.OPENROUTER_MODEL ?? "google/gemini-2.0-flash-001",
            messages: [{ role: "user", content: prompt }],
            temperature: 0.7,
            max_tokens: 600,
          }),
        });

        if (!res.ok) {
          summary = buildFallbackWeeklySummary({
            familyName: family.name,
            totalSpent,
            expenseCount: family.expenses.length,
            budget: family.budget,
            memberBreakdown,
            topCategories: topCategories.join(", "),
            billingYmLabel,
          });
        } else {
          const data = await res.json();
          summary = (data.choices?.[0]?.message?.content as string) ?? "";
          if (!summary.trim()) {
            summary = buildFallbackWeeklySummary({
              familyName: family.name,
              totalSpent,
              expenseCount: family.expenses.length,
              budget: family.budget,
              memberBreakdown,
              topCategories: topCategories.join(", "),
              billingYmLabel,
            });
          }
        }
      } else {
        summary = buildFallbackWeeklySummary({
          familyName: family.name,
          totalSpent,
          expenseCount: family.expenses.length,
          budget: family.budget,
          memberBreakdown,
          topCategories: topCategories.join(", "),
          billingYmLabel,
        });
      }

      await db.notification.createMany({
        data: family.members.map((m) => ({
          userId: m.user.id,
          type: "weekly_report",
          title: `Relatório semanal — fatura ${billingYmLabel}`,
          description: summary,
          metadata: JSON.stringify({
            period: periodLabel,
            weekRangeLabel,
            billingYm: currentBillingYm,
            billingYmLabel,
          }),
        })),
      });

      reportCount++;
    }

    return NextResponse.json({ ok: true, reports: reportCount });
  } catch (err) {
    console.error("[weekly-report cron]", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
