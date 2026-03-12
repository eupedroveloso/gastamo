"use client";

import { useState } from "react";
import { PlusIcon } from "./icons";
import { AddExpensePanel } from "./add-expense-panel";

interface Props {
  categories: { id: string; name: string }[];
  cards: { id: string; name: string }[];
  members: { userId: string; name: string }[];
}

export function ExpenseButtonPanel({ categories, cards, members }: Props) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        style={{
          display: "flex",
          alignItems: "center",
          gap: "var(--space-8)",
          background: "var(--color-bg-brand-default)",
          border: "none",
          borderRadius: "var(--radius-2xl)",
          padding: "8px 16px",
          cursor: "pointer",
        }}
      >
        <PlusIcon size={16} color="var(--color-fg-inverse)" />
        <span
          style={{
            fontWeight: 600,
            fontSize: 14,
            color: "var(--color-fg-inverse)",
            lineHeight: 1.5,
          }}
        >
          Novo Gasto
        </span>
      </button>

      <AddExpensePanel
        open={open}
        onClose={() => setOpen(false)}
        categories={categories}
        cards={cards}
        members={members}
      />
    </>
  );
}
