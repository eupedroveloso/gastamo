import { parseLocalDateInput, BRAZIL_TZ } from "@/lib/date-local";

/** Dias no mês civil (Gregoriano), independente de fuso. */
function daysInMonth(year: number, month0: number): number {
  return new Date(Date.UTC(year, month0 + 1, 0)).getUTCDate();
}

function clampClosingDay(year: number, month0: number, closingDay: number): number {
  return Math.min(closingDay, daysInMonth(year, month0));
}

function addMonths(year: number, month0: number, delta: number): [number, number] {
  const d = new Date(Date.UTC(year, month0 + delta, 1));
  return [d.getUTCFullYear(), d.getUTCMonth()];
}

export function getBrazilDateParts(now = new Date()): { y: number; m: number; d: number } {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: BRAZIL_TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  const y = parseInt(parts.find((p) => p.type === "year")!.value, 10);
  const m = parseInt(parts.find((p) => p.type === "month")!.value, 10) - 1;
  const d = parseInt(parts.find((p) => p.type === "day")!.value, 10);
  return { y, m, d };
}

function ymd(y: number, m0: number, day: number): string {
  return `${y}-${String(m0 + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

/**
 * Janela da fatura em aberto (do dia seguinte ao fechamento anterior até o dia do fechamento atual, inclusive),
 * usando o calendário de São Paulo — alinhado a como as datas de gasto são gravadas.
 */
export function getCurrentStatementWindow(closingDay: number, now = new Date()): { start: Date; end: Date } {
  if (closingDay < 1 || closingDay > 31) {
    throw new Error("Dia de fechamento inválido");
  }

  const { y, m, d } = getBrazilDateParts(now);
  const thisClose = clampClosingDay(y, m, closingDay);

  let nextY = y;
  let nextM = m;
  if (d > thisClose) {
    [nextY, nextM] = addMonths(y, m, 1);
  }

  const endDay = clampClosingDay(nextY, nextM, closingDay);

  let prevY = nextY;
  let prevM = nextM;
  [prevY, prevM] = addMonths(nextY, nextM, -1);
  const prevCloseDay = clampClosingDay(prevY, prevM, closingDay);

  let startY = prevY;
  let startM = prevM;
  let startD = prevCloseDay + 1;
  const dimPrev = daysInMonth(prevY, prevM);
  if (startD > dimPrev) {
    /** Fechamento “30” em fevereiro: o banco costuma começar o ciclo antes do dia 1 do mês seguinte (ex.: 27 fev – 30 mar). */
    if (closingDay > dimPrev) {
      startD = 2 * dimPrev - closingDay + 1;
      if (startD < 1 || startD > dimPrev) {
        startD = 1;
        [startY, startM] = addMonths(prevY, prevM, 1);
      }
    } else {
      startD = 1;
      [startY, startM] = addMonths(prevY, prevM, 1);
    }
  }

  const start = parseLocalDateInput(ymd(startY, startM, startD));
  const end = parseLocalDateInput(ymd(nextY, nextM, endDay));

  return { start, end };
}

/** Referência visual para input type="date" (só o dia do mês é persistido). */
export function closingDayToInputValue(day: number | null | undefined): string {
  if (day == null || day < 1 || day > 31) return "";
  return `2000-01-${String(Math.min(day, 31)).padStart(2, "0")}`;
}

/** Extrai dia 1–31 de YYYY-MM-DD do formulário. */
export function parseClosingDayFromInput(ymdStr: string): number | null {
  const trimmed = ymdStr.trim();
  if (!trimmed) return null;
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(trimmed);
  if (!m) return null;
  const day = parseInt(m[3], 10);
  if (day < 1 || day > 31) return null;
  return day;
}
