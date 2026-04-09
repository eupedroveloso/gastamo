"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useCallback, useTransition } from "react";

const MONTHS_SHORT = ["JAN", "FEV", "MAR", "ABR", "MAI", "JUN", "JUL", "AGO", "SET", "OUT", "NOV", "DEZ"];

function monthToRange(ym: string): { from: string; to: string } {
  const y = parseInt(ym.slice(0, 4), 10);
  const m = parseInt(ym.slice(5, 7), 10);
  const lastDay = new Date(y, m, 0).getDate();
  const pad = (n: number) => String(n).padStart(2, "0");
  return { from: `${y}-${pad(m)}-01`, to: `${y}-${pad(m)}-${pad(lastDay)}` };
}

type Props = {
  from: string;
  to: string;
};

export function MonthRoulette({ from, to }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const currentFrom = searchParams.get("from") ?? from;
  const activeYear = parseInt(currentFrom.slice(0, 4), 10);
  const activeMonth = parseInt(currentFrom.slice(5, 7), 10) - 1; // 0-indexed

  // Always show exactly 7 months: 3 before + active + 3 after
  const entries: Array<{ year: number; month: number; offset: number }> = [];
  for (let offset = -3; offset <= 3; offset++) {
    let m = activeMonth + offset;
    let y = activeYear;
    while (m < 0) { m += 12; y--; }
    while (m > 11) { m -= 12; y++; }
    entries.push({ year: y, month: m, offset });
  }

  const applyMonth = useCallback(
    (year: number, month: number) => {
      const ym = `${year}-${String(month + 1).padStart(2, "0")}`;
      const { from: f, to: t } = monthToRange(ym);
      const next = new URLSearchParams(searchParams.toString());
      next.set("from", f);
      next.set("to", t);
      startTransition(() => {
        router.push(`${pathname}?${next.toString()}`);
      });
    },
    [router, pathname, searchParams],
  );

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "row",
        alignItems: "center",
        gap: 2,
        opacity: isPending ? 0.65 : 1,
        transition: "opacity 0.15s",
      }}
    >
      {entries.map(({ year, month, offset }) => {
        const isActive = offset === 0;
        const distance = Math.abs(offset);
        const opacity = isActive ? 1 : distance === 1 ? 0.7 : distance === 2 ? 0.45 : 0.25;

        return (
          <button
            key={`${year}-${month}`}
            onClick={() => applyMonth(year, month)}
            style={{
              flexShrink: 0,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: isActive ? "6px 14px" : "6px 10px",
              borderRadius: 9999,
              border: "none",
              cursor: "pointer",
              background: isActive ? "var(--color-bg-brand-default)" : "transparent",
              color: isActive ? "var(--color-fg-inverse)" : "var(--color-fg-default)",
              fontFamily: "var(--font-albert-sans), sans-serif",
              fontSize: 13,
              fontWeight: isActive ? 700 : 600,
              letterSpacing: "0.04em",
              opacity,
              transition: "opacity 0.15s, background 0.15s",
              whiteSpace: "nowrap",
            }}
          >
            {MONTHS_SHORT[month]}
            {year !== activeYear && (
              <span style={{ fontSize: 10, marginLeft: 2, opacity: 0.7 }}>
                {String(year).slice(2)}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
