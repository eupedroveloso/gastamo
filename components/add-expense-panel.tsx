"use client";

import { useState } from "react";
import { CalendarRangeIcon, ChevronDownIcon, CloseIcon } from "./icons";

interface AddExpensePanelProps {
  open: boolean;
  onClose: () => void;
}

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

function InputField({
  placeholder,
  type = "text",
  icon,
}: {
  placeholder: string;
  type?: string;
  icon?: React.ReactNode;
}) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: "var(--space-8)",
        background: "var(--color-bg-default)",
        border: "var(--border-sm) solid var(--color-border-default)",
        borderRadius: "var(--radius-2xl)",
        padding: "8px 12px",
      }}
    >
      <input
        type={type}
        placeholder={placeholder}
        style={{
          flex: 1,
          border: "none",
          outline: "none",
          background: "transparent",
          fontFamily: "inherit",
          fontWeight: 400,
          fontSize: 13,
          lineHeight: 1.5,
          color: "var(--color-fg-default)",
        }}
      />
      {icon}
    </div>
  );
}

function SelectField({ placeholder }: { placeholder: string }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: "var(--space-8)",
        background: "var(--color-bg-default)",
        border: "var(--border-sm) solid var(--color-border-default)",
        borderRadius: "var(--radius-2xl)",
        padding: "8px 12px",
        cursor: "pointer",
      }}
    >
      <span
        style={{
          flex: 1,
          fontWeight: 400,
          fontSize: 13,
          lineHeight: 1.5,
          color: "var(--color-fg-subtle)",
        }}
      >
        {placeholder}
      </span>
      <ChevronDownIcon size={16} color="var(--color-fg-subtle)" />
    </div>
  );
}

export function AddExpensePanel({ open, onClose }: AddExpensePanelProps) {
  const [amount, setAmount] = useState("000,00");

  if (!open) return null;

  return (
    <>
      <div
        onClick={onClose}
        style={{
          position: "fixed",
          inset: 0,
          background: "rgba(0,0,0,0.3)",
          zIndex: 40,
        }}
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
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <span
              style={{
                fontWeight: 400,
                fontSize: 16,
                color: "var(--color-fg-default)",
                lineHeight: 1.5,
              }}
            >
              Adicionar Gasto
            </span>
            <button
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

          {/* Amount input */}
          <div>
            <div
              style={{
                display: "flex",
                alignItems: "baseline",
                gap: 4,
              }}
            >
              <span
                style={{
                  fontWeight: 700,
                  fontSize: 40,
                  lineHeight: 1.2,
                  letterSpacing: "-0.8px",
                  color: "var(--color-bg-brand-strong)",
                }}
              >
                R${" "}
              </span>
              <input
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
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
          </div>

          {/* Form fields */}
          <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-16)" }}>
            <FormField label="Nome do Gasto">
              <InputField placeholder="Ex: Café da manhã" />
            </FormField>

            <FormField
              label="Identificador na Fatura"
              helperText="Esta informação não aparece na tabela de Gastos"
            >
              <InputField placeholder="Ex: Mr.Soluctions32" />
            </FormField>

            <FormField label="Data do Gasto">
              <InputField
                placeholder="Selecione a Data"
                type="date"
                icon={<CalendarRangeIcon size={16} color="var(--color-fg-subtle)" />}
              />
            </FormField>

            <FormField label="Categoria">
              <SelectField placeholder="Selecione uma Categoria" />
            </FormField>

            <FormField label="Responsável">
              <SelectField placeholder="Selecione quem fez o gasto" />
            </FormField>

            <FormField label="Cartão Utilizado">
              <SelectField placeholder="Selecione o Cartão" />
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
            style={{
              width: "100%",
              padding: "12px 16px",
              background: "var(--color-bg-brand-default)",
              border: "none",
              borderRadius: "var(--radius-2xl)",
              fontFamily: "inherit",
              fontWeight: 600,
              fontSize: 16,
              color: "var(--color-fg-inverse)",
              cursor: "pointer",
              lineHeight: 1.5,
            }}
          >
            Adicionar
          </button>
          <button
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
