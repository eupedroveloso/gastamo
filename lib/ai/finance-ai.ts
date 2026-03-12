import { openRouterChat } from "./openrouter-client";

export interface FinanceAIRequest {
  userName: string;
  month: string;
  expenses: {
    name: string;
    category: string;
    amount: number;
    date: string;
    responsible: string;
    card: string;
  }[];
  totalBudget: number;
  totalSpent: number;
  members: string[];
}

export interface FinanceAIResponse {
  summary: string;
  insights: string[];
  recommendations: string[];
  alerts: string[];
  topCategories: { name: string; percentage: number }[];
}

const SYSTEM_PROMPT = `
Você é um assistente financeiro pessoal para o app Gastamo, usado por famílias brasileiras.
Analise os dados de gastos e retorne um JSON válido com esta estrutura exata:
{
  "summary": "string",
  "insights": ["string"],
  "recommendations": ["string"],
  "alerts": ["string"],
  "topCategories": [{ "name": "string", "percentage": number }]
}
Regras:
- Todos os valores monetários estão em centavos — converta para reais ao apresentar (ex: 150000 = R$ 1.500,00)
- Use linguagem amigável e direta em português brasileiro
- Seja específico com números e categorias mencionadas
- Retorne APENAS o JSON, sem markdown ou texto adicional
`;

export async function analyzeFinances(
  request: FinanceAIRequest
): Promise<FinanceAIResponse> {
  const userMessage = `
Usuário: ${request.userName}
Mês: ${request.month}
Membros da família: ${request.members.join(", ")}
Orçamento total: ${request.totalBudget} centavos
Total gasto: ${request.totalSpent} centavos

Gastos do mês:
${request.expenses
  .map(
    (e) =>
      `- ${e.name} | ${e.category} | R$ ${(e.amount / 100).toFixed(2)} | ${e.date} | ${e.responsible} | ${e.card}`
  )
  .join("\n")}
  `.trim();

  const raw = await openRouterChat([
    { role: "system", content: SYSTEM_PROMPT },
    { role: "user", content: userMessage },
  ]);

  try {
    return JSON.parse(raw) as FinanceAIResponse;
  } catch {
    throw new Error("Resposta inválida da IA: " + raw);
  }
}
