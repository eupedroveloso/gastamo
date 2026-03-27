"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useCallback, useTransition } from "react";
import { CalendarRange } from "./calendar";

type Props = {
  from: string;
  to: string;
};

export function DashboardPeriodPicker({ from, to }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const start = searchParams.get("from") ?? from;
  const end = searchParams.get("to") ?? to;

  const applyRange = useCallback(
    (s: string, e: string) => {
      const next = new URLSearchParams(searchParams.toString());
      next.set("from", s);
      next.set("to", e);
      startTransition(() => {
        router.push(`${pathname}?${next.toString()}`);
      });
    },
    [router, pathname, searchParams],
  );

  const resetMonth = useCallback(() => {
    startTransition(() => {
      router.push(pathname);
    });
  }, [router, pathname]);

  return (
    <div
      style={{
        display: "flex",
        alignItems: "flex-start",
        gap: 12,
        flexWrap: "wrap",
        flexShrink: 0,
        justifyContent: "flex-end",
      }}
    >
      <div
        style={{
          opacity: isPending ? 0.65 : 1,
          transition: "opacity 0.15s",
          flexShrink: 0,
          maxWidth: "100%",
        }}
      >
        <CalendarRange startDate={start} endDate={end} onChange={applyRange} placeholder="Competência (faturas)" />
      </div>
      <button
        type="button"
        onClick={resetMonth}
        style={{
          padding: "8px 14px",
          borderRadius: 16,
          border: "1px solid #E5E5E5",
          background: "#FFFFFF",
          fontSize: 13,
          fontWeight: 600,
          color: "#0A0A0A",
          cursor: "pointer",
          fontFamily: "inherit",
          lineHeight: 1.5,
        }}
      >
        Mês atual
      </button>
    </div>
  );
}
