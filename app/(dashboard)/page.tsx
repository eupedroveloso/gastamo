"use client";

import { useState } from "react";
import { PlusIcon } from "@/components/icons";
import { AddExpensePanel } from "@/components/add-expense-panel";
import { DonutChart } from "@/components/donut-chart";
import { AI_ENABLED } from "@/lib/config";

function AvatarStack({ count = 2, size = 32 }: { count?: number; size?: number }) {
  const colors = ["var(--color-bg-brand-accent)", "var(--color-bg-brand-muted)", "var(--color-bg-brand-strong)"];
  return (
    <div style={{ display: "flex", alignItems: "center" }}>
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          style={{
            width: size,
            height: size,
            borderRadius: "50%",
            background: colors[i % colors.length],
            border: "2px solid var(--color-bg-default)",
            marginLeft: i > 0 ? -8 : 0,
            zIndex: count - i,
            position: "relative",
          }}
        />
      ))}
    </div>
  );
}

const mockExpenses = [
  { name: "Supermercado", category: "Alimentação", card: "Nubank", responsible: "Pedro", date: "12/03", value: "R$ 250,00" },
  { name: "Gasolina", category: "Transporte", card: "Inter", responsible: "Ana", date: "11/03", value: "R$ 180,00" },
  { name: "Netflix", category: "Lazer", card: "Nubank", responsible: "Pedro", date: "10/03", value: "R$ 55,90" },
  { name: "Farmácia", category: "Saúde", card: "Inter", responsible: "Ana", date: "09/03", value: "R$ 89,00" },
  { name: "Café", category: "Alimentação", card: "Nubank", responsible: "Pedro", date: "08/03", value: "R$ 12,00" },
];

const categoryLimits = [
  { name: "Alimentação", percentage: 72 },
  { name: "Transporte", percentage: 55 },
  { name: "Lazer", percentage: 40 },
  { name: "Saúde", percentage: 30 },
  { name: "Educação", percentage: 15 },
  { name: "Outros", percentage: 10 },
];

export default function DashboardPage() {
  const [panelOpen, setPanelOpen] = useState(false);

  return (
    <>
      {/* Header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "var(--space-16)",
          borderRadius: "var(--radius-3xl)",
          height: 70,
        }}
      >
        <h1
          style={{
            fontWeight: 400,
            fontSize: 32,
            lineHeight: 1.2,
            letterSpacing: "-0.6px",
            color: "#000000",
          }}
        >
          Olá Pedro
        </h1>
        <button
          onClick={() => setPanelOpen(true)}
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
      </div>

      {/* Main 2-column layout */}
      <div
        style={{
          display: "flex",
          gap: "var(--space-16)",
          flex: 1,
          width: "100%",
        }}
      >
        {/* Left Column — Budget Cards */}
        <div
          style={{
            flex: "0 1 40%",
            maxWidth: "40%",
            background: "var(--color-bg-default)",
            border: "var(--border-sm) solid var(--color-border-muted)",
            borderRadius: "var(--radius-4xl)",
            padding: "var(--space-16)",
            display: "flex",
            flexDirection: "column",
            gap: "var(--space-8)",
          }}
        >
          {/* Card 1 — Orçamento Geral */}
          <div
            style={{
              flex: 1,
              background: "var(--color-bg-brand-default)",
              border: "var(--border-sm) solid var(--color-border-muted)",
              borderRadius: "var(--radius-3xl)",
              padding: "var(--space-24)",
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-between",
            }}
          >
            <AvatarStack count={2} size={32} />
            <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
              <span style={{ fontWeight: 600, fontSize: 14, color: "var(--color-fg-inverse)", lineHeight: 1.5 }}>
                Orçamento Geral
              </span>
              <span style={{ fontWeight: 700, fontSize: 48, lineHeight: 1.1, letterSpacing: "-1px", color: "var(--color-fg-inverse)" }}>
                R$ 00,00
              </span>
              <span style={{ fontWeight: 600, fontSize: 14, color: "var(--color-fg-inverse)", lineHeight: 1.5 }}>
                R$ 00,00/dia
              </span>
            </div>
          </div>

          {/* Card 2 — Membro 1 */}
          <div
            style={{
              flex: 1,
              background: "var(--color-bg-brand-accent)",
              border: "var(--border-sm) solid var(--color-border-muted)",
              borderRadius: "var(--radius-3xl)",
              padding: "var(--space-24)",
              display: "flex",
              flexDirection: "column",
              justifyContent: "flex-end",
              gap: "var(--space-4)",
            }}
          >
            <span style={{ fontWeight: 600, fontSize: 14, color: "var(--color-bg-brand-strong)", lineHeight: 1.5 }}>
              De quem é
            </span>
            <span style={{ fontWeight: 700, fontSize: 48, lineHeight: 1.1, letterSpacing: "-1px", color: "var(--color-fg-default)" }}>
              R$ 00,00
            </span>
            <span style={{ fontWeight: 600, fontSize: 14, color: "var(--color-fg-default)", lineHeight: 1.5 }}>
              R$ 00,00/dia
            </span>
          </div>

          {/* Card 3 — Membro 2 */}
          <div
            style={{
              flex: 1,
              background: "var(--color-bg-brand-muted)",
              border: "var(--border-sm) solid var(--color-border-muted)",
              borderRadius: "var(--radius-3xl)",
              padding: "var(--space-24)",
              display: "flex",
              flexDirection: "column",
              justifyContent: "flex-end",
              gap: "var(--space-4)",
            }}
          >
            <span style={{ fontWeight: 600, fontSize: 14, color: "var(--color-fg-default)", lineHeight: 1.5 }}>
              De quem é
            </span>
            <span style={{ fontWeight: 700, fontSize: 48, lineHeight: 1.1, letterSpacing: "-1px", color: "var(--color-fg-default)" }}>
              R$ 00,00
            </span>
            <span style={{ fontWeight: 600, fontSize: 14, color: "var(--color-fg-default)", lineHeight: 1.5 }}>
              R$ 00,00/dia
            </span>
          </div>

          {/* Card 4 — Membro 3 */}
          <div
            style={{
              flex: 1,
              background: "var(--color-bg-default)",
              border: "var(--border-sm) solid var(--color-border-default)",
              borderRadius: "var(--radius-3xl)",
              padding: "var(--space-24)",
              display: "flex",
              flexDirection: "column",
              justifyContent: "flex-end",
              gap: "var(--space-4)",
            }}
          >
            <span style={{ fontWeight: 600, fontSize: 14, color: "var(--color-bg-brand-strong)", lineHeight: 1.5 }}>
              De quem é
            </span>
            <span style={{ fontWeight: 700, fontSize: 48, lineHeight: 1.1, letterSpacing: "-1px", color: "var(--color-bg-brand-strong)" }}>
              R$ 00,00
            </span>
            <span style={{ fontWeight: 600, fontSize: 14, color: "var(--color-bg-brand-strong)", lineHeight: 1.5 }}>
              R$ 00,00/dia
            </span>
          </div>
        </div>

        {/* Right Column */}
        <div
          style={{
            flex: "0 1 60%",
            maxWidth: "60%",
            display: "flex",
            flexDirection: "column",
            gap: "var(--space-16)",
          }}
        >
          {/* Últimos Gastos */}
          <div
            style={{
              background: "var(--color-bg-default)",
              border: "var(--border-sm) solid var(--color-border-muted)",
              borderRadius: "var(--radius-4xl)",
              padding: "var(--space-16)",
              display: "flex",
              flexDirection: "column",
              gap: "var(--space-8)",
            }}
          >
            {/* Section Header */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "8px 16px",
              }}
            >
              <span style={{ fontWeight: 400, fontSize: 16, color: "var(--color-fg-default)", lineHeight: 1.5 }}>
                Últimos Gastos
              </span>
              <span
                style={{
                  fontWeight: 300,
                  fontSize: 12,
                  letterSpacing: "0.2px",
                  color: "var(--color-fg-default)",
                  padding: "8px 16px",
                  borderRadius: "var(--radius-2xl)",
                  cursor: "pointer",
                  lineHeight: 1.5,
                }}
              >
                Ver tudo
              </span>
            </div>

            {/* Table Header */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "2fr 1.2fr 1fr 1fr 1fr 1fr",
                alignItems: "center",
                gap: "var(--space-8)",
                padding: "16px 24px",
                background: "var(--color-bg-subtle)",
                borderRadius: "var(--radius-3xl)",
                width: "100%",
              }}
            >
              <span style={{ fontWeight: 600, fontSize: 14, color: "var(--color-fg-default)", lineHeight: 1.5 }}>
                Nome do Gasto
              </span>
              <span style={{ fontWeight: 300, fontSize: 14, color: "var(--color-fg-default)", textAlign: "center", lineHeight: 1.5 }}>
                Categoria
              </span>
              <span style={{ fontWeight: 300, fontSize: 14, color: "var(--color-fg-default)", textAlign: "center", lineHeight: 1.5 }}>
                Cartão
              </span>
              <span style={{ fontWeight: 300, fontSize: 14, color: "var(--color-fg-default)", textAlign: "center", lineHeight: 1.5 }}>
                Responsável
              </span>
              <span style={{ fontWeight: 300, fontSize: 14, color: "var(--color-fg-default)", textAlign: "center", lineHeight: 1.5 }}>
                Data
              </span>
              <span style={{ fontWeight: 300, fontSize: 14, color: "var(--color-fg-default)", textAlign: "center", lineHeight: 1.5 }}>
                Valor
              </span>
            </div>

            {/* Table Body */}
            <div
              style={{
                background: "var(--color-bg-default)",
                border: "var(--border-sm) solid var(--color-border-muted)",
                borderRadius: "var(--radius-3xl)",
              }}
            >
              {mockExpenses.map((expense, i) => (
                <div
                  key={i}
                  style={{
                    display: "grid",
                    gridTemplateColumns: "2fr 1.2fr 1fr 1fr 1fr 1fr",
                    alignItems: "center",
                    gap: "var(--space-8)",
                    padding: "16px 24px",
                    borderBottom: i < mockExpenses.length - 1 ? "var(--border-sm) solid var(--color-border-muted)" : "none",
                    width: "100%",
                  }}
                >
                  <span style={{ fontWeight: 600, fontSize: 14, color: "var(--color-fg-default)", lineHeight: 1.5 }}>
                    {expense.name}
                  </span>
                  <span style={{ display: "flex", justifyContent: "center" }}>
                    <span
                      style={{
                        background: "var(--color-bg-muted)",
                        padding: "2px 4px",
                        borderRadius: "var(--radius-2xl)",
                        fontWeight: 600,
                        fontSize: 12,
                        color: "var(--color-fg-muted)",
                        lineHeight: 1.5,
                        whiteSpace: "nowrap",
                      }}
                    >
                      {expense.category}
                    </span>
                  </span>
                  <span style={{ fontWeight: 400, fontSize: 12, color: "var(--color-fg-default)", textAlign: "center", lineHeight: 1.5 }}>
                    {expense.card}
                  </span>
                  <span style={{ fontWeight: 400, fontSize: 12, color: "var(--color-fg-default)", textAlign: "center", lineHeight: 1.5 }}>
                    {expense.responsible}
                  </span>
                  <span style={{ fontWeight: 400, fontSize: 12, color: "var(--color-fg-default)", textAlign: "center", lineHeight: 1.5 }}>
                    {expense.date}
                  </span>
                  <span style={{ fontWeight: 600, fontSize: 12, color: "var(--color-fg-brand)", textAlign: "center", lineHeight: 1.5 }}>
                    {expense.value}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Bottom Row — 2 cards */}
          <div
            style={{
              display: "flex",
              gap: "var(--space-16)",
              flex: 1,
            }}
          >
            {/* Divisão do Orçamento */}
            <div
              style={{
                flex: 1,
                background: "var(--color-bg-default)",
                border: "var(--border-sm) solid var(--color-border-muted)",
                borderRadius: "var(--radius-4xl)",
                padding: "16px 16px 36px 16px",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: "var(--space-24)",
              }}
            >
              {/* Card Header */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  width: "100%",
                  padding: "8px 0",
                }}
              >
                <span style={{ fontWeight: 400, fontSize: 16, color: "var(--color-fg-default)", lineHeight: 1.5 }}>
                  Divisão do Orçamento
                </span>
                <AvatarStack count={2} size={24} />
              </div>

              {/* Donut Chart */}
              <DonutChart
                segments={[
                  { value: 50, color: "var(--color-bg-brand-default)" },
                  { value: 30, color: "var(--color-bg-brand-accent)" },
                  { value: 20, color: "var(--color-bg-brand-strong)" },
                ]}
                centerLabel="R$ 000,00"
                centerSublabel="De R$ 000,00"
              />

              {/* Legend */}
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "var(--space-8)",
                  width: "100%",
                  padding: "0 16px",
                }}
              >
                {[
                  { color: "var(--color-bg-subtle)", textColor: "var(--color-fg-default)", label: "Orçamento" },
                  { color: "var(--color-bg-brand-accent)", textColor: "var(--color-fg-default)", label: "Gastos Fixos" },
                  { color: "var(--color-bg-brand-strong)", textColor: "var(--color-fg-inverse)", label: "Outros Gastos" },
                ].map((item, i) => (
                  <div key={i} style={{ display: "flex", alignItems: "center", gap: "var(--space-8)" }}>
                    <span
                      style={{
                        background: item.color,
                        color: item.textColor,
                        padding: "4px 8px",
                        borderRadius: "var(--radius-lg)",
                        fontWeight: 600,
                        fontSize: 12,
                        lineHeight: 1.5,
                      }}
                    >
                      {item.label}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Limite por Categoria */}
            <div
              style={{
                flex: 1,
                background: "var(--color-bg-default)",
                border: "var(--border-sm) solid var(--color-border-muted)",
                borderRadius: "var(--radius-4xl)",
                padding: "var(--space-16)",
                display: "flex",
                flexDirection: "column",
                gap: "var(--space-8)",
              }}
            >
              {/* Card Header */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "8px 0",
                }}
              >
                <span style={{ fontWeight: 400, fontSize: 16, color: "var(--color-fg-default)", lineHeight: 1.5 }}>
                  Limite por Categoria
                </span>
                <span
                  style={{
                    fontWeight: 300,
                    fontSize: 12,
                    letterSpacing: "0.2px",
                    color: "var(--color-fg-default)",
                    cursor: "pointer",
                    lineHeight: 1.5,
                  }}
                >
                  Ver mais
                </span>
              </div>

              {/* Category items */}
              {categoryLimits.map((cat, i) => (
                <div
                  key={i}
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "var(--space-8)",
                    padding: "0 8px",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ fontWeight: 300, fontSize: 12, letterSpacing: "0.2px", color: "var(--color-fg-default)", lineHeight: 1.5 }}>
                      {cat.name}
                    </span>
                    <span style={{ fontWeight: 300, fontSize: 12, letterSpacing: "0.2px", color: "var(--color-fg-default)", lineHeight: 1.5 }}>
                      {cat.percentage}%
                    </span>
                  </div>
                  <div
                    style={{
                      background: "var(--color-bg-subtle)",
                      height: 8,
                      borderRadius: "var(--radius-lg)",
                      overflow: "hidden",
                    }}
                  >
                    <div
                      style={{
                        background: "var(--color-bg-brand-default)",
                        height: "100%",
                        borderRadius: "var(--radius-lg)",
                        width: `${cat.percentage}%`,
                        transition: "width 0.3s",
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Slot reservado para AI Insights */}
      {AI_ENABLED && (
        <div style={{ marginTop: "var(--space-16)" }}>
          {/* AIInsightsCard será renderizado aqui quando AI_ENABLED = true */}
        </div>
      )}

      {/* Add Expense Panel */}
      <AddExpensePanel open={panelOpen} onClose={() => setPanelOpen(false)} />
    </>
  );
}
