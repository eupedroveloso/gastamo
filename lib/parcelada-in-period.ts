/**
 * Cálculo de quanto de uma compra parcelada entra num intervalo de datas do dashboard.
 *
 * Convenção (alinhada ao formulário de gastos):
 * - `amount` = valor de **uma parcela** (não o total da compra).
 * - `date` = data do lançamento (parcela atual).
 * - `currentInstallment` / `totalInstallments` = parcela atual e total no plano.
 * - Mês da 1.ª parcela = mês civil de `date` retrocedido `(currentInstallment - 1)` meses.
 *
 * Ex.: 3/6 com data em agosto → parcelas nos meses junho…novembro.
 */

type YearMonth = { y: number; m: number };

function toYearMonth(d: Date): YearMonth {
  return { y: d.getFullYear(), m: d.getMonth() + 1 };
}

function addMonths(ym: YearMonth, delta: number): YearMonth {
  const idx = ym.y * 12 + (ym.m - 1) + delta;
  return { y: Math.floor(idx / 12), m: (idx % 12) + 1 };
}

function monthBoundsLocal(ym: YearMonth): { start: Date; end: Date } {
  const start = new Date(ym.y, ym.m - 1, 1, 0, 0, 0, 0);
  const end = new Date(ym.y, ym.m, 0, 23, 59, 59, 999);
  return { start, end };
}

/**
 * Quantos meses do plano de parcelas intersectam [periodStart, periodEnd] (inclusive).
 */
export function installmentMonthsOverlappingPeriod(
  expenseDate: Date,
  currentInstallment: number | null | undefined,
  totalInstallments: number | null | undefined,
  periodStart: Date,
  periodEnd: Date,
): number {
  const n = totalInstallments ?? 0;
  if (n < 2) return 0;

  const cur = Math.max(1, currentInstallment ?? 1);
  const anchor = addMonths(toYearMonth(expenseDate), -(cur - 1));

  let count = 0;
  for (let k = 0; k < n; k++) {
    const ym = addMonths(anchor, k);
    const { start: monthStart, end: monthEnd } = monthBoundsLocal(ym);
    const overlaps = monthStart <= periodEnd && monthEnd >= periodStart;
    if (overlaps) count++;
  }
  return count;
}

export type ParceladaFields = {
  date: Date;
  amount: number;
  currentInstallment: number | null;
  totalInstallments: number | null;
};

/**
 * Contribuição em R$ desta linha parcelada no período.
 * Se `totalInstallments < 2`, retorna 0 — o caller soma esses casos via filtro “simples” por data.
 */
export function parceladaAmountInPeriod(
  e: ParceladaFields,
  periodStart: Date,
  periodEnd: Date,
): number {
  const n = e.totalInstallments ?? 0;
  if (n < 2) return 0;
  const months = installmentMonthsOverlappingPeriod(
    e.date,
    e.currentInstallment,
    e.totalInstallments,
    periodStart,
    periodEnd,
  );
  return e.amount * months;
}

function ymdToLocalDayStart(ymd: string): Date {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(ymd.trim());
  if (!m) return new Date(ymd);
  return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]), 0, 0, 0, 0);
}

function ymdToLocalDayEnd(ymd: string): Date {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(ymd.trim());
  if (!m) return new Date(ymd);
  return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]), 23, 59, 59, 999);
}

/**
 * Lista de gastos (filtro por intervalo YYYY-MM-DD): inclui parcelas cujo plano
 * intersecta o intervalo, mesmo quando `date` do lançamento está noutro mês.
 */
export function parceladaIntersectsYmdRange(
  expenseDate: Date,
  currentInstallment: number | null | undefined,
  totalInstallments: number | null | undefined,
  dateStart: string,
  dateEnd: string,
): boolean {
  const n = totalInstallments ?? 0;
  if (n < 2) return false;

  const FAR_PAST = new Date(1970, 0, 1);
  const FAR_FUTURE = new Date(2100, 11, 31, 23, 59, 59, 999);

  let periodStart = dateStart.trim() ? ymdToLocalDayStart(dateStart) : FAR_PAST;
  let periodEnd = dateEnd.trim() ? ymdToLocalDayEnd(dateEnd) : FAR_FUTURE;
  if (periodStart > periodEnd) {
    const t = periodStart;
    periodStart = periodEnd;
    periodEnd = t;
  }

  return (
    installmentMonthsOverlappingPeriod(
      expenseDate,
      currentInstallment,
      totalInstallments,
      periodStart,
      periodEnd,
    ) > 0
  );
}
