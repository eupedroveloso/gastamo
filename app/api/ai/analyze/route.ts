import { NextRequest, NextResponse } from "next/server";
import { analyzeFinances, FinanceAIRequest } from "@/lib/ai/finance-ai";
import { AI_ENABLED } from "@/lib/config";

export async function POST(req: NextRequest) {
  if (!AI_ENABLED) {
    return NextResponse.json(
      { error: "AI feature not enabled" },
      { status: 503 }
    );
  }

  try {
    const body: FinanceAIRequest = await req.json();
    const result = await analyzeFinances(body);
    return NextResponse.json(result);
  } catch (err) {
    console.error("[AI analyze]", err);
    return NextResponse.json(
      { error: "Erro ao processar análise" },
      { status: 500 }
    );
  }
}
