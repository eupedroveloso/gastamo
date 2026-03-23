"use client";

import { useMemo, useState, useCallback } from "react";
import { getBillingCycle, type BillingCycle } from "@/lib/billing-cycle";

export type CardBillingInput = {
  statementClosingDay: number | null | undefined;
  dueDayOffset?: number | null | undefined;
};

/**
 * Ciclo de faturamento para um cartão com `statementClosingDay` definido.
 * `cycleOffset` em estado local: navegação entre ciclos.
 */
export function useBillingCycle(card: CardBillingInput | null | undefined) {
  const [cycleOffset, setCycleOffset] = useState(0);

  const closingDay = card?.statementClosingDay;
  const dueOff = card?.dueDayOffset ?? 7;

  const cycle: BillingCycle | null = useMemo(() => {
    if (closingDay == null || closingDay < 1 || closingDay > 31) return null;
    return getBillingCycle(closingDay, new Date(), cycleOffset, dueOff);
  }, [closingDay, dueOff, cycleOffset]);

  const goPrev = useCallback(() => setCycleOffset((o) => o - 1), []);
  const goNext = useCallback(() => setCycleOffset((o) => o + 1), []);
  const resetOffset = useCallback(() => setCycleOffset(0), []);

  return {
    cycle,
    cycleOffset,
    setCycleOffset,
    goPrev,
    goNext,
    resetOffset,
    hasBilling: cycle != null,
  };
}
