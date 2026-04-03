import { parseLocalDateInput, toBrazilCalendarYMD } from "@/lib/date-local";

const YM = /^(\d{4})-(\d{2})$/;

/**
 * Valor placeholder antes do backfill de `billingYm`. Gastos ainda assim devem entrar
 * nos filtros pela data civil até serem recalculados.
 */
export const LEGACY_EXPENSE_BILLING_YM = "2000-01";

/** Início e fim do mês civil (BRT) de um YYYY-MM, para `Date` em DB (parseLocalDateInput). */
export function brazilCivilMonthDateRangeFromBillingYm(billingYm: string): { start: Date; end: Date } {
  const y = parseInt(billingYm.slice(0, 4), 10);
  const mo = parseInt(billingYm.slice(5, 7), 10);
  const pad = (n: number) => String(n).padStart(2, "0");
  const startStr = `${y}-${pad(mo)}-01`;
  const lastDay = new Date(y, mo, 0).getDate();
  const endStr = `${y}-${pad(mo)}-${pad(lastDay)}`;
  return { start: parseLocalDateInput(startStr), end: parseLocalDateInput(endStr) };
}

/** Normaliza string YYYY-MM. */
export function parseBillingYm(raw: string | null | undefined): string | null {
  if (!raw || !YM.test(raw.trim())) return null;
  return raw.trim();
}

/** Exibição curta da competência (mm/aaaa). Legado ou inválido → "—". */
export function formatBillingYmShort(ym: string | null | undefined): string {
  if (!ym || ym === LEGACY_EXPENSE_BILLING_YM || !YM.test(ym)) return "—";
  return `${ym.slice(5, 7)}/${ym.slice(0, 4)}`;
}

/**
 * Competência padrão (YYYY-MM) quando o formulário não envia `billingYm`:
 * mês civil (BRT) da data do gasto.
 */
export function computeExpenseBillingYm(
  expenseDate: Date,
  _card?: { statementClosingDay: number | null } | null | undefined,
): string {
  return toBrazilCalendarYMD(expenseDate).slice(0, 7);
}

/**
 * Converte intervalo de datas (YYYY-MM-DD) em intervalo de billingYm (YYYY-MM) inclusivo, por strings lexicográficas.
 */
export function billingYmRangeFromYmd(fromYmd: string, toYmd: string): { ymFrom: string; ymTo: string } {
  const fa = /^(\d{4})-(\d{2})-\d{2}$/.exec(fromYmd.trim());
  const ta = /^(\d{4})-(\d{2})-\d{2}$/.exec(toYmd.trim());
  let ymFrom = fromYmd.slice(0, 7);
  let ymTo = toYmd.slice(0, 7);
  if (fa && ta) {
    ymFrom = `${fa[1]}-${fa[2]}`;
    ymTo = `${ta[1]}-${ta[2]}`;
  }
  if (ymFrom > ymTo) {
    const x = ymFrom;
    ymFrom = ymTo;
    ymTo = x;
  }
  return { ymFrom, ymTo };
}
