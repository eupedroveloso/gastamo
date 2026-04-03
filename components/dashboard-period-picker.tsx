"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useCallback, useTransition } from "react";
import { Calendar } from "./calendar";

type Props = {
  from: string;
  to: string;
};

function monthToRange(ym: string): { from: string; to: string } {
  const y = parseInt(ym.slice(0, 4), 10);
  const m = parseInt(ym.slice(5, 7), 10);
  const lastDay = new Date(y, m, 0).getDate();
  const pad = (n: number) => String(n).padStart(2, "0");
  return { from: `${y}-${pad(m)}-01`, to: `${y}-${pad(m)}-${pad(lastDay)}` };
}

export function DashboardPeriodPicker({ from, to }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const currentFrom = searchParams.get("from") ?? from;

  const applyMonth = useCallback(
    (ymd: string) => {
      if (!ymd) return;
      const { from: f, to: t } = monthToRange(ymd.slice(0, 7));
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
    <div style={{ opacity: isPending ? 0.65 : 1, transition: "opacity 0.15s", flexShrink: 0 }}>
      <Calendar
        value={currentFrom}
        onChange={applyMonth}
        placeholder="Selecione o mês"
        competenceMonthLabel
      />
    </div>
  );
}
