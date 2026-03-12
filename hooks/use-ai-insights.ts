"use client";

import { useState } from "react";
import type { FinanceAIRequest, FinanceAIResponse } from "@/lib/ai/finance-ai";
import { AI_ENABLED } from "@/lib/config";

export function useAIInsights() {
  const [data, setData] = useState<FinanceAIResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const analyze = async (request: FinanceAIRequest) => {
    if (!AI_ENABLED) return;
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/ai/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(request),
      });
      if (!res.ok) throw new Error(await res.text());
      setData(await res.json());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro desconhecido");
    } finally {
      setIsLoading(false);
    }
  };

  return { data, isLoading, error, isAvailable: AI_ENABLED, analyze };
}
