"use client";

import { Suspense } from "react";
import { DonutChart } from "@/components/donut-chart";
import { ExpenseButtonPanel } from "@/components/expense-button-panel";
import { DashboardPeriodPicker } from "@/components/dashboard-period-picker";
import { CardSpendingChart } from "@/components/card-spending-chart";
import { formatDateBrazil } from "@/lib/date-local";
import { formatBillingYmShort } from "@/lib/expense-billing-ym";
import { DASHBOARD_BOTTOM_ROW, DASHBOARD_GRID_DEFAULT_LAYOUT } from "@/lib/dashboard-layout-grid";
import { DASHBOARD_WIDGET_ORDER, type DashboardWidgetId } from "@/lib/dashboard-widget-ids";

function formatBRL(value: number) {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function AvatarStack({ members }: { members: { name: string; avatar?: string | null }[] }) {
  const colors = [
    "var(--color-bg-brand-accent)",
    "var(--color-bg-brand-muted)",
    "var(--color-bg-brand-strong)",
  ];
  const shown = members.slice(0, 3);
  return (
    <div style={{ display: "flex", alignItems: "center" }}>
      {shown.map((m, i) => (
        <div
          key={i}
          title={m.name}
          style={{
            width: 32,
            height: 32,
            borderRadius: "50%",
            background: colors[i % colors.length],
            border: "2px solid var(--color-bg-default)",
            marginLeft: i > 0 ? -8 : 0,
            zIndex: shown.length - i,
            position: "relative",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 11,
            fontWeight: 600,
            color: i === 2 ? "var(--color-fg-inverse)" : "var(--color-fg-default)",
          }}
        >
          {m.avatar ? (
            <img src={m.avatar} alt={m.name} style={{ width: "100%", height: "100%", borderRadius: "50%", objectFit: "cover" }} />
          ) : (
            m.name.charAt(0).toUpperCase()
          )}
        </div>
      ))}
    </div>
  );
}

export type DashboardPageClientProps = {
  user: { name: string };
  expenses: Array<{
    id: string;
    name: string;
    amount: number;
    date: string;
    billingYm: string;
    category: { id: string; name: string } | null;
    responsible: { id: string; name: string };
    card: { id: string; name: string; image: string | null } | null;
  }>;
  totalSpent: number;
  categories: Array<{ id: string; name: string; limitAmount: number; spent: number; percentage: number }>;
  cards: Array<{ id: string; name: string; statementClosingDay?: number | null }>;
  memberSpending: Array<{
    userId: string;
    name: string;
    avatar: string | null;
    spent: number;
    dailyBudget: number;
  }>;
  spendByPayment: Array<{ id: string; name: string; image: string | null; amount: number }>;
  period: { from: string; to: string; ymFrom?: string; ymTo?: string };
  typeStats: { avulsa: number; fixa: number; parcelada: number };
  totalBudget: number;
  dailyBudget: number;
  freeBudget: number;
  donutSegments: Array<{ value: number; color: string }>;
};

export function DashboardPageClient(props: DashboardPageClientProps) {
  const {
    user,
    expenses,
    totalSpent,
    categories,
    cards,
    memberSpending,
    spendByPayment,
    period,
    typeStats,
    totalBudget,
    dailyBudget,
    freeBudget,
    donutSegments,
  } = props;

  const panelMembers = memberSpending.map((m) => ({ userId: m.userId, name: m.name }));

  const widgets: Record<DashboardWidgetId, React.ReactNode> = {
    budget_column: (
      <div
        style={{
          height: "100%",
          minHeight: 0,
          flex: 1,
          display: "flex",
          flexDirection: "column",
          background: "var(--color-bg-default)",
          border: "var(--border-sm) solid var(--color-border-muted)",
          borderRadius: "var(--radius-4xl)",
          padding: "var(--space-16)",
          gap: "var(--space-8)",
          overflow: "auto",
          boxSizing: "border-box",
        }}
      >
        <div
          style={{
            flex: 1,
            minHeight: 140,
            background: "var(--color-bg-brand-default)",
            border: "var(--border-sm) solid var(--color-border-muted)",
            borderRadius: "var(--radius-3xl)",
            padding: "var(--space-24)",
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
          }}
        >
          <AvatarStack members={memberSpending} />
          <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
            <span style={{ fontWeight: 600, fontSize: 14, color: "var(--color-fg-inverse)", lineHeight: 1.5 }}>Saldo Disponível</span>
            <span style={{ fontWeight: 700, fontSize: 48, lineHeight: 1.1, letterSpacing: "-1px", color: "var(--color-fg-inverse)" }}>
              {formatBRL(freeBudget)}
            </span>
            <span style={{ fontWeight: 600, fontSize: 14, color: "var(--color-fg-inverse)", lineHeight: 1.5 }}>
              {formatBRL(totalBudget)} orçamento total
            </span>
          </div>
        </div>
        {memberSpending.length === 0 ? (
          <div
            style={{
              flex: 1,
              minHeight: 80,
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
            <span style={{ fontWeight: 600, fontSize: 14, color: "var(--color-bg-brand-strong)", lineHeight: 1.5 }}>Nenhum membro ainda</span>
          </div>
        ) : (
          memberSpending.map((member, i) => {
            const bgColors = [
              "var(--color-bg-brand-accent)",
              "var(--color-bg-brand-muted)",
              "var(--color-bg-default)",
            ];
            const labelColors = [
              "var(--color-bg-brand-strong)",
              "var(--color-fg-default)",
              "var(--color-bg-brand-strong)",
            ];
            const valueColors = [
              "var(--color-fg-default)",
              "var(--color-fg-default)",
              "var(--color-bg-brand-strong)",
            ];
            const borderColor = i === 2 ? "var(--color-border-default)" : "var(--color-border-muted)";
            return (
              <div
                key={member.userId}
                style={{
                  flex: 1,
                  minHeight: 100,
                  background: bgColors[i % bgColors.length],
                  border: `var(--border-sm) solid ${borderColor}`,
                  borderRadius: "var(--radius-3xl)",
                  padding: "var(--space-24)",
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "flex-end",
                  gap: "var(--space-4)",
                }}
              >
                <span style={{ fontWeight: 600, fontSize: 14, color: labelColors[i % labelColors.length], lineHeight: 1.5 }}>{member.name}</span>
                <span style={{ fontWeight: 700, fontSize: 48, lineHeight: 1.1, letterSpacing: "-1px", color: valueColors[i % valueColors.length] }}>
                  {formatBRL(member.spent)}
                </span>
                <span style={{ fontWeight: 600, fontSize: 14, color: valueColors[i % valueColors.length], lineHeight: 1.5 }}>
                  {formatBRL(member.dailyBudget)}/dia
                </span>
              </div>
            );
          })
        )}
      </div>
    ),
    gastos_periodo: (
      <div
        style={{
          height: "100%",
          minHeight: 0,
          flex: 1,
          display: "flex",
          flexDirection: "column",
          background: "var(--color-bg-default)",
          border: "var(--border-sm) solid var(--color-border-muted)",
          borderRadius: "var(--radius-4xl)",
          padding: "var(--space-16)",
          gap: "var(--space-8)",
          overflow: "auto",
          boxSizing: "border-box",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 16px", flexWrap: "wrap", gap: 8 }}>
          <span style={{ fontWeight: 400, fontSize: 16, color: "var(--color-fg-default)", lineHeight: 1.5 }}>
            Gastos por fatura no período
          </span>
          <a
            href="/transactions"
            style={{
              fontWeight: 300,
              fontSize: 12,
              letterSpacing: "0.2px",
              color: "var(--color-fg-default)",
              padding: "8px 16px",
              borderRadius: "var(--radius-2xl)",
              cursor: "pointer",
              lineHeight: 1.5,
              textDecoration: "none",
            }}
          >
            Ver tudo
          </a>
        </div>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "2fr 1.1fr 1fr 0.85fr 0.75fr 0.85fr 0.85fr",
            alignItems: "center",
            gap: "var(--space-8)",
            padding: "16px 24px",
            background: "var(--color-bg-subtle)",
            borderRadius: "var(--radius-3xl)",
            width: "100%",
          }}
        >
          <span style={{ fontWeight: 600, fontSize: 14, color: "var(--color-fg-default)", lineHeight: 1.5 }}>Nome do Gasto</span>
          <span style={{ fontWeight: 300, fontSize: 14, color: "var(--color-fg-default)", textAlign: "center", lineHeight: 1.5 }}>Categoria</span>
          <span style={{ fontWeight: 300, fontSize: 14, color: "var(--color-fg-default)", textAlign: "center", lineHeight: 1.5 }}>Pagamento</span>
          <span style={{ fontWeight: 300, fontSize: 14, color: "var(--color-fg-default)", textAlign: "center", lineHeight: 1.5 }}>Responsável</span>
          <span style={{ fontWeight: 300, fontSize: 14, color: "var(--color-fg-default)", textAlign: "center", lineHeight: 1.5 }}>Fatura</span>
          <span style={{ fontWeight: 300, fontSize: 12, color: "var(--color-fg-muted)", textAlign: "center", lineHeight: 1.45 }}>Data (doc.)</span>
          <span style={{ fontWeight: 300, fontSize: 14, color: "var(--color-fg-default)", textAlign: "center", lineHeight: 1.5 }}>Valor</span>
        </div>
        {expenses.length === 0 ? (
          <div
            style={{
              padding: "32px 24px",
              textAlign: "center",
              color: "var(--color-fg-subtle)",
              fontSize: 14,
              fontWeight: 400,
              border: "var(--border-sm) solid var(--color-border-muted)",
              borderRadius: "var(--radius-3xl)",
            }}
          >
            Nenhum gasto registrado ainda
          </div>
        ) : (
          <div style={{ background: "var(--color-bg-default)", border: "var(--border-sm) solid var(--color-border-muted)", borderRadius: "var(--radius-3xl)" }}>
            {expenses.map((expense, i) => (
              <div
                key={expense.id}
                style={{
                  display: "grid",
                  gridTemplateColumns: "2fr 1.1fr 1fr 0.85fr 0.75fr 0.85fr 0.85fr",
                  alignItems: "center",
                  gap: "var(--space-8)",
                  padding: "16px 24px",
                  borderBottom: i < expenses.length - 1 ? "var(--border-sm) solid var(--color-border-muted)" : "none",
                  width: "100%",
                }}
              >
                <span style={{ fontWeight: 600, fontSize: 14, color: "var(--color-fg-default)", lineHeight: 1.5 }}>{expense.name}</span>
                <span style={{ display: "flex", justifyContent: "center" }}>
                  {expense.category ? (
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
                      {expense.category.name}
                    </span>
                  ) : (
                    <span style={{ fontSize: 12, color: "var(--color-fg-subtle)" }}>—</span>
                  )}
                </span>
                <span
                  style={{
                    fontWeight: 400,
                    fontSize: 12,
                    color: "var(--color-fg-default)",
                    textAlign: "center",
                    lineHeight: 1.5,
                  }}
                >
                  {expense.card ? expense.card.name : "—"}
                </span>
                <span style={{ fontWeight: 400, fontSize: 12, color: "var(--color-fg-default)", textAlign: "center", lineHeight: 1.5 }}>
                  {expense.responsible.name.split(" ")[0]}
                </span>
                <span style={{ fontWeight: 600, fontSize: 12, color: "var(--color-fg-default)", textAlign: "center", lineHeight: 1.5 }}>
                  {formatBillingYmShort(expense.billingYm)}
                </span>
                <span style={{ fontWeight: 400, fontSize: 11, color: "var(--color-fg-muted)", textAlign: "center", lineHeight: 1.5 }}>
                  {formatDateBrazil(expense.date)}
                </span>
                <span style={{ fontWeight: 600, fontSize: 12, color: "var(--color-fg-brand)", textAlign: "center", lineHeight: 1.5 }}>
                  {formatBRL(expense.amount)}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    ),
    divisao_orcamento: (
      <div
        style={{
          height: "100%",
          minHeight: 0,
          flex: 1,
          display: "flex",
          flexDirection: "column",
          background: "#FFFFFF",
          border: "1px solid #F5F5F5",
          borderRadius: 32,
          padding: "24px 24px 32px",
          alignItems: "center",
          gap: 24,
          overflow: "auto",
          boxSizing: "border-box",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%" }}>
          <span style={{ fontWeight: 400, fontSize: 16, color: "#0A0A0A", lineHeight: 1.5 }}>Divisão do Orçamento</span>
          <AvatarStack members={memberSpending.map((m) => ({ name: m.name, avatar: m.avatar }))} />
        </div>
        <DonutChart
          segments={donutSegments}
          size={200}
          strokeWidth={32}
          centerLabel={formatBRL(totalSpent)}
          centerSublabel={`De ${formatBRL(totalBudget)}`}
        />
        <div style={{ display: "flex", flexDirection: "column", gap: 8, width: "100%", padding: "0 16px" }}>
          {[
            { bg: "#FAFAFA", labelColor: "#0A0A0A", label: "Orçamento livre", value: freeBudget },
            { bg: "#0C7341", labelColor: "#FFFFFF", label: "Parcelado", value: typeStats.parcelada },
            { bg: "#99E83A", labelColor: "#0A0A0A", label: "Avulsa", value: typeStats.avulsa },
            { bg: "#D6F5E3", labelColor: "#0F8F4E", label: "Fixo", value: typeStats.fixa },
          ].map((item, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <span
                style={{
                  background: item.bg,
                  color: item.labelColor,
                  fontSize: 12,
                  fontWeight: 600,
                  lineHeight: 1.5,
                  letterSpacing: "0.2px",
                  padding: "4px 8px",
                  borderRadius: 8,
                  whiteSpace: "nowrap",
                }}
              >
                {item.label}
              </span>
              <span style={{ fontSize: 14, fontWeight: 400, color: "#0A0A0A", lineHeight: 1.5, whiteSpace: "nowrap" }}>{formatBRL(item.value)}</span>
            </div>
          ))}
        </div>
      </div>
    ),
    gasto_pagamento: (
      <div
        style={{
          height: "100%",
          minHeight: 0,
          flex: 1,
          display: "flex",
          flexDirection: "column",
          background: "var(--color-bg-default)",
          border: "var(--border-sm) solid var(--color-border-muted)",
          borderRadius: "var(--radius-4xl)",
          padding: "var(--space-16)",
          gap: "var(--space-12)",
          overflow: "auto",
          boxSizing: "border-box",
        }}
      >
        <div style={{ padding: "4px 0" }}>
          <span style={{ fontWeight: 400, fontSize: 16, color: "var(--color-fg-default)", lineHeight: 1.5 }}>Gasto por pagamento</span>
        </div>
        <CardSpendingChart rows={spendByPayment} />
      </div>
    ),
    limite_categoria: (
      <div
        style={{
          height: "100%",
          minHeight: 0,
          flex: 1,
          display: "flex",
          flexDirection: "column",
          background: "var(--color-bg-default)",
          border: "var(--border-sm) solid var(--color-border-muted)",
          borderRadius: "var(--radius-4xl)",
          padding: "var(--space-16)",
          gap: "var(--space-8)",
          overflow: "auto",
          boxSizing: "border-box",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 0" }}>
          <span style={{ fontWeight: 400, fontSize: 16, color: "var(--color-fg-default)", lineHeight: 1.5 }}>Limite por Categoria</span>
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
        {categories.length === 0 ? (
          <p style={{ fontSize: 12, color: "var(--color-fg-subtle)", padding: "8px", fontWeight: 300 }}>Nenhuma categoria cadastrada</p>
        ) : (
          categories.map((cat) => (
            <div key={cat.id} style={{ display: "flex", flexDirection: "column", gap: "var(--space-8)", padding: "0 8px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontWeight: 300, fontSize: 12, letterSpacing: "0.2px", color: "var(--color-fg-default)", lineHeight: 1.5 }}>
                  {cat.name}
                </span>
                <span style={{ fontWeight: 300, fontSize: 12, letterSpacing: "0.2px", color: "var(--color-fg-default)", lineHeight: 1.5 }}>
                  {formatBRL(cat.spent)}
                </span>
              </div>
              <div style={{ background: "var(--color-bg-subtle)", height: 8, borderRadius: "var(--radius-lg)", overflow: "hidden" }}>
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
          ))
        )}
      </div>
    ),
  };

  return (
    <>
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "var(--space-12)",
          padding: "0 var(--space-16) var(--space-16)",
          borderRadius: "var(--radius-3xl)",
        }}
      >
        <div
          style={{
            display: "flex",
            flexDirection: "row",
            alignItems: "flex-start",
            justifyContent: "space-between",
            gap: "var(--space-16)",
            flexWrap: "wrap",
            width: "100%",
            rowGap: 12,
          }}
        >
          <h1
            style={{
              flex: "1 1 200px",
              minWidth: 0,
              fontWeight: 400,
              fontSize: 32,
              lineHeight: 1.2,
              letterSpacing: "-0.6px",
              color: "#000000",
              margin: 0,
            }}
          >
            Olá {user.name.split(" ")[0]}
          </h1>
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              alignItems: "flex-start",
              justifyContent: "flex-end",
              gap: 12,
              rowGap: 12,
              flexShrink: 0,
            }}
          >
            <Suspense fallback={<div style={{ height: 44, minWidth: 220, background: "#F5F5F5", borderRadius: 16 }} />}>
              <DashboardPeriodPicker from={period.from} to={period.to} />
            </Suspense>
            <div style={{ flexShrink: 0 }}>
              <ExpenseButtonPanel
                categories={categories.map((c) => ({ id: c.id, name: c.name }))}
                cards={cards.map((c) => ({
                  id: c.id,
                  name: c.name,
                  statementClosingDay: c.statementClosingDay ?? null,
                }))}
                members={panelMembers}
              />
            </div>
          </div>
        </div>
      </div>

      <div
        className="dashboard-widgets-grid"
        style={{
          padding: "0 var(--space-16) var(--space-24)",
        }}
      >
        {DASHBOARD_GRID_DEFAULT_LAYOUT.map((item) => {
          const { id, x, y, w, h } = item;
          return (
            <div
              key={id}
              className="dashboard-widget-slot"
              style={{
                gridColumn: `${x + 1} / ${x + w + 1}`,
                gridRow: `${y + 1} / ${y + h + 1}`,
                minHeight: 0,
                display: "flex",
                flexDirection: "column",
              }}
            >
              <div style={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column" }}>{widgets[id]}</div>
            </div>
          );
        })}
        <div
          className="dashboard-widget-slot dashboard-bottom-row"
          style={{
            gridColumn: `${DASHBOARD_BOTTOM_ROW.x + 1} / ${DASHBOARD_BOTTOM_ROW.x + DASHBOARD_BOTTOM_ROW.w + 1}`,
            gridRow: `${DASHBOARD_BOTTOM_ROW.y + 1} / ${DASHBOARD_BOTTOM_ROW.y + DASHBOARD_BOTTOM_ROW.h + 1}`,
            display: "flex",
            flexDirection: "row",
            alignItems: "stretch",
            gap: "var(--space-16)",
            minHeight: 0,
            minWidth: 0,
          }}
        >
          {DASHBOARD_BOTTOM_ROW.ids.map((id) => (
            <div
              key={id}
              style={{
                flex: "1 1 0",
                minWidth: 0,
                minHeight: 0,
                display: "flex",
                flexDirection: "column",
              }}
            >
              <div style={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column" }}>{widgets[id]}</div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
