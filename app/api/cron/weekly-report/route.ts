import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

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
}): string {
  const fmt = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  const { familyName, totalSpent, expenseCount, budget, memberBreakdown, topCategories } = params;
  const p1 = `Olá! Este é o resumo semanal da família "${familyName}". No período foram registrados ${expenseCount} gasto${expenseCount !== 1 ? "s" : ""}, totalizando ${fmt(totalSpent)}.`;
  const p2 = budget > 0 ? `O orçamento mensal da família é ${fmt(budget)}.` : "Ainda não há orçamento mensal definido para a família.";
  const p3 = `Gastos por integrante: ${memberBreakdown}.`;
  const p4 = topCategories ? `Principais categorias: ${topCategories}.` : "";
  const p5 = "Acesse o Gastamo para ver detalhes e planejar a próxima semana.";
  return [p1, p2, p3, p4, p5].filter(Boolean).join(" ");
}

/**
 * Cron Vercel: `10 19 * * 0` = domingo 19:10 UTC ≈ 16:10 em Brasília (America/Sao_Paulo).
 * Proteja com CRON_SECRET: Authorization: Bearer <CRON_SECRET>
 */
export async function GET(req: NextRequest) {
  const secret = req.headers.get("authorization")?.replace("Bearer ", "");
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = new Date();
  const weekStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  const periodLabel = `${formatBrt(weekStart, { day: "2-digit", month: "short" })} – ${formatBrt(now, { day: "2-digit", month: "short", year: "numeric" })}`;

  try {
    const families = await db.family.findMany({
      include: {
        members: { include: { user: { select: { id: true, name: true } } } },
        expenses: {
          where: { date: { gte: weekStart, lte: now } },
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
        const prompt = `Você é um assistente financeiro pessoal brasileiro. Analise os dados de gastos da semana da família "${family.name}" e escreva um resumo semanal em português, de forma amigável e útil. Seja direto e objetivo — máximo de 4 parágrafos curtos.

Período (${periodLabel}):
- Total gasto: ${fmt(totalSpent)}
- Orçamento mensal da família: ${fmt(family.budget)}
- Número de transações: ${family.expenses.length}
- Por integrante: ${memberBreakdown}
- Por categoria: ${topCategories.join(", ")}

Escreva um resumo que:
1. Destaque o total gasto e se está dentro do esperado para a semana
2. Aponte os principais padrões de gastos
3. Dê uma observação construtiva ou dica para a próxima semana
Não use bullet points, escreva em parágrafos fluidos.`;

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
        });
      }

      await db.notification.createMany({
        data: family.members.map((m) => ({
          userId: m.user.id,
          type: "weekly_report",
          title: `Relatório semanal de domingo — ${periodLabel}`,
          description: summary,
          metadata: JSON.stringify({ period: periodLabel }),
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
