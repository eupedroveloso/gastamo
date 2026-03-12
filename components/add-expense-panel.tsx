"use client";

import { useActionState, useEffect, useState } from "react";
import { CalendarRangeIcon, ChevronDownIcon, CloseIcon } from "./icons";
import { createExpense } from "@/lib/actions/expenses";

interface Props {
  open: boolean;
  onClose: () => void;
  categories: { id: string; name: string }[];
  cards: { id: string; name: string }[];
  members: { userId: string; name: string }[];
}

const EXPENSE_TYPES = [
  { value: "avulsa", label: "Avulsa" },
  { value: "fixa", label: "Fixa" },
  { value: "parcelada", label: "Parcelada" },
];

function FormField({
  label,
  children,
  helperText,
}: {
  label: string;
  children: React.ReactNode;
  helperText?: string;
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
      <label
        style={{
          fontWeight: 600,
          fontSize: 12,
          letterSpacing: "0.2px",
          color: "var(--color-fg-muted)",
          lineHeight: 1.5,
        }}
      >
        {label}
      </label>
      {children}
      {helperText && (
        <span
          style={{
            fontWeight: 400,
            fontSize: 10,
            letterSpacing: "0.4px",
            color: "var(--color-fg-subtle)",
            lineHeight: 1.5,
          }}
        >
          {helperText}
        </span>
      )}
    </div>
  );
}

const fieldStyle = {
  display: "flex",
  alignItems: "center",
  gap: "var(--space-8)",
  background: "var(--color-bg-default)",
  border: "var(--border-sm) solid var(--color-border-default)",
  borderRadius: "var(--radius-2xl)",
  padding: "8px 12px",
} as const;

const inputStyle = {
  flex: 1,
  border: "none",
  outline: "none",
  background: "transparent",
  fontFamily: "inherit",
  fontWeight: 400,
  fontSize: 13,
  lineHeight: 1.5,
  color: "var(--color-fg-default)",
} as const;

export function AddExpensePanel({ open, onClose, categories, cards, members }: Props) {
  const [state, formAction, isPending] = useActionState(createExpense, null);
  const [selectedType, setSelectedType] = useState("avulsa");

  useEffect(() => {
    if (state?.success) {
      onClose();
    }
  }, [state, onClose]);

  if (!open) return null;

  return (
    <>
      <div
        onClick={onClose}
        style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.3)", zIndex: 40 }}
      />

      <div
        style={{
          position: "fixed",
          top: 0,
          right: 0,
          bottom: 0,
          width: 410,
          zIndex: 50,
          display: "flex",
          flexDirection: "column",
          background: "var(--color-bg-default)",
          borderLeft: "var(--border-sm) solid var(--color-border-muted)",
          borderRadius: "var(--radius-4xl) 0 0 var(--radius-4xl)",
          animation: "slideIn 0.3s ease-out",
        }}
      >
        <form
          action={formAction}
          style={{
            display: "flex",
            flexDirection: "column",
            height: "100%",
          }}
        >
          <div
            style={{
              padding: "var(--space-32)",
              display: "flex",
              flexDirection: "column",
              gap: "var(--space-40)",
              flex: 1,
              overflowY: "auto",
            }}
          >
            {/* Header */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <span style={{ fontWeight: 400, fontSize: 16, color: "var(--color-fg-default)", lineHeight: 1.5 }}>
                Adicionar Gasto
              </span>
              <button
                type="button"
                onClick={onClose}
                style={{
                  width: 48,
                  height: 32,
                  background: "var(--color-bg-default)",
                  border: "var(--border-sm) solid var(--color-border-default)",
                  borderRadius: "var(--radius-2xl)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  cursor: "pointer",
                }}
              >
                <CloseIcon size={16} color="var(--color-fg-default)" />
              </button>
            </div>

            {/* Amount */}
            <div style={{ display: "flex", alignItems: "baseline", gap: 4 }}>
              <span style={{ fontWeight: 700, fontSize: 40, lineHeight: 1.2, letterSpacing: "-0.8px", color: "var(--color-bg-brand-strong)" }}>
                R$
              </span>
              <input
                name="amount"
                defaultValue="0,00"
                placeholder="0,00"
                style={{
                  fontWeight: 700,
                  fontSize: 40,
                  lineHeight: 1.2,
                  letterSpacing: "-0.8px",
                  color: "var(--color-bg-brand-strong)",
                  border: "none",
                  outline: "none",
                  background: "transparent",
                  fontFamily: "inherit",
                  width: "100%",
                }}
              />
            </div>

            {/* Error */}
            {state?.error && (
              <p style={{ fontSize: 13, color: "#f87171", background: "rgba(248,113,113,0.1)", padding: "8px 12px", borderRadius: "var(--radius-lg)" }}>
                {state.error}
              </p>
            )}

            {/* Fields */}
            <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-16)" }}>
              <FormField label="Nome do Gasto">
                <div style={fieldStyle}>
                  <input name="name" placeholder="Ex: Café da manhã" required style={inputStyle} />
                </div>
              </FormField>

              <FormField
                label="Identificador na Fatura"
                helperText="Esta informação não aparece na tabela de Gastos"
              >
                <div style={fieldStyle}>
                  <input name="invoiceId" placeholder="Ex: Mr.Soluctions32" style={inputStyle} />
                </div>
              </FormField>

              <FormField label="Data do Gasto">
                <div style={fieldStyle}>
                  <input name="date" type="date" required style={{ ...inputStyle, color: "var(--color-fg-subtle)" }} />
                  <CalendarRangeIcon size={16} color="var(--color-fg-subtle)" />
                </div>
              </FormField>

              <FormField label="Tipo de Gasto">
                <div style={{ display: "flex", gap: "var(--space-8)" }}>
                  {EXPENSE_TYPES.map((t) => {
                    const isSelected = selectedType === t.value;
                    return (
                      <label
                        key={t.value}
                        onClick={() => setSelectedType(t.value)}
                        style={{
                          flex: 1,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          padding: "8px 12px",
                          border: isSelected
                            ? "var(--border-sm) solid var(--color-bg-brand-default)"
                            : "var(--border-sm) solid var(--color-border-default)",
                          borderRadius: "var(--radius-2xl)",
                          cursor: "pointer",
                          fontSize: 13,
                          fontWeight: isSelected ? 600 : 400,
                          color: isSelected ? "var(--color-bg-brand-default)" : "var(--color-fg-subtle)",
                          lineHeight: 1.5,
                          userSelect: "none",
                          background: isSelected ? "rgba(26,173,99,0.08)" : "transparent",
                          transition: "all 0.15s",
                        }}
                      >
                        <input
                          type="radio"
                          name="type"
                          value={t.value}
                          checked={isSelected}
                          onChange={() => setSelectedType(t.value)}
                          style={{ display: "none" }}
                        />
                        {t.label}
                      </label>
                    );
                  })}
                </div>
              </FormField>

              <FormField label="Categoria">
                <div style={fieldStyle}>
                  <select
                    name="categoryId"
                    defaultValue=""
                    style={{ ...inputStyle, color: "var(--color-fg-subtle)", cursor: "pointer" }}
                  >
                    <option value="">Selecione uma Categoria</option>
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                  <ChevronDownIcon size={16} color="var(--color-fg-subtle)" />
                </div>
              </FormField>

              <FormField label="Responsável">
                <div style={fieldStyle}>
                  <select
                    name="responsibleId"
                    defaultValue=""
                    required
                    style={{ ...inputStyle, color: "var(--color-fg-subtle)", cursor: "pointer" }}
                  >
                    <option value="">Selecione quem fez o gasto</option>
                    {members.map((m) => (
                      <option key={m.userId} value={m.userId}>{m.name}</option>
                    ))}
                  </select>
                  <ChevronDownIcon size={16} color="var(--color-fg-subtle)" />
                </div>
              </FormField>

              <FormField label="Cartão Utilizado">
                <div style={fieldStyle}>
                  <select
                    name="cardId"
                    defaultValue=""
                    style={{ ...inputStyle, color: "var(--color-fg-subtle)", cursor: "pointer" }}
                  >
                    <option value="">Selecione o Cartão</option>
                    {cards.map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                  <ChevronDownIcon size={16} color="var(--color-fg-subtle)" />
                </div>
              </FormField>
            </div>
          </div>

          {/* Footer */}
          <div
            style={{
              padding: "var(--space-16) var(--space-32) var(--space-32)",
              display: "flex",
              flexDirection: "column",
              gap: "var(--space-8)",
            }}
          >
            <button
              type="submit"
              disabled={isPending}
              style={{
                width: "100%",
                padding: "12px 16px",
                background: isPending ? "var(--color-bg-brand-strong)" : "var(--color-bg-brand-default)",
                border: "none",
                borderRadius: "var(--radius-2xl)",
                fontFamily: "inherit",
                fontWeight: 600,
                fontSize: 16,
                color: "var(--color-fg-inverse)",
                cursor: isPending ? "not-allowed" : "pointer",
                lineHeight: 1.5,
                transition: "background 0.2s",
              }}
            >
              {isPending ? "Salvando..." : "Adicionar"}
            </button>
            <button
              type="button"
              onClick={onClose}
              style={{
                width: "100%",
                padding: "8px 16px",
                background: "var(--color-bg-default)",
                border: "none",
                borderRadius: "var(--radius-2xl)",
                fontFamily: "inherit",
                fontWeight: 600,
                fontSize: 14,
                color: "var(--color-fg-subtle)",
                cursor: "pointer",
                lineHeight: 1.5,
              }}
            >
              Cancelar
            </button>
          </div>
        </form>
      </div>

      <style>{`
        @keyframes slideIn {
          from { transform: translateX(100%); }
          to { transform: translateX(0); }
        }
      `}</style>
    </>
  );
}
