import { NextRequest, NextResponse } from "next/server";
import { AI_ENABLED } from "@/lib/config";
import { getSession } from "@/lib/auth";

const SUPPORTED_TYPES = [
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
  "image/gif",
  "application/pdf",
];

const MAX_SIZE = 10 * 1024 * 1024; // 10MB

export async function POST(req: NextRequest) {
  if (!AI_ENABLED) {
    return NextResponse.json({ error: "IA não habilitada" }, { status: 503 });
  }

  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file || file.size === 0) {
      return NextResponse.json({ error: "Nenhum arquivo enviado" }, { status: 400 });
    }

    if (!SUPPORTED_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: "Formato não suportado. Use JPG, PNG, WebP ou PDF" },
        { status: 400 }
      );
    }

    if (file.size > MAX_SIZE) {
      return NextResponse.json(
        { error: "Arquivo muito grande (máximo 10MB)" },
        { status: 400 }
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const base64 = buffer.toString("base64");
    const dataUrl = `data:${file.type};base64,${base64}`;

    const today = new Date().toISOString().split("T")[0];

    const prompt = `Analise este documento/imagem e extraia TODOS os gastos, compras ou transações listados.

Retorne APENAS um JSON válido neste formato exato, sem nenhum texto adicional antes ou depois:
{
  "expenses": [
    {
      "name": "Nome do produto ou serviço",
      "amount": 0.00,
      "date": "YYYY-MM-DD",
      "type": "avulsa"
    }
  ]
}

Regras importantes:
- "name": descrição clara do gasto em português (máx 60 caracteres)
- "amount": valor numérico em reais (ex: 49.90), sem símbolo de moeda
- "date": data no formato YYYY-MM-DD. Se não encontrar, use ${today}
- "type": escolha entre:
  - "avulsa" → compra única, não recorrente
  - "fixa" → mensalidade, assinatura ou gasto que se repete todo mês
  - "parcelada" → compra dividida em parcelas
- Se for fatura de cartão de crédito: extraia cada item/compra separadamente
- Se for comprovante/recibo único: extraia como um único gasto com o valor total
- Se for extrato bancário: extraia apenas os débitos (saídas), ignore créditos e estornos
- Mantenha nomes originais dos estabelecimentos quando possível
- Se não houver gastos identificáveis, retorne: {"expenses": []}`;

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
        messages: [
          {
            role: "user",
            content: [
              {
                type: "image_url",
                image_url: { url: dataUrl },
              },
              {
                type: "text",
                text: prompt,
              },
            ],
          },
        ],
        temperature: 0.1,
        max_tokens: 3000,
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      console.error("[AI import]", res.status, errText);
      return NextResponse.json({ error: "Erro na análise pela IA" }, { status: 500 });
    }

    const data = await res.json();
    const content: string = data.choices?.[0]?.message?.content ?? "";

    // Extract JSON block from response
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return NextResponse.json(
        { error: "Não foi possível extrair dados do documento" },
        { status: 422 }
      );
    }

    let parsed: { expenses: unknown[] };
    try {
      parsed = JSON.parse(jsonMatch[0]);
    } catch {
      return NextResponse.json(
        { error: "Resposta da IA em formato inválido" },
        { status: 422 }
      );
    }

    const expenses = Array.isArray(parsed.expenses) ? parsed.expenses : [];

    if (expenses.length === 0) {
      return NextResponse.json(
        { error: "Nenhum gasto identificado no documento" },
        { status: 422 }
      );
    }

    return NextResponse.json({ expenses });
  } catch (err) {
    console.error("[AI import]", err);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
