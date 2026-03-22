import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(req: NextRequest) {
  const secret = req.headers.get("authorization")?.replace("Bearer ", "");
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!process.env.OPENROUTER_API_KEY) {
    return NextResponse.json({ error: "AI not configured" }, { status: 503 });
  }

  const now = new Date();
  const weekStart = new Date(now);
  weekStart.setDate(now.getDate() - 7);

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

    const reports: { familyId: string; summary: string }[] = [];

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

      const fmt = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
      const days = ["domingo", "segunda", "terça", "quarta", "quinta", "sexta", "sábado"];
      const weekStartLabel = `${weekStart.getDate()}/${weekStart.getMonth() + 1}`;
      const weekEndLabel = `${now.getDate()}/${now.getMonth() + 1}`;

      const prompt = `Você é um assistente financeiro pessoal brasileiro. Analise os dados de gastos da semana da família "${family.name}" e escreva um resumo semanal em português, de forma amigável e útil. Seja direto e objetivo — máximo de 4 parágrafos curtos.

Dados da semana (${weekStartLabel} a ${weekEndLabel}):
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

      if (!res.ok) continue;

      const data = await res.json();
      const summary: string = data.choices?.[0]?.message?.content ?? "";
      if (!summary) continue;

      reports.push({ familyId: family.id, summary });

      // Create a notification for each family member
      await db.notification.createMany({
        data: family.members.map((m) => ({
          userId: m.user.id,
          type: "weekly_report",
          title: `Resumo semanal — ${weekStartLabel} a ${weekEndLabel}`,
          description: summary.slice(0, 200) + (summary.length > 200 ? "…" : ""),
          metadata: JSON.stringify({ fullReport: summary }),
        })),
      });
    }

    return NextResponse.json({ ok: true, reports: reports.length });
  } catch (err) {
    console.error("[weekly-report cron]", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
