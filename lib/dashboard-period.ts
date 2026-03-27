import { parseLocalDateInput } from "@/lib/date-local";
import { billingYmRangeFromYmd } from "@/lib/expense-billing-ym";

const YMD = /^(\d{4})-(\d{2})-(\d{2})$/;

/** Mês civil atual (relógio do servidor) — alinhado ao filtro padrão da lista de gastos. */
export function getDefaultDashboardPeriodYMD(): { from: string; to: string } {
  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth();
  const lastDay = new Date(y, m + 1, 0).getDate();
  const pad = (n: number) => String(n).padStart(2, "0");
  return {
    from: `${y}-${pad(m + 1)}-01`,
    to: `${y}-${pad(m + 1)}-${pad(lastDay)}`,
  };
}

function inclusiveDaysBetweenYmd(a: string, b: string): number {
  const [y1, m1, d1] = a.split("-").map(Number);
  const [y2, m2, d2] = b.split("-").map(Number);
  const t1 = Date.UTC(y1, m1 - 1, d1);
  const t2 = Date.UTC(y2, m2 - 1, d2);
  return Math.floor((t2 - t1) / 86400000) + 1;
}

const MAX_RANGE_DAYS = 366;

/**
 * Valida query `from` / `to` (YYYY-MM-DD), aplica padrão se inválido, troca ordem se necessário,
 * limita o tamanho do intervalo.
 */
export function parseDashboardPeriodParams(
  fromRaw: string | undefined | null,
  toRaw: string | undefined | null,
): { from: string; to: string; start: Date; end: Date; daysInPeriod: number } {
  const def = getDefaultDashboardPeriodYMD();
  const f = typeof fromRaw === "string" && YMD.test(fromRaw.trim()) ? fromRaw.trim() : def.from;
  const t = typeof toRaw === "string" && YMD.test(toRaw.trim()) ? toRaw.trim() : def.to;
  let from = f;
  let to = t;
  if (from > to) {
    const x = from;
    from = to;
    to = x;
  }
  const daysInPeriod = inclusiveDaysBetweenYmd(from, to);
  if (daysInPeriod > MAX_RANGE_DAYS || daysInPeriod < 1) {
    return parseDashboardPeriodParams(null, null);
  }
  const start = parseLocalDateInput(from);
  const end = parseLocalDateInput(to);
  return { from, to, start, end, daysInPeriod };
}

function daysInInclusiveYmRange(ymFrom: string, ymTo: string): number {
  let y = Number(ymFrom.slice(0, 4));
  let mo = Number(ymFrom.slice(5, 7));
  const yE = Number(ymTo.slice(0, 4));
  const mE = Number(ymTo.slice(5, 7));
  let days = 0;
  while (y < yE || (y === yE && mo <= mE)) {
    days += new Date(y, mo, 0).getDate();
    mo += 1;
    if (mo > 12) {
      mo = 1;
      y += 1;
    }
  }
  return days;
}

/**
 * Período do dashboard em termos de competência (YYYY-MM da fatura).
 * `daysInPeriod` = dias de calendário somados em cada mês civil do intervalo de referências (divisor de orçamento diário).
 */
export function resolveDashboardBillingPeriod(
  fromRaw: string | null | undefined,
  toRaw: string | null | undefined,
): ReturnType<typeof parseDashboardPeriodParams> & {
  ymFrom: string;
  ymTo: string;
  periodLabel: string;
} {
  const p = parseDashboardPeriodParams(fromRaw, toRaw);
  const { ymFrom, ymTo } = billingYmRangeFromYmd(p.from, p.to);
  const daysInPeriod = daysInInclusiveYmRange(ymFrom, ymTo);
  const periodLabel =
    ymFrom === ymTo
      ? `Faturas ref. ${ymFrom.slice(5, 7)}/${ymFrom.slice(0, 4)}`
      : `Faturas ${ymFrom.slice(5, 7)}/${ymFrom.slice(0, 4)} – ${ymTo.slice(5, 7)}/${ymTo.slice(0, 4)}`;
  return { ...p, ymFrom, ymTo, daysInPeriod, periodLabel };
}
