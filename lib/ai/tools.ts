export type ToolCallParam = {
  id: string;
  type: "function";
  function: {
    name: string;
    arguments: string;
  };
};

export type ExtendedChatMessage = {
  role: "system" | "user" | "assistant" | "tool";
  content: string | null;
  tool_calls?: ToolCallParam[];
  tool_call_id?: string;
};

export const AI_TOOLS = [
  {
    type: "function" as const,
    function: {
      name: "get_expenses",
      description:
        "Busca gastos de qualquer período (passado, atual ou futuro). Retorna lista completa com IDs para edição e exclusão. Use sempre que precisar analisar dados fora do mês atual ou obter IDs para editar/excluir.",
      parameters: {
        type: "object",
        properties: {
          from_month: {
            type: "string",
            description: "Mês inicial no formato YYYY-MM (ex: 2025-01)",
          },
          to_month: {
            type: "string",
            description: "Mês final no formato YYYY-MM (ex: 2025-03)",
          },
        },
        required: ["from_month", "to_month"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "get_financial_summary",
      description:
        "Retorna resumo financeiro consolidado de qualquer período: total gasto, por tipo, por categoria (com limites), por membro e por cartão. Ideal para projeções, comparações e análise histórica.",
      parameters: {
        type: "object",
        properties: {
          from_month: {
            type: "string",
            description: "Mês inicial YYYY-MM",
          },
          to_month: {
            type: "string",
            description: "Mês final YYYY-MM",
          },
        },
        required: ["from_month", "to_month"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "create_expense",
      description:
        "Cria um novo gasto na família. Confirme os dados com o usuário antes de executar. Para tipo parcelada, informe totalInstallments e currentInstallment.",
      parameters: {
        type: "object",
        properties: {
          name: { type: "string", description: "Nome/descrição do gasto" },
          amount: { type: "number", description: "Valor em reais" },
          date: { type: "string", description: "Data da compra YYYY-MM-DD" },
          type: {
            type: "string",
            enum: ["avulsa", "fixa", "parcelada"],
            description: "Tipo do gasto",
          },
          billingYm: {
            type: "string",
            description: "Mês de competência YYYY-MM",
          },
          responsibleId: {
            type: "string",
            description: "ID do membro responsável (da lista de membros do contexto)",
          },
          categoryId: {
            type: "string",
            description: "ID da categoria (opcional, da lista de categorias do contexto)",
          },
          cardId: {
            type: "string",
            description: "ID do cartão de pagamento (opcional, da lista de cartões do contexto)",
          },
          totalInstallments: {
            type: "number",
            description: "Total de parcelas (apenas para tipo parcelada)",
          },
          currentInstallment: {
            type: "number",
            description: "Número da parcela atual (apenas para tipo parcelada)",
          },
        },
        required: ["name", "amount", "date", "type", "billingYm", "responsibleId"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "update_expense",
      description:
        "Atualiza campos de um gasto existente. Primeiro use get_expenses para obter o ID. Informe apenas os campos que devem mudar.",
      parameters: {
        type: "object",
        properties: {
          expenseId: { type: "string", description: "ID do gasto (obtido via get_expenses)" },
          name: { type: "string", description: "Novo nome" },
          amount: { type: "number", description: "Novo valor em reais" },
          date: { type: "string", description: "Nova data YYYY-MM-DD" },
          type: {
            type: "string",
            enum: ["avulsa", "fixa", "parcelada"],
            description: "Novo tipo",
          },
          billingYm: { type: "string", description: "Novo mês de competência YYYY-MM" },
          categoryId: {
            type: "string",
            description: "ID da nova categoria, ou string vazia para remover",
          },
          cardId: {
            type: "string",
            description: "ID do novo cartão, ou string vazia para remover",
          },
        },
        required: ["expenseId"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "delete_expense",
      description:
        "Exclui um gasto permanentemente. OBRIGATÓRIO: sempre peça confirmação explícita ao usuário antes. Só chame com confirmed=true se o usuário confirmou nesta mesma conversa.",
      parameters: {
        type: "object",
        properties: {
          expenseId: {
            type: "string",
            description: "ID do gasto (obtido via get_expenses)",
          },
          expenseName: {
            type: "string",
            description: "Nome do gasto para exibir na confirmação",
          },
          confirmed: {
            type: "boolean",
            description:
              "true somente após o usuário confirmar explicitamente a exclusão nesta conversa",
          },
        },
        required: ["expenseId", "expenseName", "confirmed"],
      },
    },
  },
];

export function getToolStatusMessage(
  name: string,
  args: Record<string, unknown>
): string {
  switch (name) {
    case "get_expenses":
      return `🔍 Buscando gastos de ${args.from_month} a ${args.to_month}...`;
    case "get_financial_summary":
      return `📊 Calculando resumo de ${args.from_month} a ${args.to_month}...`;
    case "create_expense":
      return `✏️ Criando gasto "${args.name}"...`;
    case "update_expense":
      return `✏️ Atualizando gasto...`;
    case "delete_expense":
      return args.confirmed
        ? `🗑️ Excluindo "${args.expenseName}"...`
        : `⚠️ Verificando exclusão de "${args.expenseName}"...`;
    default:
      return `⚙️ Processando...`;
  }
}
