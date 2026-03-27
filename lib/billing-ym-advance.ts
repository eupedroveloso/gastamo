import { addDays } from "date-fns";
import { getCurrentStatementWindow } from "@/lib/statement-cycle";
import { parseLocalDateInput, toBrazilCalendarYMD } from "@/lib/date-local";
import { brazilCivilMonthDateRangeFromBillingYm } from "@/lib/expense-billing-ym";

/** Data de fechamento (BRT, meio-dia UTC estável) para um YYYY-MM de competência e dia de fechamento do cartão. */
export function billingYmToClosingEndDate(billingYm: string, closingDay: number): Date {
  const y = parseInt(billingYm.slice(0, 4), 10);
  const m = parseInt(billingYm.slice(5, 7), 10);
  const last = new Date(y, m, 0).getDate();
  const d = Math.min(closingDay, last);
  const pad = (n: number) => String(n).padStart(2, "0");
  return parseLocalDateInput(`${y}-${pad(m)}-${pad(d)}`);
}

/**
 * `startYm` após avançar `periodCount` períodos de fatura (fechamentos consecutivos com cartão;
 * sem cartão válido, avança mês civil).
 * `periodCount === 0` ⇒ `startYm`.
 */
export function advanceBillingYmByPeriodCount(
  startYm: string,
  card: { statementClosingDay: number | null } | null | undefined,
  periodCount: number,
): string {
  if (periodCount <= 0) return startYm;
  const day = card?.statementClosingDay;
  if (day == null || day < 1 || day > 31) {
    const y = parseInt(startYm.slice(0, 4), 10);
    const mo = parseInt(startYm.slice(5, 7), 10);
    const t = new Date(Date.UTC(y, mo - 1 + periodCount, 1));
    return `${t.getUTCFullYear()}-${String(t.getUTCMonth() + 1).padStart(2, "0")}`;
  }
  let end = billingYmToClosingEndDate(startYm, day);
  for (let i = 0; i < periodCount; i++) {
    const w = getCurrentStatementWindow(day, addDays(end, 1));
    end = w.end;
  }
  return toBrazilCalendarYMD(end).slice(0, 7);
}

/** Competência da parcela `indexZeroBased` (0 = primeira na fatura `firstYm`). */
export function billingYmForParcelIndex(
  firstYm: string,
  card: { statementClosingDay: number | null } | null | undefined,
  indexZeroBased: number,
): string {
  return advanceBillingYmByPeriodCount(firstYm, card, indexZeroBased);
}

/** Data gravada na linha: compra na 1.ª parcela; demais no fechamento (cartão) ou fim do mês civil. */
export function expenseDateForParcelRow(
  indexZeroBased: number,
  userPurchaseDate: Date,
  rowBillingYm: string,
  card: { statementClosingDay: number | null } | null | undefined,
): Date {
  if (indexZeroBased <= 0) return userPurchaseDate;
  const day = card?.statementClosingDay;
  if (day != null && day >= 1 && day <= 31) {
    return billingYmToClosingEndDate(rowBillingYm, day);
  }
  const { end } = brazilCivilMonthDateRangeFromBillingYm(rowBillingYm);
  return end;
}
