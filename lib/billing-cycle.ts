import { addDays } from "date-fns";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { getCurrentStatementWindow } from "@/lib/statement-cycle";

export type BillingCycle = {
  startDate: Date;
  endDate: Date;
  dueDate: Date;
  label: string;
};

function formatCycleLabelPt(start: Date, end: Date): string {
  const a = format(start, "d MMM", { locale: ptBR }).replace(/\./g, "").trim();
  const b = format(end, "d MMM", { locale: ptBR }).replace(/\./g, "").trim();
  return `${a} – ${b}`;
}

/**
 * Ciclo de faturamento do cartão (calendário Brasil, mesma base que `getCurrentStatementWindow`).
 *
 * @param closingDay — dia de fechamento (1–31), alinhado a `statementClosingDay` no modelo `Card`.
 * @param referenceDate — “hoje” para determinar o ciclo corrente (padrão: instante atual).
 * @param cycleOffset — 0 = ciclo que contém `referenceDate`; -1 / +1 = ciclo anterior / seguinte.
 * @param dueDayOffset — dias após o fechamento (`endDate`) até o vencimento.
 */
export function getBillingCycle(
  closingDay: number,
  referenceDate: Date = new Date(),
  cycleOffset: number = 0,
  dueDayOffset: number = 7,
): BillingCycle {
  if (closingDay < 1 || closingDay > 31) {
    throw new Error("Dia de fechamento inválido (use 1–31)");
  }

  let window = getCurrentStatementWindow(closingDay, referenceDate);
  let steps = cycleOffset;

  while (steps > 0) {
    const ref = addDays(window.end, 1);
    window = getCurrentStatementWindow(closingDay, ref);
    steps--;
  }
  while (steps < 0) {
    const ref = addDays(window.start, -1);
    window = getCurrentStatementWindow(closingDay, ref);
    steps++;
  }

  const dueDate = addDays(window.end, dueDayOffset);

  return {
    startDate: window.start,
    endDate: window.end,
    dueDate,
    label: formatCycleLabelPt(window.start, window.end),
  };
}
