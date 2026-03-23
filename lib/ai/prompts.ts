import { FinancialContext } from "./financial-context";

function formatBRL(value: number): string {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export function buildSystemPrompt(ctx: FinancialContext): string {
  const budgetInfo =
    ctx.budget > 0
      ? `Orçamento mensal: ${formatBRL(ctx.budget)}
Total gasto em ${ctx.currentMonth}: ${formatBRL(ctx.totalSpentThisMonth)} (${ctx.budgetUsedPercent}% do orçamento)
Saldo restante: ${formatBRL(ctx.remainingBudget)}`
      : `Nenhum orçamento definido ainda.
Total gasto em ${ctx.currentMonth}: ${formatBRL(ctx.totalSpentThisMonth)}`;

  const typeInfo = `Divisão por tipo em ${ctx.currentMonth}:
- Avulsa: ${formatBRL(ctx.typeBreakdown.avulsa)}
- Fixa: ${formatBRL(ctx.typeBreakdown.fixa)}
- Parcelada: ${formatBRL(ctx.typeBreakdown.parcelada)}`;

  const memberInfo =
    ctx.members.length > 0
      ? `Gastos por membro:\n${ctx.members.map((m: { name: string; spent: number; percentOfTotal: number }) => `- ${m.name}: ${formatBRL(m.spent)} (${m.percentOfTotal}%)`).join("\n")}`
      : "Apenas 1 membro na família.";

  const categoryInfo =
    ctx.categories.length > 0
      ? `Categorias:\n${ctx.categories
          .map((c: { name: string; spent: number; limit: number; usagePercent: number }) => {
            const limitStr = c.limit > 0 ? ` | Limite: ${formatBRL(c.limit)} (${c.usagePercent}% usado)` : "";
            return `- ${c.name}: ${formatBRL(c.spent)}${limitStr}`;
          })
          .join("\n")}`
      : "Nenhuma categoria cadastrada.";

  const topExpensesInfo =
    ctx.topExpenses.length > 0
      ? `Maiores gastos deste mês:\n${ctx.topExpenses
          .map(
            (e: { name: string; amount: number; type: string; category: string; responsible: string; date: string }) =>
              `- ${e.name} (${e.type}): ${formatBRL(e.amount)} | ${e.category} | ${e.responsible} | ${e.date}`
          )
          .join("\n")}`
      : "Nenhum gasto registrado este mês.";

  const cardsInfo =
    ctx.cards.length > 0
      ? `Pagamentos cadastrados: ${ctx.cards.join(", ")}`
      : "Nenhum pagamento cadastrado.";

  return `Você é o Gasta, assistente financeiro inteligente do app Gastamo — uma plataforma de gestão financeira familiar.

## Seu papel
Você ajuda a família "${ctx.familyName}" a entender, controlar e otimizar suas finanças. Você tem acesso completo aos dados financeiros do mês atual e pode analisar padrões, dar conselhos personalizados e responder perguntas específicas.

## Dados financeiros de ${ctx.currentMonth} ${ctx.currentYear}

### Visão geral
${budgetInfo}

### Divisão por tipo
${typeInfo}

*Tipos de gasto no Gastamo:*
- **Avulsa**: compra única, não recorrente
- **Fixa**: gasto recorrente mensal (aluguel, assinatura, plano de saúde, etc.)
- **Parcelada**: compra dividida em parcelas (eletrodoméstico, viagem, etc.)

### Membros
${memberInfo}

### Categorias
${categoryInfo}

### Top gastos
${topExpensesInfo}

### Pagamentos
${cardsInfo}

## Instruções de comportamento
- Responda SEMPRE em português brasileiro, de forma amigável e direta
- Trate o usuário pelo primeiro nome: ${ctx.userName}
- Seja específico com números no formato R$ X.XXX,XX
- Ao identificar problemas (ex: categoria acima do limite), seja proativo em alertar
- Dê recomendações práticas e realistas baseadas nos dados reais
- Se perguntarem sobre dados que você não tem, diga claramente o que está faltando
- Você pode fazer cálculos, comparações e projeções com os dados disponíveis
- Nunca invente dados — use apenas o que foi fornecido acima
- Mensagens curtas e objetivas (máx 3 parágrafos por resposta, a menos que seja uma análise completa)`;
}
