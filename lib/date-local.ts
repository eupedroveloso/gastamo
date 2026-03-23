/**
 * Datas de gastos são “dia de calendário” no Brasil (sem hora escolhida pelo usuário).
 * Evita `new Date("YYYY-MM-DD")` (meia-noite UTC → dia errado em BRT).
 */

export const BRAZIL_TZ = "America/Sao_Paulo";

/**
 * Converte YYYY-MM-DD do formulário em instante estável: meio-dia em São Paulo (15:00 UTC, BRT = UTC−3).
 */
export function parseLocalDateInput(dateStr: string): Date {
  const trimmed = dateStr.trim();
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(trimmed);
  if (!match) {
    const d = new Date(trimmed);
    return d;
  }
  const y = parseInt(match[1], 10);
  const m = parseInt(match[2], 10) - 1;
  const day = parseInt(match[3], 10);
  return new Date(Date.UTC(y, m, day, 15, 0, 0, 0));
}

/** YYYY-MM-DD do calendário brasileiro para esse instante (filtros, input type="date"). */
export function toBrazilCalendarYMD(date: Date | string): string {
  const x = typeof date === "string" ? new Date(date) : date;
  if (Number.isNaN(x.getTime())) return "";
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: BRAZIL_TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(x);
}

/** Hoje no calendário de São Paulo. */
export function getTodayBrazilYMD(): string {
  return toBrazilCalendarYMD(new Date());
}

/** Importação / API: se começar com YYYY-MM-DD, usa calendário Brasil; senão `new Date`. */
export function parseExpenseDateString(input: string): Date {
  const trimmed = input.trim();
  const head = trimmed.slice(0, 10);
  if (/^\d{4}-\d{2}-\d{2}$/.test(head)) {
    return parseLocalDateInput(head);
  }
  return new Date(trimmed);
}

/** Exibição curta para listagens (sempre no fuso Brasil). */
export function formatDateBrazil(date: Date | string): string {
  const x = typeof date === "string" ? new Date(date) : date;
  if (Number.isNaN(x.getTime())) return "—";
  return x.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
    timeZone: BRAZIL_TZ,
  });
}
