"use client";

import type { BillingCycle } from "@/lib/billing-cycle";
import { formatDateBrazil } from "@/lib/date-local";

type Props = {
  cycle: BillingCycle;
  onPrev: () => void;
  onNext: () => void;
  disabled?: boolean;
};

export function BillingCyclePicker({ cycle, onPrev, onNext, disabled }: Props) {
  return (
    <div
      style={{
        display: "flex",
        flexWrap: "wrap",
        alignItems: "center",
        gap: 10,
        padding: "8px 12px",
        background: "#F0FAF5",
        border: "1px solid #D6F5E3",
        borderRadius: 16,
        fontFamily: "inherit",
      }}
    >
      <span style={{ fontSize: 12, fontWeight: 600, color: "#525252", whiteSpace: "nowrap" }}>
        Ciclo da fatura
      </span>
      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
        <button
          type="button"
          aria-label="Ciclo anterior"
          disabled={disabled}
          onClick={onPrev}
          style={{
            width: 32,
            height: 32,
            borderRadius: 10,
            border: "1px solid #E5E5E5",
            background: "#FFFFFF",
            cursor: disabled ? "not-allowed" : "pointer",
            fontSize: 16,
            lineHeight: 1,
            opacity: disabled ? 0.5 : 1,
          }}
        >
          ‹
        </button>
        <span style={{ fontSize: 14, fontWeight: 600, color: "#0A0A0A", minWidth: 140, textAlign: "center" }}>
          {cycle.label}
        </span>
        <button
          type="button"
          aria-label="Próximo ciclo"
          disabled={disabled}
          onClick={onNext}
          style={{
            width: 32,
            height: 32,
            borderRadius: 10,
            border: "1px solid #E5E5E5",
            background: "#FFFFFF",
            cursor: disabled ? "not-allowed" : "pointer",
            fontSize: 16,
            lineHeight: 1,
            opacity: disabled ? 0.5 : 1,
          }}
        >
          ›
        </button>
      </div>
      <span style={{ fontSize: 12, fontWeight: 500, color: "#0F8F4E", whiteSpace: "nowrap" }}>
        Venc.: {formatDateBrazil(cycle.dueDate)}
      </span>
    </div>
  );
}
