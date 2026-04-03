import { brazilCivilMonthDateRangeFromBillingYm } from "@/lib/expense-billing-ym";

export function addCivilMonths(ym: string, delta: number): string {
  const y = parseInt(ym.slice(0, 4), 10);
  const mo = parseInt(ym.slice(5, 7), 10);
  const t = new Date(Date.UTC(y, mo - 1 + delta, 1));
  return `${t.getUTCFullYear()}-${String(t.getUTCMonth() + 1).padStart(2, "0")}`;
}

/**
 * `startYm` após avançar `periodCount` meses civis de competência.
 */
export function advanceBillingYmByPeriodCount(startYm: string, periodCount: number): string {
  if (periodCount <= 0) return startYm;
  return addCivilMonths(startYm, periodCount);
}

/** Competência da parcela `indexZeroBased` (0 = primeira na fatura `firstYm`). */
export function billingYmForParcelIndex(firstYm: string, _card: unknown, indexZeroBased: number): string {
  return advanceBillingYmByPeriodCount(firstYm, indexZeroBased);
}

/** Data gravada na linha: compra na 1.ª parcela; demais no último dia do mês civil da competência. */
export function expenseDateForParcelRow(
  indexZeroBased: number,
  userPurchaseDate: Date,
  rowBillingYm: string,
  _card: unknown,
): Date {
  if (indexZeroBased <= 0) return userPurchaseDate;
  const { end } = brazilCivilMonthDateRangeFromBillingYm(rowBillingYm);
  return end;
}
